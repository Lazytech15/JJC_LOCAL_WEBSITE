import { useState, useEffect, lazy, Suspense } from "react"
import { useAuth } from "../../../contexts/AuthContext"
import apiService from "../../../utils/api/api-service"
import ModalPortal from "../shared/ModalPortal"
import QRCodeSmall from "../barcode/QRCodeSmall"
import { ItemDetailView } from "./ItemDetailView"
import InventoryListView from "./InventoryListView"
import { useToast } from "../shared/ToastNotification"
import ConfirmationModal from "../shared/ConfirmationModal"

// Lazy load the heavy wizard component
const AddEditItemWizard = lazy(() => import('./AddEditItemWizard'))

function InventoryManagement() {
  const { isDarkMode } = useAuth()
  const { success, error: showError, warning } = useToast()
  // Inventory Management States
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showStockInsert, setShowStockInsert] = useState(false)
  const [stockInsertData, setStockInsertData] = useState({ quantity: 0, reason: "" })
  const [showStockManager, setShowStockManager] = useState(false)
  const [stockManagerData, setStockManagerData] = useState({
    stock_in: 0,
    stock_out: 0,
    reason: "",
    current_balance: 0
  })
  const [statistics, setStatistics] = useState({})
  const [filters, setFilters] = useState({
    search: "",
    item_status: "",
    location: "",
  })
  const [sortBy, setSortBy] = useState("")
  const [sortedItems, setSortedItems] = useState([])
  const [uniqueLocations, setUniqueLocations] = useState([])
  const [showItemDetail, setShowItemDetail] = useState(false)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null)
  const [returnToDetailView, setReturnToDetailView] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "warning"
  })

  // Client-side pagination state for grid view (20 per batch)
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    fetchItems()
    setVisibleCount(20)
  }, [filters])

  const fetchItems = async () => {
    try {
      setLoading(true)

      // Filter out empty values before creating query params
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value
        }
        return acc
      }, {})

      // Use ItemsService instead of direct fetch
      const result = await apiService.items.getItems({ ...cleanFilters, limit: 1000 })
      const fetched = result.data || []
      setItems(fetched)
      // Prefer server-declared total if present (covers soft-deletes or server filters)
      const serverTotal =
        (result.statistics && (result.statistics.total_items ?? result.statistics.total)) ??
        result.total ?? result.count ?? (Array.isArray(result.data) ? result.data.length : 0)
      setStatistics((prev) => ({ ...prev, server_total_items: serverTotal }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Recompute statistics whenever items change
  useEffect(() => {
    // Derive reliable statistics locally to avoid backend mismatches
    const statusFromText = (text) => {
      if (!text) return null
      const t = String(text).toLowerCase().trim()
      if (t.includes("out")) return "Out Of Stock"
      if (t.includes("low")) return "Low In Stock"
      if (t.includes("in")) return "In Stock"
      return null
    }
    const deriveStatus = (item) => {
      const bal = Number(item.balance) || 0
      const min = Number(item.min_stock) || 0
      if (bal === 0) return "Out Of Stock"
      if (min > 0 && bal < min) return "Low In Stock"
      return "In Stock"
    }

    const total_items = items.length
    const statuses = items.map((i) => statusFromText(i.item_status) || deriveStatus(i))
    const in_stock = statuses.filter((s) => s === "In Stock").length
    const low_stock = statuses.filter((s) => s === "Low In Stock").length
    const out_of_stock = statuses.filter((s) => s === "Out Of Stock").length

    setStatistics((prev) => ({
      ...prev,
      total_items,
      in_stock,
      low_stock,
      out_of_stock,
    }))
  }, [items])

  // Extract unique locations from items data and group them
  useEffect(() => {
    const locations = [...new Set(items
      .map(item => item.location)
      .filter(location => location && location.trim() !== "")
    )].sort()
    
    // Group locations by first part (e.g., Z1, Z2, OFFC, etc.)
    const groupedLocations = locations.reduce((groups, location) => {
      // Extract the prefix (everything before the first dash or the whole string if no dash)
      const prefix = location.includes('-') ? location.split('-')[0] : location
      if (!groups[prefix]) {
        groups[prefix] = []
      }
      groups[prefix].push(location)
      return groups
    }, {})
    
    setUniqueLocations(groupedLocations)
  }, [items])

  // Sort and filter items whenever items or sorting criteria change
  useEffect(() => {
    let filtered = [...items]

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "name-asc":
            return (a.item_name || "").localeCompare(b.item_name || "")
          case "name-desc":
            return (b.item_name || "").localeCompare(a.item_name || "")
          case "stock-high":
            return (Number(b.balance) || 0) - (Number(a.balance) || 0)
          case "stock-low":
            return (Number(a.balance) || 0) - (Number(b.balance) || 0)
          case "id-asc":
            return (Number(a.item_no) || 0) - (Number(b.item_no) || 0)
          case "id-desc":
            return (Number(b.item_no) || 0) - (Number(a.item_no) || 0)
          default:
            return 0
        }
      })
    }

    setSortedItems(filtered)
  }, [items, sortBy])

  const handleSaveItem = async (itemData) => {
    try {
      if (selectedItem) {
        await apiService.items.updateItem(selectedItem.item_no, itemData)
      } else {
        await apiService.items.createItem(itemData)
      }

      await fetchItems()
      setShowForm(false)
      setSelectedItem(null)
      resetFormData()
      
      if (returnToDetailView) {
        // Find the updated item to show in detail view
        const updatedItems = await apiService.items.getItems({ limit: 1000 })
        const updatedItem = updatedItems.data?.find(item => item.item_no === selectedItem.item_no)
        if (updatedItem) {
          setShowItemDetail(true)
          setSelectedItemForDetail(updatedItem)
        }
        setReturnToDetailView(false)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteItem = async (itemNo) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Item",
      message: `Are you sure you want to permanently delete this item? This action cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        try {
          await apiService.items.deleteItem(itemNo)
          await fetchItems()
          success("Item Deleted!", "The item has been permanently removed from inventory.")
        } catch (err) {
          setError(err.message)
          showError("Delete Failed", err.message)
        }
      }
    })
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setShowForm(true)
  }

  const resetFormData = () => {
    setSelectedImage(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Out Of Stock":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "Low In Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "In Stock":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleStockInsert = async () => {
    if (!selectedItem || stockInsertData.quantity <= 0) return

    try {
      const result = await apiService.items.insertStock(selectedItem.item_no, stockInsertData)

      setItems(items.map((item) => (item.item_no === selectedItem.item_no ? result.data : item)))
      setShowStockInsert(false)
      setSelectedItem(null)
      setStockInsertData({ quantity: 0, reason: "" })
      success("Success!", `Stock inserted successfully! Added ${stockInsertData.quantity} units.`)
    } catch (error) {
      console.error("Error inserting stock:", error)
      showError("Error!", error.message)
    }
  }

  const handleStockManagement = (item) => {
    setSelectedItem(item)
    setStockManagerData({
      stock_in: 0,
      stock_out: 0,
      reason: "",
      current_balance: item.balance || 0
    })
    setShowStockManager(true)
  }

  const handleStockManagerSave = async () => {
    if (!selectedItem || (!stockManagerData.stock_in && !stockManagerData.stock_out)) return

    try {
      let result = null

      // Handle stock in (addition)
      if (stockManagerData.stock_in > 0) {
        await apiService.items.insertStock(selectedItem.item_no, {
          quantity: stockManagerData.stock_in,
          reason: stockManagerData.reason || "Stock added via inventory management"
        })
      }

      // Handle stock out (removal)
      if (stockManagerData.stock_out > 0) {
        await apiService.items.recordItemOut(selectedItem.item_no, {
          quantity: stockManagerData.stock_out,
          notes: stockManagerData.reason || "Stock removed via inventory management",
          out_by: "Inventory Manager"
        })
      }

      // Refresh the items list
      await fetchItems()

      setShowStockManager(false)
      setSelectedItem(null)
      setStockManagerData({ stock_in: 0, stock_out: 0, reason: "", current_balance: 0 })

      const changeText = []
      if (stockManagerData.stock_in > 0) changeText.push(`+${stockManagerData.stock_in}`)
      if (stockManagerData.stock_out > 0) changeText.push(`-${stockManagerData.stock_out}`)

      success("Success!", `Stock updated successfully! Changes: ${changeText.join(', ')} units`)
    } catch (error) {
      console.error("Error updating stock:", error)
      showError("Error!", error.message)
    }
  }

  const exportBarcodesToExcel = async () => {
    if (items.length === 0) {
      warning("No Items", "No items available to export barcodes.")
      return
    }

    try {
      let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CODE-128 ITM Format Barcodes</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .barcode-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .barcode-item {
            border: 2px dashed #000;
            padding: 20px;
            text-align: center;
            break-inside: avoid;
            background: white;
            margin-bottom: 10px;
          }
          .barcode-svg {
            margin: 15px 0;
            background: white;
          }
          .item-name {
            font-size: 16px;
            font-weight: bold;
            margin: 8px 0;
            word-wrap: break-word;
          }
          .item-details {
            font-size: 12px;
            color: #333;
            margin: 4px 0;
          }
          .item-id {
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0;
            background: #f0f0f0;
            padding: 4px 8px;
            border-radius: 4px;
          }
          .instructions {
            background: #fffacd;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          @media print {
            .no-print { display: none; }
            .barcode-item { 
              page-break-inside: avoid; 
              margin-bottom: 5px;
            }
            body { background: white !important; }
          }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="header no-print">
          <h1>CODE-128 ITM Format Barcodes</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total Items: ${items.length}</p>
          <p><strong>Format:</strong> ITM001, ITM002, ITM003...</p>
          
          <div class="instructions">
            <h3>CODE-128 Scanner Setup Instructions:</h3>
            <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
              <li><strong>Check Scanner Settings:</strong> Make sure CODE-128 is enabled on your scanner</li>
              <li><strong>Barcode Format:</strong> These barcodes use ITM prefix format (ITM001, ITM002, etc.)</li>
              <li><strong>Print Quality:</strong> Use high quality print settings (600 DPI minimum)</li>
              <li><strong>Paper:</strong> Use white paper with good contrast</li>
              <li><strong>Size:</strong> Don't resize - print at 100%</li>
              <li><strong>Lighting:</strong> Ensure good lighting when scanning</li>
              <li><strong>Distance:</strong> Hold scanner 4-8 inches from barcode</li>
            </ol>
          </div>
          
          <button onclick="window.print()" style="padding: 15px 30px; font-size: 18px; margin: 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Barcodes</button>
        </div>
        
        <div class="barcode-grid">
    `

      items.forEach((item, index) => {
        // Generate ITM format barcode ID (ITM + padded item_no)
        const paddedNo = item.item_no.toString().padStart(3, '0')
        const barcodeId = `ITM${paddedNo}`

        htmlContent += `
        <div class="barcode-item">
          <svg id="barcode-${index}" class="barcode-svg"></svg>
          <div class="item-id">ID: ${barcodeId}</div>
          <div class="item-name">${item.item_name}</div>
          <div class="item-details"><strong>Brand:</strong> ${item.brand || 'No Brand'}</div>
          <div class="item-details"><strong>Location:</strong> ${item.location || 'No Location'}</div>
          <div class="item-details"><strong>Balance:</strong> ${item.balance || 0}</div>
        </div>
      `
      })

      htmlContent += `
        </div>
        <script>
          window.onload = function() {
            // Wait for JsBarcode to load
            setTimeout(function() {
    `

      items.forEach((item, index) => {
        // Generate ITM format barcode ID (ITM + padded item_no)
        const paddedNo = item.item_no.toString().padStart(3, '0')
        const barcodeId = `ITM${paddedNo}`

        htmlContent += `
              try {
                JsBarcode("#barcode-${index}", "${barcodeId}", {
                  format: "CODE128",
                  width: 3,
                  height: 80,
                  displayValue: true,
                  fontSize: 16,
                  margin: 10,
                  background: "#ffffff",
                  lineColor: "#000000",
                  textAlign: "center",
                  textPosition: "bottom",
                  textMargin: 8
                });
              } catch(e) {
                console.error("Error generating barcode for ${barcodeId}:", e);
                document.getElementById("barcode-${index}").innerHTML = 
                  '<div style="border:2px solid red; padding:20px; color:red;">Error generating barcode for ${barcodeId}</div>';
              }
      `
      })

      htmlContent += `
            }, 500);
          };
        </script>
      </body>
      </html>
    `

      // Create and download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GOOJPRT_Compatible_Barcodes_${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      success("GOOJPRT Compatible Barcodes Created!", "File downloaded successfully! Check the troubleshooting guide if needed.")

    } catch (error) {
      console.error("Error creating barcodes:", error)
      showError("Export Error!", "Failed to create barcode file. Please try again.")
    }
  }

  return (
    <div className="space-y-3">
      {/* Enhanced Header Section - Compact */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-600 dark:border-slate-700">
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 2v3h4V6H4m6 0v3h10V6H10M4 11v3h4v-3H4m6 0v3h10v-3H10M4 16v2h4v-2H4m6 0v2h10v-2H10z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Inventory Management</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Metal works, parts & supplies tracking
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={exportBarcodesToExcel}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-700 dark:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg text-xs sm:text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Barcodes</span>
          </button>
          <button
            onClick={() => {
              setSelectedItem(null)
              setShowForm(true)
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 dark:from-amber-600 dark:to-amber-700 dark:hover:from-amber-500 dark:hover:to-amber-600 text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg text-xs sm:text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Error State - Compact */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-3 shadow-md">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-400 font-medium text-sm">Error: {error}</p>
              <button onClick={() => setError(null)} className="mt-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs underline">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Statistics Cards - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg p-3 shadow-md border border-slate-300 dark:border-slate-700 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-700">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                Total Items
              </h3>
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{statistics.server_total_items ?? statistics.total_items ?? 0}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">In system</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-lg p-3 shadow-md border border-green-300 dark:border-green-800 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-green-700">
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-green-700 dark:text-green-300 text-xs uppercase tracking-wide">
                In Stock
              </h3>
              <div className="w-7 h-7 bg-green-200 dark:bg-green-800/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">
              {statistics.in_stock || 0}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400/80 mt-0.5">Available items</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-800/20 rounded-lg p-3 shadow-md border border-amber-300 dark:border-amber-800 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-700">
              <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-amber-700 dark:text-amber-300 text-xs uppercase tracking-wide">
                Low Stock
              </h3>
              <div className="w-7 h-7 bg-amber-200 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400">{statistics.low_stock || 0}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">Needs restocking</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-3 shadow-md border border-red-300 dark:border-red-800 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-red-700">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-red-700 dark:text-red-300 text-xs uppercase tracking-wide">
                Out of Stock
              </h3>
              <div className="w-7 h-7 bg-red-200 dark:bg-red-800/50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400">{statistics.out_of_stock || 0}</p>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Urgent action needed</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <style>{`
          select {
            max-height: 200px !important;
            overflow-y: auto !important;
          }
          select option {
            padding: 8px 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}</style>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter & Search</h3>
          <button
            onClick={() => {
              setFilters({
                search: "",
                item_status: "",
                location: "",
              })
              setSortBy("")
            }}
            className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Clear All
          </button>
        </div>
        
        {/* Single Row - All Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium shadow-sm"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border-2 border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 font-medium appearance-none cursor-pointer shadow-sm"
            >
              <option value="">🔀 Sort By</option>
              <option value="name-asc">📝 Name (A-Z)</option>
              <option value="name-desc">📝 Name (Z-A)</option>
              <option value="stock-high">📊 Stock (High to Low)</option>
              <option value="stock-low">📊 Stock (Low to High)</option>
              <option value="id-asc">🔢 ID Number (1-999)</option>
              <option value="id-desc">🔢 ID Number (999-1)</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={filters.item_status}
              onChange={(e) => setFilters({ ...filters, item_status: e.target.value })}
              className="w-full border-2 border-green-300 dark:border-green-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium appearance-none cursor-pointer shadow-sm"
            >
              <option value="">📦 All Status</option>
              <option value="In Stock">✅ In Stock</option>
              <option value="Low In Stock">⚠️ Low In Stock</option>
              <option value="Out Of Stock">❌ Out Of Stock</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full border-2 border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 font-medium appearance-none cursor-pointer shadow-sm"
              size="1"
              style={{
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              <option value="">📍 All Locations ({Object.values(uniqueLocations).flat().length})</option>
              {Object.entries(uniqueLocations).map(([group, locations]) => (
                <optgroup key={group} label={`📁 ${group} Zone (${locations.length} locations)`}>
                  {locations.map((location) => (
                <option key={location} value={location}>
                  � {location}
                </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Show active filters */}
        {(filters.search || filters.item_status || filters.location || sortBy) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">Active filters & sorting:</p>
            <div className="flex flex-wrap gap-3">
              {filters.search && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-blue-200 dark:border-blue-800">
                  🔍 Search: "{filters.search}"
                </span>
              )}
              {sortBy && (
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-purple-200 dark:border-purple-800">
                  🔀 Sort: {
                    sortBy === "name-asc" ? "Name (A-Z)" :
                    sortBy === "name-desc" ? "Name (Z-A)" :
                    sortBy === "stock-high" ? "Stock (High-Low)" :
                    sortBy === "stock-low" ? "Stock (Low-High)" :
                    sortBy === "id-asc" ? "ID (1-999)" :
                    sortBy === "id-desc" ? "ID (999-1)" : sortBy
                  }
                </span>
              )}
              {filters.item_status && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-green-200 dark:border-green-800">
                  📦 Status: {filters.item_status}
                </span>
              )}
              {filters.location && (
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-orange-200 dark:border-orange-800">
                  📍 Location: {filters.location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading inventory...</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Items Found</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Add your first item to get started with inventory management.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* View Toggle */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📱 Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📋 List
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {sortedItems.length} items • Showing {Math.min(visibleCount, sortedItems.length)} of {sortedItems.length}
            </div>
          </div>

          {/* Items Display */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedItems.slice(0, visibleCount).map((item) => (
            <div
              key={item.item_no}
              onClick={() => {
                setSelectedItemForDetail(item)
                setShowItemDetail(true)
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 flex flex-col cursor-pointer"
            >
              {/* Item Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-1">{item.item_name}</h4>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">{item.brand}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ID: {item.item_no}</p>
                </div>
                {(() => {
                  const bal = Number(item.balance) || 0
                  const min = Number(item.min_stock) || 0
                  const status = bal === 0 ? "Out Of Stock" : (min > 0 && bal < min ? "Low In Stock" : "In Stock")
                  const color = status === "Out Of Stock" ? "bg-red-500" : status === "Low In Stock" ? "bg-yellow-400" : "bg-green-500"
                  return (
                    <span className={`inline-block w-3.5 h-3.5 rounded-full ${color}`} title={status} aria-label={status} />
                  )
                })()}
              </div>

              {/* Item Details */}
              <div className="space-y-3 mb-6 flex-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <span className="font-bold text-gray-700 dark:text-gray-300 block">Type</span>
                    <span className="text-gray-900 dark:text-white">{item.item_type}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <span className="font-bold text-gray-700 dark:text-gray-300 block">Location</span>
                    <span className="text-gray-900 dark:text-white">{item.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <span className="font-bold text-gray-700 dark:text-gray-300 block">Balance</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      {item.balance}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <span className="font-bold text-gray-700 dark:text-gray-300 block">Min Stock</span>
                    <span className="text-gray-900 dark:text-white font-bold">{item.min_stock}</span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-700 dark:text-blue-300 block text-sm">Price per Unit</span>
                    <span className="text-blue-900 dark:text-blue-200 font-bold text-lg">{formatCurrency(item.price_per_unit)}</span>
                  </div>
                  <div className="ml-4">
                    <QRCodeSmall itemNo={item.item_no} size={2} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStockManagement(item)
                  }}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  Stock
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteItem(item.item_no)
                  }}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
          {sortedItems.length > visibleCount && (
            <div className="col-span-full flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => Math.min(c + 20, sortedItems.length))}
                className="mt-2 px-5 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg"
              >
                Load more ({Math.min(20, sortedItems.length - visibleCount)})
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <InventoryListView
          items={sortedItems}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          onItemClick={(item) => {
            setSelectedItemForDetail(item)
            setShowItemDetail(true)
          }}
          onStockManagement={handleStockManagement}
          onDeleteItem={handleDeleteItem}
          formatCurrency={formatCurrency}
        />
      ) : null}
        </>
      )}

      {/* Modals */}
      {showStockInsert && selectedItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Insert Stock - {selectedItem.item_name}</h3>
                <button
                  onClick={() => {
                    setShowStockInsert(false)
                    setSelectedItem(null)
                    setStockInsertData({ quantity: 0, reason: "" })
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedItem.balance}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity to Add *</label>
                  <input
                    type="number"
                    min="1"
                    value={stockInsertData.quantity}
                    onChange={(e) => setStockInsertData({ ...stockInsertData, quantity: Number.parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium text-lg"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason (Optional)</label>
                  <input
                    type="text"
                    value={stockInsertData.reason}
                    onChange={(e) => setStockInsertData({ ...stockInsertData, reason: e.target.value })}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium"
                    placeholder="e.g., New shipment, Restocking"
                  />
                </div>

                {stockInsertData.quantity > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">New Balance Will Be</p>
                    <p className="text-xl font-bold text-green-800 dark:text-green-200">{selectedItem.balance + stockInsertData.quantity} {selectedItem.unit_of_measure}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleStockInsert} disabled={stockInsertData.quantity <= 0} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200">Insert Stock</button>
                <button onClick={() => { setShowStockInsert(false); setSelectedItem(null); setStockInsertData({ quantity: 0, reason: "" }) }} className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Item Form Modal - Now using Wizard with lazy loading! */}
      <Suspense fallback={
        <ModalPortal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">Loading form...</p>
            </div>
          </div>
        </ModalPortal>
      }>
        <AddEditItemWizard
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setSelectedItem(null)
            resetFormData()
            if (returnToDetailView) {
              setShowItemDetail(true)
              setSelectedItemForDetail(selectedItem)
            setReturnToDetailView(false)
          }
        }}
        onSave={handleSaveItem}
        selectedItem={selectedItem}
      />
      </Suspense>

      {/* Stock Manager Modal */}
      {showStockManager && selectedItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Manage Stock - {selectedItem.item_name}
                </h3>
                <button
                  onClick={() => {
                    setShowStockManager(false)
                    setSelectedItem(null)
                    setStockManagerData({ stock_in: 0, stock_out: 0, reason: "", current_balance: 0 })
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Balance</span>
                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {selectedItem.balance || 0} {selectedItem.unit_of_measure || ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stock In (Add) 📈
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockManagerData.stock_in}
                      onChange={(e) =>
                        setStockManagerData({
                          ...stockManagerData,
                          stock_in: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full border-2 border-green-300 dark:border-green-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium text-lg"
                      placeholder="Add stock"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stock Out (Remove) 📉
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedItem.balance || 0}
                      value={stockManagerData.stock_out}
                      onChange={(e) =>
                        setStockManagerData({
                          ...stockManagerData,
                          stock_out: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full border-2 border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500 font-medium text-lg"
                      placeholder="Remove stock"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason/Notes
                  </label>
                  <input
                    type="text"
                    value={stockManagerData.reason}
                    onChange={(e) =>
                      setStockManagerData({
                        ...stockManagerData,
                        reason: e.target.value,
                      })
                    }
                    className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    placeholder="e.g., New shipment, Sale, Transfer, etc."
                  />
                </div>

                {(stockManagerData.stock_in > 0 || stockManagerData.stock_out > 0) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-blue-700 dark:text-blue-300">New Balance Preview</span>
                      <span className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        {(selectedItem.balance || 0) + (stockManagerData.stock_in || 0) - (stockManagerData.stock_out || 0)} {selectedItem.unit_of_measure || ''}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {stockManagerData.stock_in > 0 && `+${stockManagerData.stock_in} `}
                      {stockManagerData.stock_out > 0 && `-${stockManagerData.stock_out} `}
                      from current balance
                    </div>
                  </div>
                )}

                {stockManagerData.stock_out > (selectedItem.balance || 0) && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                    <div className="text-sm text-red-700 dark:text-red-300">
                      ⚠️ Cannot remove more stock than available ({selectedItem.balance || 0} available)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleStockManagerSave}
                  disabled={(!stockManagerData.stock_in && !stockManagerData.stock_out) ||
                    stockManagerData.stock_out > (selectedItem.balance || 0)}
                  className="flex-1 bg-zinc-600 hover:bg-zinc-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  💾 Commit Changes
                </button>
                <button
                  onClick={() => {
                    setShowStockManager(false)
                    setSelectedItem(null)
                    setStockManagerData({ stock_in: 0, stock_out: 0, reason: "", current_balance: 0 })
                  }}
                  className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Item Detail Modal */}
      {showItemDetail && selectedItemForDetail && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <ItemDetailView
                item={selectedItemForDetail}
                onBack={() => {
                  setShowItemDetail(false)
                  setSelectedItemForDetail(null)
                }}
                onEdit={(item) => {
                  setShowItemDetail(false)
                  setSelectedItemForDetail(null)
                  setReturnToDetailView(true)
                  handleEditItem(item)
                }}
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  )
}

export default InventoryManagement