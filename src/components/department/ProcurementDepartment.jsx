import { useAuth } from "../../App"
import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import InventoryManagement from "../pd/InventoryManagement"
import SupplierManagement from "../pd/SuppliesManagement"
import ModalPortal from "../pd/ModalPortal"
import RestockList from "../pd/RestockList"

// Procurement List View Component
function ProcurementListView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Pagination for list view: 50 at a time
  const [visibleCount, setVisibleCount] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    item_status: "",
    supplier: ""
  })
  const [stockEditData, setStockEditData] = useState({})
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    fetchItems()
    setVisibleCount(50)
  }, [filters])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value
        }
        return acc
      }, {})
      
      const result = await apiService.items.getItems({ ...cleanFilters, limit: 1000 })
      setItems(result.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Derive status based on numeric rule: out when balance === 0; low when balance < min_stock
  const deriveStatus = (item) => {
    const bal = Number(item.balance) || 0
    const min = Number(item.min_stock) || 0
    if (bal === 0) return "Out Of Stock"
    if (min > 0 && bal < min) return "Low In Stock"
    return "In Stock"
  }

  const handleStockEdit = (itemNo) => {
    const item = items.find(i => i.item_no === itemNo)
    if (item) {
      setEditingItem(item)
      setStockEditData({
        item_no: itemNo,
        stock_in: 0,
        stock_out: 0,
        reason: "",
        current_balance: item.balance || 0
      })
    }
  }

  const handleStockUpdate = async () => {
    if (!editingItem || (!stockEditData.stock_in && !stockEditData.stock_out)) return

    try {
      // If stock_in is provided, use insertStock
      if (stockEditData.stock_in > 0) {
        await apiService.items.insertStock(editingItem.item_no, {
          quantity: stockEditData.stock_in,
          reason: stockEditData.reason || "Stock added via list view"
        })
      }

      // If stock_out is provided, use recordItemOut
      if (stockEditData.stock_out > 0) {
        await apiService.items.recordItemOut(editingItem.item_no, {
          quantity: stockEditData.stock_out,
          reason: stockEditData.reason || "Stock removed via list view"
        })
      }

      await fetchItems()
      setEditingItem(null)
      setStockEditData({})
    } catch (err) {
      setError(err.message)
    }
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

  // New: simple color dot for status
  const getStatusDotColor = (status) => {
    switch (status) {
      case "Out Of Stock":
        return "bg-red-500"
      case "Low In Stock":
        return "bg-yellow-400"
      case "In Stock":
        return "bg-green-500"
      default:
        return "bg-gray-400"
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

  const uniqueSuppliers = [...new Set(items.filter(item => item.supplier).map(item => item.supplier))]

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Inventory List View</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Items: {items.length}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search items..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Status</label>
            <select
              value={filters.item_status}
              onChange={(e) => setFilters({ ...filters, item_status: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low In Stock">Low In Stock</option>
              <option value="Out Of Stock">Out Of Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Supplier</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">All Suppliers</option>
              {uniqueSuppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading items...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Items Table */}
      {!loading && (
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/10 dark:bg-black/20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Brand</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Location</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Balance</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Min Stock</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Price</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Supplier</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
                {items.slice(0, visibleCount).map((item) => (
                  <tr key={item.item_no} className="hover:bg-white/5 dark:hover:bg-black/10 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.item_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.item_no}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.brand || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {item.balance || 0} {item.unit_of_measure || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{item.min_stock || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {item.price_per_unit ? formatCurrency(item.price_per_unit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const status = deriveStatus(item)
                        return (
                          <span
                            className={`inline-block w-3 h-3 rounded-full ${getStatusDotColor(status)}`}
                            title={status}
                            aria-label={status}
                          />
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.supplier || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleStockEdit(item.item_no)}
                        className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Edit Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length > visibleCount && (
            <div className="p-4 text-center">
              <button
                onClick={() => setVisibleCount((c) => Math.min(c + 50, items.length))}
                className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg"
              >
                Load more ({Math.min(50, items.length - visibleCount)})
              </button>
            </div>
          )}
          
          {items.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">No items found matching the current filters.</div>
            </div>
          )}
        </div>
      )}

      {/* Stock Edit Modal */}
      {editingItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Edit Stock</h3>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setStockEditData({})
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="font-medium text-gray-800 dark:text-gray-200">{editingItem.item_name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Balance: {editingItem.balance || 0} {editingItem.unit_of_measure || ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Stock In</label>
                  <input
                    type="number"
                    min="0"
                    value={stockEditData.stock_in || 0}
                    onChange={(e) => setStockEditData({ ...stockEditData, stock_in: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add stock"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Stock Out</label>
                  <input
                    type="number"
                    min="0"
                    max={editingItem.balance || 0}
                    value={stockEditData.stock_out || 0}
                    onChange={(e) => setStockEditData({ ...stockEditData, stock_out: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Remove stock"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Reason</label>
                <input
                  type="text"
                  value={stockEditData.reason || ""}
                  onChange={(e) => setStockEditData({ ...stockEditData, reason: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  placeholder="Reason for stock change"
                />
              </div>

              {(stockEditData.stock_in > 0 || stockEditData.stock_out > 0) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    New Balance: {(editingItem.balance || 0) + (stockEditData.stock_in || 0) - (stockEditData.stock_out || 0)} {editingItem.unit_of_measure || ''}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleStockUpdate}
                disabled={!stockEditData.stock_in && !stockEditData.stock_out}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Update Stock
              </button>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setStockEditData({})
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState({})
  const [analytics, setAnalytics] = useState({
    topItems: [],
    lowStockItems: [],
    supplierAnalytics: [],
    monthlyTrends: []
  })

  useEffect(() => {
    fetchProcurementData()
  }, [])

  const fetchProcurementData = async () => {
    try {
      setLoading(true)

      // Use ItemsService instead of direct fetch
      const result = await apiService.items.getItems({ limit: 1000 })
      const items = result.data || []
      const serverTotal =
        (result.statistics && (result.statistics.total_items ?? result.statistics.total)) ??
        result.total ?? result.count ?? items.length

      // Calculate procurement statistics from items data
      const uniqueSuppliers = [...new Set(items.filter((item) => item.supplier).map((item) => item.supplier))]

      // Fix: Calculate total inventory value properly
      const totalInventoryValue = items.reduce((sum, item) => {
        return sum + ((item.balance || 0) * (item.price_per_unit || 0))
      }, 0)

      // Calculate item status counts with normalization (handles "low stock" vs "low in stock", case, etc.)
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
      const statuses = items.map((item) => statusFromText(item.item_status) || deriveStatus(item))
      const inStock = statuses.filter((s) => s === "In Stock").length
      const lowStock = statuses.filter((s) => s === "Low In Stock").length
      const outOfStock = statuses.filter((s) => s === "Out Of Stock").length

      // Update statistics state
      setStatistics({
        total_items: serverTotal,
        total_inventory_value: totalInventoryValue,
        in_stock: inStock,
        low_stock: lowStock,
        out_of_stock: outOfStock,
        active_suppliers: uniqueSuppliers.length
      })

      // Calculate analytics
      const topValueItems = items
        .map(item => ({
          ...item,
          totalValue: (item.balance || 0) * (item.price_per_unit || 0)
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5)

      const lowStockItems = items
        .filter(item => {
          const normalized = statusFromText(item.item_status)
          const status = normalized || deriveStatus(item)
          return status === "Low In Stock" || status === "Out Of Stock"
        })
        .sort((a, b) => (a.balance || 0) - (b.balance || 0))
        .slice(0, 10)

      const supplierAnalytics = uniqueSuppliers.map(supplier => {
        const suppliedItems = items.filter(item => item.supplier === supplier)
        const totalValue = suppliedItems.reduce((sum, item) => 
          sum + ((item.balance || 0) * (item.price_per_unit || 0)), 0)
        const itemCount = suppliedItems.length
        const lowStockCount = suppliedItems.filter(item => {
          const normalized = statusFromText(item.item_status)
          const status = normalized || deriveStatus(item)
          return status === "Low In Stock" || status === "Out Of Stock"
        }).length

        return {
          supplier,
          itemCount,
          totalValue,
          lowStockCount,
          avgValuePerItem: itemCount > 0 ? totalValue / itemCount : 0
        }
      }).sort((a, b) => b.totalValue - a.totalValue)

      setAnalytics({
        topItems: topValueItems,
        lowStockItems,
        supplierAnalytics: supplierAnalytics.slice(0, 5),
        monthlyTrends: [] // This would require historical data
      })

    } catch (err) {
      setError(err.message)
      console.error("Procurement Data fetch error:", err)
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Navigation Tabs */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {[
              { key: "dashboard", label: "Dashboard", icon: "📊" },
              { key: "inventory", label: "Inventory", icon: "📦" },
              { key: "restock", label: "Restock", icon: "🧾" },
              { key: "list-view", label: "List View", icon: "📋" },
              { key: "suppliers", label: "Suppliers", icon: "🏢" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "border-b-2 border-zinc-600 dark:border-zinc-400 text-zinc-700 dark:text-zinc-300 bg-white/5 dark:bg-black/10"
                    : "text-gray-600 dark:text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-white/5 dark:hover:bg-black/10"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</p>
                      <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mt-2">
                        {statistics.active_suppliers || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">🏢</div>
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                        {statistics.in_stock || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-600/20 dark:bg-green-400/20 rounded-lg">✅</div>
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
                    <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">�</div>
                  </div>
                </div>
              </div>

              {/* Additional Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Stock Status Overview */}
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Stock Status Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">In Stock</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${statistics.total_items > 0 ? (statistics.in_stock / statistics.total_items) * 100 : 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{statistics.in_stock || 0}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Low Stock</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{width: `${statistics.total_items > 0 ? (statistics.low_stock / statistics.total_items) * 100 : 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{statistics.low_stock || 0}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Out of Stock</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{width: `${statistics.total_items > 0 ? (statistics.out_of_stock / statistics.total_items) * 100 : 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{statistics.out_of_stock || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setActiveTab("inventory")}
                      className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                    >
                      📦 Manage Inventory
                    </button>
                    <button 
                      onClick={() => setActiveTab("list-view")}
                      className="bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                    >
                      � View All Items
                    </button>
                    <button 
                      onClick={() => setActiveTab("suppliers")}
                      className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-700 dark:text-purple-300 px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                    >
                      🏢 Suppliers
                    </button>
                    <button 
                      onClick={fetchProcurementData}
                      className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/30 text-orange-700 dark:text-orange-300 px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                    >
                      🔄 Refresh Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Value Items */}
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">🏆 Top Value Items</h3>
                  <div className="space-y-3">
                    {analytics.topItems.map((item, index) => (
                      <div key={item.item_no} className="flex items-center justify-between p-3 bg-white/10 dark:bg-black/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.item_name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {item.balance} units @ {formatCurrency(item.price_per_unit || 0)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(item.totalValue)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {analytics.topItems.length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No items with value data found
                      </div>
                    )}
                  </div>
                </div>

                {/* Low Stock Alert */}
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">⚠️ Low Stock Alert</h3>
                  <div className="space-y-3 max-h-84 overflow-y-auto pr-2 pb-2">
                    {analytics.lowStockItems.map((item) => (
                      <div key={item.item_no} className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-200/30 dark:border-red-800/30">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.item_name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {item.brand ? `${item.brand} | ` : ''}{item.location || 'No location'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600 dark:text-red-400">
                            {item.balance || 0} / {item.min_stock || 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.item_status}
                          </div>
                        </div>
                      </div>
                    ))}
                    {analytics.lowStockItems.length === 0 && (
                      <div className="text-center py-4 text-green-600 dark:text-green-400">
                        ✅ All items are well stocked!
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplier Performance */}
                <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">📊 Supplier Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300/20 dark:border-gray-700/20">
                          <th className="text-left py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Supplier</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Items</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Total Value</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Avg/Item</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Low Stock</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
                        {analytics.supplierAnalytics.map((supplier, index) => (
                          <tr key={supplier.supplier} className="hover:bg-white/5 dark:hover:bg-black/10">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {index + 1}
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{supplier.supplier}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">{supplier.itemCount}</td>
                            <td className="py-3 px-3 text-center font-semibold text-gray-800 dark:text-gray-200">
                              {formatCurrency(supplier.totalValue)}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                              {formatCurrency(supplier.avgValuePerItem)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                supplier.lowStockCount === 0 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : supplier.lowStockCount <= 2
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {supplier.lowStockCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {supplier.lowStockCount === 0 ? '✅' : 
                               supplier.lowStockCount <= 2 ? '⚠️' : '🚨'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {analytics.supplierAnalytics.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No supplier data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && <InventoryManagement />}
          {activeTab === "restock" && <RestockList />}
          {activeTab === "list-view" && <ProcurementListView />}
          {activeTab === "suppliers" && <SupplierManagement />}
        </div>
      </div>
    </div>
  )
}

export default ProcurementDepartment