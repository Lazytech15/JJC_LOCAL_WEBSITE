import { useAuth } from "../../App"
import { useState, useEffect } from "react"
import { API_ENDPOINTS } from "../../utils/public_api"
import Swal from "sweetalert2"

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [procurementData, setProcurementData] = useState({
    activeSuppliers: 0,
    pendingOrders: 0,
    totalContracts: 0,
    suppliers: [],
    orders: [],
    contracts: [],
  })

  // Inventory Management States
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showStockInsert, setShowStockInsert] = useState(false)
  const [stockInsertData, setStockInsertData] = useState({ quantity: 0, reason: "" })
  const [statistics, setStatistics] = useState({})
  const [filters, setFilters] = useState({
    search: "",
    item_type: "",
    location: "",
    item_status: "",
  })

  // Supplier Management States
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [supplierItems, setSupplierItems] = useState([])
  const [availableSuppliers, setAvailableSuppliers] = useState([])

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
    supplier: "", // Added supplier field
  })

useEffect(() => {
  // Always fetch procurement data for dashboard statistics
  fetchProcurementData()
  
  if (activeTab === "inventory") {
    fetchItems()
  }
  if (activeTab === "suppliers") {
    fetchSuppliers()
  }
}, [activeTab])

  useEffect(() => {
  if (activeTab === "inventory") {
    fetchItems()
  }
}, [filters]) 

  const fetchProcurementData = async () => {
  try {
    setLoading(true)

    // Fetch items to get supplier and other procurement-related data
    const response = await fetch(`${API_ENDPOINTS.public}/api/items?limit=1000`, {
      method: "GET",
    })

    if (!response.ok) throw new Error("Failed to fetch procurement data")

    const data = await response.json()
    const items = data.data || []

    // Calculate procurement statistics from items data
    const uniqueSuppliers = [...new Set(items.filter((item) => item.supplier).map((item) => item.supplier))]
    const lowStockItems = items.filter(
      (item) => item.item_status === "Low In Stock" || item.item_status === "Out Of Stock",
    )

    // Calculate total inventory value
    const totalInventoryValue = items.reduce((sum, item) => {
      return sum + ((item.balance || 0) * (item.price_per_unit || 0))
    }, 0)

    // Calculate item status counts
    const inStock = items.filter(item => item.item_status === "In Stock").length
    const lowStock = items.filter(item => item.item_status === "Low In Stock").length
    const outOfStock = items.filter(item => item.item_status === "Out Of Stock").length

    // Update statistics state
    setStatistics({
      total_items: items.length,
      total_inventory_value: totalInventoryValue,
      in_stock: inStock,
      low_stock: lowStock,
      out_of_stock: outOfStock
    })

    // Mock data for orders and contracts (you can replace this with actual API calls)
    const mockOrders = [
      { id: 1, item: "Office Supplies", quantity: 100, status: "Pending", amount: 15000 },
      { id: 2, item: "Computer Equipment", quantity: 5, status: "Processing", amount: 75000 },
      { id: 3, item: "Furniture", quantity: 20, status: "Pending", amount: 45000 },
    ]

    const mockContracts = [
      { id: 1, title: "Annual Office Supplies Contract", supplier: "ABC Corp", duration: "1 Year", value: 500000 },
      { id: 2, title: "IT Equipment Maintenance", supplier: "Tech Solutions", duration: "2 Years", value: 300000 },
      { id: 3, title: "Cleaning Services Contract", supplier: "CleanCo", duration: "1 Year", value: 180000 },
    ]

    // Create supplier objects from unique suppliers
    const supplierObjects = uniqueSuppliers.map((supplier, index) => ({
      id: index + 1,
      name: supplier,
      description: `Supplier providing various items for the organization`,
      status: "Active",
    }))

    setProcurementData({
      activeSuppliers: uniqueSuppliers.length,
      pendingOrders: mockOrders.filter((order) => order.status === "Pending").length,
      totalContracts: mockContracts.length,
      suppliers: supplierObjects,
      orders: mockOrders,
      contracts: mockContracts,
    })
  } catch (err) {
    setError(err.message)
    console.error("Procurement Data fetch error:", err)
  } finally {
    setLoading(false)
  }
}

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
    
    const queryParams = new URLSearchParams(cleanFilters).toString()
    const url = `${API_ENDPOINTS.public}/api/items${queryParams ? `?${queryParams}` : ''}`
    const response = await fetch(url)

    if (!response.ok) throw new Error("Failed to fetch items")

    const result = await response.json()
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
      const url = selectedItem
        ? `${API_ENDPOINTS.public}/api/items/${selectedItem.item_no}`
        : `${API_ENDPOINTS.public}/api/items`
      const method = selectedItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData || formData),
      })

      if (!response.ok) throw new Error("Failed to save item")

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
      const response = await fetch(`${API_ENDPOINTS.public}/api/items/${itemNo}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete item")

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

  const handleQRScan = async (scannedData) => {
    try {
      const itemNo = Number.parseInt(scannedData)
      if (!isNaN(itemNo)) {
        const response = await fetch(`${API_ENDPOINTS.public}/api/items/${itemNo}`)
        if (response.ok) {
          const result = await response.json()
          handleEditItem(result.data)
        }
      }
    } catch (err) {
      setError("Failed to process QR code")
    }
    setShowQRScanner(false)
  }

  const generateQRCode = (item) => {
    const qrData = item.item_no.toString()
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
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
      const response = await fetch(`${API_ENDPOINTS.public}/api/items/${selectedItem.item_no}/stock-insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockInsertData),
      })

      if (response.ok) {
        const result = await response.json()
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
      } else {
        const error = await response.json()
        Swal.fire({
          title: "Error!",
          text: `Error: ${error.message}`,
          icon: "error",
          confirmButtonText: "OK",
        })
      }
    } catch (error) {
      console.error("Error inserting stock:", error)
      Swal.fire({
        title: "Error!",
        text: "Failed to insert stock",
        icon: "error",
        confirmButtonText: "OK",
      })
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.public}/api/items/filters/options`)
      if (response.ok) {
        const result = await response.json()
        setAvailableSuppliers(result.data.suppliers || [])
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    }
  }

  const fetchSupplierItems = async (supplier) => {
    if (!supplier) {
      setSupplierItems([])
      return
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.public}/api/items/supplier/${encodeURIComponent(supplier)}`)
      if (response.ok) {
        const result = await response.json()
        setSupplierItems(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching supplier items:", error)
      setSupplierItems([])
    }
  }

  const downloadSupplierReport = async (supplier) => {
    if (!supplier) return

    try {
      const response = await fetch(
        `${API_ENDPOINTS.public}/api/items/export/supplier-report/${encodeURIComponent(supplier)}`,
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `supplier_report_${supplier.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error downloading supplier report:", error)
      Swal.fire({
        title: "Error!",
        text: "Failed to download supplier report",
        icon: "error",
        confirmButtonText: "OK",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Keep original ProcurementDepartment header */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-zinc-600 dark:border-zinc-400">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Procurement Department</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome, {user?.name || "Procurement Officer"}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-gray-300/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button
                onClick={logout}
                className="bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs - Replace inventory tab with enhanced inventory management */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {["dashboard", "inventory", "suppliers"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-zinc-600 dark:border-zinc-400 text-zinc-700 dark:text-zinc-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6">
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Procurement Dashboard</h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</p>
        <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mt-2">
          {procurementData.activeSuppliers}
        </p>
      </div>
      <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">
        <svg
          className="w-6 h-6 text-zinc-600 dark:text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
    </div>
  </div>

  <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
        <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mt-2">
          {statistics.total_items || 0}
        </p>
      </div>
      <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">📦</div>
    </div>
  </div>

  <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inventory Value</p>
        <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mt-2">
          {formatCurrency(statistics.total_inventory_value || 0)}
        </p>
      </div>
      <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">💰</div>
    </div>
  </div>
</div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="p-6 space-y-8">
              {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    Comprehensive inventory tracking with QR code support
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                  >
                    <span className="text-xl">📱</span>
                    Scan QR Code
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

              {/* Items Grid */}
              {items.length === 0 ? (
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
                              {item.balance} {item.unit_of_measure}
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

                      {/* Action Buttons - Added stock insert button */}
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item)
                            setShowStockInsert(true)
                          }}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                        >
                          📦 Stock
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item)
                            setShowQRGenerator(true)
                          }}
                          className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                        >
                          🔗 QR
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.item_no)}
                          className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                        >
                          🗑️ Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "suppliers" && (
            <div className="p-6 space-y-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h2>
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    Manage suppliers and view their inventory items
                  </p>
                </div>
              </div>

              {/* Supplier Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Supplier</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <select
                      value={selectedSupplier}
                      onChange={(e) => {
                        setSelectedSupplier(e.target.value)
                        fetchSupplierItems(e.target.value)
                      }}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    >
                      <option value="">Select a supplier...</option>
                      {availableSuppliers.map((supplier) => (
                        <option key={supplier} value={supplier}>
                          {supplier}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSupplier && (
                    <button
                      onClick={() => downloadSupplierReport(selectedSupplier)}
                      className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      📊 Download Report
                    </button>
                  )}
                </div>
              </div>

              {/* Supplier Items */}
              {selectedSupplier && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Items from {selectedSupplier}</h3>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                      {supplierItems.length} items
                    </span>
                  </div>

                  {supplierItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📦</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Items Found</h4>
                      <p className="text-gray-600 dark:text-gray-400">This supplier has no items in the inventory.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {supplierItems.map((item) => (
                        <div
                          key={item.item_no}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{item.item_name}</h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.item_status)}`}
                            >
                              {item.item_status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.balance} {item.unit_of_measure}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Min Stock:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{item.min_stock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Price:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(item.price_per_unit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
                    {selectedItem.balance} {selectedItem.unit_of_measure}
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

        {/* Item Form Modal - Made balance non-editable and changed to direct input */}
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
                        value={`${selectedItem.balance} ${selectedItem.unit_of_measure}`}
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

        {/* QR Code Generator Modal */}
        {showQRGenerator && selectedItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">QR Code</h3>
                <button
                  onClick={() => {
                    setShowQRGenerator(false)
                    setSelectedItem(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center">
                <div className="bg-white p-4 rounded-lg mb-4 inline-block">
                  <img
                    src={generateQRCode(selectedItem) || "/placeholder.svg"}
                    alt="QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{selectedItem.item_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Item #{selectedItem.item_no}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    const link = document.createElement("a")
                    link.download = `QR-${selectedItem.item_no}-${selectedItem.item_name}.png`
                    link.href = generateQRCode(selectedItem)
                    link.click()
                  }}
                  className="flex-1 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Download QR Code
                </button>
                <button
                  onClick={() => {
                    setShowQRGenerator(false)
                    setSelectedItem(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Scan QR Code</h3>
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 mb-4">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">Camera scanner would be integrated here</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Or enter item number manually:
                  </label>
                  <input
                    type="number"
                    placeholder="Enter item number..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && e.target.value) {
                        handleQRScan(e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowQRScanner(false)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcurementDepartment
