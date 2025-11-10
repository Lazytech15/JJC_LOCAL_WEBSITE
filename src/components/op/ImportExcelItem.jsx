import { useState, useRef } from "react"
import { Upload, Sheet, CheckCircle, XCircle, AlertCircle, Download, X, Layers } from "lucide-react"
import * as XLSX from "xlsx"

function ExcelImportModal({ isDarkMode, apiService, isOpen, onClose, onImportComplete }) {
  const [importing, setImporting] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [importResults, setImportResults] = useState(null)
  const [availableSheets, setAvailableSheets] = useState([])
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [workbookData, setWorkbookData] = useState(null)
  const fileInputRef = useRef(null)

  // Default client name for imported items
  const [defaultClient, setDefaultClient] = useState("Imported Client")

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })

      // Store workbook for later use
      setWorkbookData(workbook)

      // Get all sheet names
      const sheets = workbook.SheetNames.map((name, index) => ({
        name,
        index
      }))

      setAvailableSheets(sheets)

      // Auto-select first sheet
      if (sheets.length > 0) {
        setSelectedSheet(sheets[0].name)
        parseSheetData(workbook, sheets[0].name)
      }
    } catch (error) {
      console.error("Error reading file:", error)
      alert("Error reading Excel file: " + error.message)
    }

    // Reset file input
    event.target.value = ""
  }

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName)
    if (workbookData) {
      parseSheetData(workbookData, sheetName)
    }
  }

  const parseSheetData = (workbook, sheetName) => {
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    // Parse the data
    parseExcelData(jsonData)
  }

  const parseExcelData = (rows) => {
    const items = []
    let inFabricatedSection = false
    let dataStartRow = -1

    // Find sections and parse data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = row[0]?.toString().trim() || ""
      const secondCell = row[1]?.toString().trim() || ""

      // Check if this is the "Fabricated Parts" section header (can be in column A or B)
      const checkCell = firstCell.toLowerCase() + " " + secondCell.toLowerCase()
      if (checkCell.includes("fabricated") && checkCell.includes("parts")) {
        inFabricatedSection = true
        dataStartRow = i + 1 // Next row should be data
        continue
      }

      // Check if we've reached another section (end of Fabricated Parts)
      if (inFabricatedSection && (firstCell.toLowerCase().includes("parts") || secondCell.toLowerCase().includes("parts")) &&
        !checkCell.includes("fabricated")) {
        inFabricatedSection = false
        continue
      }

      // Parse data rows when in Fabricated Parts section
      if (inFabricatedSection && i >= dataStartRow) {
        // Skip empty rows
        if (!firstCell && !secondCell) continue

        // Parse the row
        const itemNumber = firstCell
        const partNumber = secondCell
        const description = row[2]?.toString().trim() || ""
        const quantityStr = row[3]?.toString().trim() || "1"

        // Try to parse quantity (handle various formats)
        let quantity = 1
        if (quantityStr) {
          const parsed = parseInt(quantityStr.replace(/[^0-9]/g, ''))
          if (!isNaN(parsed) && parsed > 0) {
            quantity = parsed
          }
        }

        // Only add if we have a part number
        if (partNumber && partNumber.length > 0) {
          items.push({
            itemNumber: itemNumber || "",
            partNumber: partNumber,
            description: description,
            quantity: quantity,
            section: "Fabricated Parts"
          })
        }
      }
    }

    setParseResult({
      totalItems: items.length,
      items: items,
      preview: items // Show all items
    })
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.items.length === 0) {
      alert("No items to import")
      return
    }

    setImporting(true)
    const results = {
      successful: [],
      failed: []
    }

    try {
      for (const item of parseResult.items) {
        try {
          // Generate batch number
          const timestamp = Date.now()
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
          const batchNumber = `BATCH-${timestamp}-${randomSuffix}`

          // Generate unique part number with batch
          const uniquePartNumber = `${item.partNumber}-${batchNumber}`

          // Create item data with auto-generated Phase 1
          const itemData = {
            part_number: uniquePartNumber,
            name: item.description || item.partNumber,
            client_name: defaultClient,
            priority: "Medium",
            qty: item.quantity,
            total_qty: item.quantity, // Initially set to batch quantity
            phases: [
              {
                name: "Phase 1",
                subphases: [
                  {
                    name: "Main Task",
                    expected_duration: 0,
                    expected_quantity: item.quantity
                  }
                ]
              }
            ]
          }

          await apiService.operations.createItemWithStructure(itemData)

          results.successful.push({
            partNumber: item.partNumber,
            uniquePartNumber: uniquePartNumber,
            description: item.description,
            quantity: item.quantity
          })
        } catch (error) {
          results.failed.push({
            partNumber: item.partNumber,
            description: item.description,
            error: error.message
          })
        }
      }
    } catch (error) {
      console.error("Import error:", error)
    } finally {
      setImporting(false)
      setImportResults(results)
    }
  }

  const handleReset = () => {
    setParseResult(null)
    setImportResults(null)
    setAvailableSheets([])
    setSelectedSheet(null)
    setWorkbookData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleComplete = () => {
    handleReset()
    onClose()
    if (onImportComplete) {
      onImportComplete()
    }
  }

  const downloadTemplate = () => {
    // Create sample template
    const templateData = [
      ["DISCHARGE HEAD & VERTICAL WORM SHAFT ASSEMBLY"],
      ["Item", "Part Number", "Description", "Qty/set"],
      ["", "Fabricated Parts", "", ""],
      ["1", "138162", "Pressing Worm, S-1/4' LH", "3"],
      ["2", "138162", "Pressing Worm, S-1/4' LH", "3"],
      ["3", "138162", "Clamping Cap Complete", "6"],
      ["4", "218125", "Shaft Cap Screw, 1-1/4' LH (HF)", "3"],
      ["5", "38122", "Key Stock, 1/2' x 1/2' x 14-1/2'", "3"]
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, "operations_import_template.xlsx")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? "bg-gray-900" : "bg-white"
          }`}
      >
        {/* Header */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            }`}
        >
          <div className="flex items-center gap-3">
            <Sheet size={24} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
            <h2 className={`text-2xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Import from Excel
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${isDarkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-100"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
            >
              <Download size={16} />
              Template
            </button>
            <button
              onClick={() => {
                handleReset()
                onClose()
              }}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div
            className={`rounded-lg p-4 border ${isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
              }`}
          >
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? "text-blue-300" : "text-blue-700"
              }`}>
              <AlertCircle size={18} />
              Instructions
            </h3>
            <ul className={`text-sm space-y-1 list-disc list-inside ${isDarkMode ? "text-blue-200" : "text-blue-600"
              }`}>
              <li>Upload an Excel file with "Fabricated Parts" section</li>
              <li>Required columns: Item, Part Number, Description, Qty/set</li>
              <li>If your file has multiple sheets, select the sheet to import</li>
              <li>Each item will be created with auto-generated batch number</li>
              <li>A default "Phase 1" with "Main Task" subphase will be added</li>
              <li>You can edit items after import to add more phases/subphases</li>
            </ul>
          </div>

          {/* Default Client Input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
              Default Client Name (for imported items)
            </label>
            <input
              type="text"
              value={defaultClient}
              onChange={(e) => setDefaultClient(e.target.value)}
              placeholder="Enter client name"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                  ? "bg-gray-800 border border-gray-700 text-gray-100"
                  : "bg-white border border-gray-300 text-gray-800"
                }`}
            />
          </div>

          {/* File Upload */}
          {!parseResult && !importResults && (
            <div
              className={`rounded-lg p-8 border-2 border-dashed transition-all ${isDarkMode
                  ? "bg-gray-800/60 border-gray-600 hover:border-blue-500"
                  : "bg-gray-50 border-gray-300 hover:border-blue-400"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload size={48} className={isDarkMode ? "text-gray-400 mb-4" : "text-gray-500 mb-4"} />
                <p className={`text-lg font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  Click to upload Excel file
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Supports .xlsx and .xls files
                </p>
              </label>
            </div>
          )}

          {/* Sheet Selection */}
          {availableSheets.length > 1 && !importResults && (
            <div
              className={`rounded-lg p-4 border ${isDarkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
                }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Layers size={18} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Select Sheet ({availableSheets.length} sheets found)
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableSheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    onClick={() => handleSheetChange(sheet.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedSheet === sheet.name
                        ? isDarkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-600 text-white"
                        : isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                          : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                      }`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parse Preview */}
          {parseResult && !importResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  Preview ({parseResult.totalItems} items found)
                </h3>
                {availableSheets.length > 1 && (
                  <span className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                    }`}>
                    Sheet: {selectedSheet}
                  </span>
                )}
              </div>

              {parseResult.totalItems === 0 ? (
                <div
                  className={`rounded-lg p-6 border text-center ${isDarkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
                    }`}
                >
                  <AlertCircle size={32} className={`mx-auto mb-3 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"
                    }`} />
                  <p className={`font-medium mb-2 ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
                    No Fabricated Parts found in this sheet
                  </p>
                  <p className={`text-sm ${isDarkMode ? "text-yellow-200" : "text-yellow-600"}`}>
                    Make sure your sheet contains a "Fabricated Parts" section with the correct format.
                  </p>
                  {availableSheets.length > 1 && (
                    <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Try selecting a different sheet above.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0">
                        <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                          <th className={`px-4 py-2 text-left text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                            #
                          </th>
                          <th className={`px-4 py-2 text-left text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                            Part Number
                          </th>
                          <th className={`px-4 py-2 text-left text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                            Description
                          </th>
                          <th className={`px-4 py-2 text-left text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.preview.map((item, index) => (
                          <tr
                            key={index}
                            className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"
                              }`}
                          >
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                              {item.itemNumber}
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${isDarkMode ? "text-blue-400" : "text-blue-600"
                              }`}>
                              {item.partNumber}
                            </td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                              {item.description}
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold ${isDarkMode ? "text-green-400" : "text-green-600"
                              }`}>
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || parseResult.totalItems === 0}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Import {parseResult.totalItems} Items
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              {/* Success Summary */}
              {importResults.successful.length > 0 && (
                <div
                  className={`rounded-lg p-6 border ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                    }`}
                >
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-green-300" : "text-green-700"
                    }`}>
                    <CheckCircle size={24} />
                    Successfully Imported ({importResults.successful.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResults.successful.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded ${isDarkMode ? "bg-gray-800/50" : "bg-white/50"
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-mono text-sm ${isDarkMode ? "text-blue-400" : "text-blue-600"
                              }`}>
                              {item.uniquePartNumber}
                            </p>
                            <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                              {item.description}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold ${isDarkMode ? "text-green-400" : "text-green-600"
                            }`}>
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Items */}
              {importResults.failed.length > 0 && (
                <div
                  className={`rounded-lg p-6 border ${isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                    }`}
                >
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-red-300" : "text-red-700"
                    }`}>
                    <XCircle size={24} />
                    Failed to Import ({importResults.failed.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResults.failed.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded ${isDarkMode ? "bg-gray-800/50" : "bg-white/50"
                          }`}
                      >
                        <p className={`font-mono text-sm ${isDarkMode ? "text-red-400" : "text-red-600"
                          }`}>
                          {item.partNumber} - {item.description}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Error: {item.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleComplete}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExcelImportModal