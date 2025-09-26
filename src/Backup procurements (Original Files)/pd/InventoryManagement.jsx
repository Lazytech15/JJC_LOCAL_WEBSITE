import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import * as XLSX from 'xlsx'
import Swal from "sweetalert2"

function InventoryManagement() {
  // Inventory Management States
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showStockInsert, setShowStockInsert] = useState(false)
  const [stockInsertData, setStockInsertData] = useState({ quantity: 0, reason: "" })
  const [statistics, setStatistics] = useState({})
  const [filters, setFilters] = useState({
    search: "",
    item_type: "",
    location: "",
    item_status: "",
  })

  // Form state for inventory items
  const [formData, setFormData] = useState({
    item_name: "",
    brand: "",
    item_type: "",
    location: "",
    balance: 0,
    min_stock: 0,
    unit_of_measure: "",
    price_per_unit: 0,
    item_status: "In Stock",
    supplier: "",
  })

  useEffect(() => {
    fetchItems()
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
      const result = await apiService.items.getItems(cleanFilters)
      setItems(result.data || [])
      setStatistics(result.statistics || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async (itemData) => {
    try {
      if (selectedItem) {
        await apiService.items.updateItem(selectedItem.item_no, itemData || formData)
      } else {
        await apiService.items.createItem(itemData || formData)
      }

      await fetchItems()
      setShowForm(false)
      setSelectedItem(null)
      resetFormData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteItem = async (itemNo) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      await apiService.items.deleteItem(itemNo)
      await fetchItems()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setFormData({
      item_name: item.item_name || "",
      brand: item.brand || "",
      item_type: item.item_type || "",
      location: item.location || "",
      balance: item.balance || 0,
      min_stock: item.min_stock || 0,
      unit_of_measure: item.unit_of_measure || "",
      price_per_unit: item.price_per_unit || 0,
      item_status: item.item_status || "In Stock",
      supplier: item.supplier || "",
    })
    setShowForm(true)
  }

  const resetFormData = () => {
    setFormData({
      item_name: "",
      brand: "",
      item_type: "",
      location: "",
      balance: 0,
      min_stock: 0,
      unit_of_measure: "",
      price_per_unit: 0,
      item_status: "In Stock",
      supplier: "",
    })
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
      Swal.fire({
        title: "Success!",
        text: `Stock inserted successfully! Added ${stockInsertData.quantity} units.`,
        icon: "success",
        confirmButtonText: "OK",
      })
    } catch (error) {
      console.error("Error inserting stock:", error)
      Swal.fire({
        title: "Error!",
        text: `Error: ${error.message}`,
        icon: "error",
        confirmButtonText: "OK",
      })
    }
  }

  const exportBarcodesToExcel = async () => {
  if (items.length === 0) {
    Swal.fire({
      title: "No Items",
      text: "No items available to export barcodes.",
      icon: "warning",
      confirmButtonText: "OK",
    })
    return
  }

  try {
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GOOJPRT Compatible Barcodes</title>
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
          <h1>GOOJPRT Compatible Barcodes</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total Items: ${items.length}</p>
          
          <div class="instructions">
            <h3>GOOJPRT Scanner Setup Instructions:</h3>
            <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
              <li><strong>Check Scanner Settings:</strong> Make sure CODE128 is enabled on your scanner</li>
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
      // Ensure item_no is clean and compatible
      const cleanItemNo = String(item.item_no).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      
      htmlContent += `
        <div class="barcode-item">
          <svg id="barcode-${index}" class="barcode-svg"></svg>
          <div class="item-id">ID: ${cleanItemNo}</div>
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
      const cleanItemNo = String(item.item_no).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      
      htmlContent += `
              try {
                JsBarcode("#barcode-${index}", "${cleanItemNo}", {
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
                console.error("Error generating barcode for ${cleanItemNo}:", e);
                document.getElementById("barcode-${index}").innerHTML = 
                  '<div style="border:2px solid red; padding:20px; color:red;">Error generating barcode for ${cleanItemNo}</div>';
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

    Swal.fire({
      title: "GOOJPRT Compatible Barcodes Created!",
      html: `
        <div style="text-align: left; max-width: 500px;">
          <p><strong>File downloaded successfully!</strong></p>
          <br>
          <h4>Troubleshooting Steps:</h4>
          <ol>
            <li><strong>Scanner Settings:</strong> Check if CODE128 is enabled on your GOOJPRT scanner</li>
            <li><strong>Print Quality:</strong> Use 600 DPI or higher</li>
            <li><strong>Paper:</strong> Use bright white paper</li>
            <li><strong>Size:</strong> Print at 100% scale</li>
            <li><strong>Clean Scanner:</strong> Clean the scanner lens</li>
            <li><strong>Test:</strong> Try scanning with a phone app first</li>
          </ol>
          <br>
          <p><strong>Still not working?</strong> Try the alternative formats below.</p>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Got it!",
      width: 600
    })

  } catch (error) {
    console.error("Error creating barcodes:", error)
    Swal.fire({
      title: "Export Error!",
      text: "Failed to create barcode file. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    })
  }
}

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Comprehensive inventory tracking with barcode export functionality
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportBarcodesToExcel}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            <span className="text-xl">📊</span>
            Export Barcodes
          </button>
          <button
            onClick={() => {
              setSelectedItem(null)
              resetFormData()
              setShowForm(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            <span className="text-xl">+</span>
            Add New Item
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
              Total Items
            </h3>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              📦
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.total_items || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl p-6 shadow-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm uppercase tracking-wide">
              In Stock
            </h3>
            <div className="w-10 h-10 bg-emerald-200 dark:bg-emerald-800/50 rounded-xl flex items-center justify-center">
              ✅
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            {statistics.in_stock || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl p-6 shadow-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-amber-700 dark:text-amber-300 text-sm uppercase tracking-wide">
              Low Stock
            </h3>
            <div className="w-10 h-10 bg-amber-200 dark:bg-amber-800/50 rounded-xl flex items-center justify-center">
              ⚠️
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{statistics.low_stock || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-6 shadow-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-700 dark:text-red-300 text-sm uppercase tracking-wide">
              Out of Stock
            </h3>
            <div className="w-10 h-10 bg-red-200 dark:bg-red-800/50 rounded-xl flex items-center justify-center">
              ❌
            </div>
          </div>
          <p className="text-3xl font-bold text-red-700 dark:text-red-400">{statistics.out_of_stock || 0}</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter & Search</h3>
          <button
            onClick={() => {
              setFilters({
                search: "",
                item_type: "",
                location: "",
                item_status: "",
              })
            }}
            className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          <select
            value={filters.item_status}
            onChange={(e) => setFilters({ ...filters, item_status: e.target.value })}
            className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            <option value="">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low In Stock">Low In Stock</option>
            <option value="Out Of Stock">Out Of Stock</option>
          </select>

          <input
            type="text"
            placeholder="Filter by type..."
            value={filters.item_type}
            onChange={(e) => setFilters({ ...filters, item_type: e.target.value })}
            className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />

          <input
            type="text"
            placeholder="Filter by location..."
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>
        
        {/* Show active filters */}
        {(filters.search || filters.item_type || filters.location || filters.item_status) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Active filters:</p>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  Search: "{filters.search}"
                </span>
              )}
              {filters.item_status && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
                  Status: {filters.item_status}
                </span>
              )}
              {filters.item_type && (
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                  Type: {filters.item_type}
                </span>
              )}
              {filters.location && (
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">
                  Location: {filters.location}
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
      ) : items.length === 0 ? (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.item_no}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 flex flex-col"
            >
              {/* Item Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-1">{item.item_name}</h4>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">{item.brand}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ID: {item.item_no}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getStatusColor(item.item_status)}`}
                >
                  {item.item_status}
                </span>
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

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <span className="font-bold text-blue-700 dark:text-blue-300 block text-sm">
                    Price per Unit
                  </span>
                  <span className="text-blue-900 dark:text-blue-200 font-bold text-lg">
                    {formatCurrency(item.price_per_unit)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleEditItem(item)}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(item)
                    setShowStockInsert(true)
                  }}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  Stock
                </button>
                <button
                  onClick={() => handleDeleteItem(item.item_no)}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showStockInsert && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Insert Stock - {selectedItem.item_name}
              </h3>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedItem.balance}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockInsertData.quantity}
                  onChange={(e) =>
                    setStockInsertData({
                      ...stockInsertData,
                      quantity: Number.parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium text-lg"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={stockInsertData.reason}
                  onChange={(e) =>
                    setStockInsertData({
                      ...stockInsertData,
                      reason: e.target.value,
                    })
                  }
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium"
                  placeholder="e.g., New shipment, Restocking"
                />
              </div>

              {stockInsertData.quantity > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">New Balance Will Be</p>
                  <p className="text-xl font-bold text-green-800 dark:text-green-200">
                    {selectedItem.balance + stockInsertData.quantity} {selectedItem.unit_of_measure}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleStockInsert}
                disabled={stockInsertData.quantity <= 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Insert Stock
              </button>
              <button
                onClick={() => {
                  setShowStockInsert(false)
                  setSelectedItem(null)
                  setStockInsertData({ quantity: 0, reason: "" })
                }}
                className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {selectedItem ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setSelectedItem(null)
                  resetFormData()
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveItem()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Type</label>
                  <input
                    type="text"
                    value={formData.item_type}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                {!selectedItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Initial Balance *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: Number.parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    />
                  </div>
                )}
                {selectedItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Balance (Read Only)
                    </label>
                    <input
                      type="text"
                      value={`${selectedItem.balance}`}
                      disabled
                      className="w-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use "Insert Stock" button to add inventory
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number.parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    placeholder="e.g., pcs, kg, ltr"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price per Unit
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_unit}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_unit: Number.parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.item_status}
                    onChange={(e) => setFormData({ ...formData, item_status: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low In Stock">Low In Stock</option>
                    <option value="Out Of Stock">Out Of Stock</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {selectedItem ? "Update Item" : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedItem(null)
                    resetFormData()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement