import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"

function AdminDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState({
    total_items: 0,
    total_inventory_value: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    active_suppliers: 0
  })
  const [analytics, setAnalytics] = useState({
    lowStockItems: [],
    criticalStockAlerts: [],
    monthlyTrends: []
  })
  const [purchaseOrderSummary, setPurchaseOrderSummary] = useState({
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    total_value: 0,
    pending_value: 0
  })
  const [employeeLogsSummary, setEmployeeLogsSummary] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch items data
      const result = await apiService.items.getItems({ limit: 1000 })
      const items = result.data || []
      const serverTotal =
        (result.statistics && (result.statistics.total_items ?? result.statistics.total)) ??
        result.total ?? result.count ?? items.length

      // Calculate procurement statistics from items data
      const uniqueSuppliers = [...new Set(items.filter((item) => item.supplier).map((item) => item.supplier))]

      // Calculate total inventory value
      const totalInventoryValue = items.reduce((sum, item) => {
        return sum + ((item.balance || 0) * (item.price_per_unit || 0))
      }, 0)

      // Calculate item status counts
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

      // Calculate low stock items for analytics
      const lowStockItems = items
        .filter(item => {
          const normalized = statusFromText(item.item_status)
          const status = normalized || deriveStatus(item)
          return status === "Low In Stock" || status === "Out Of Stock"
        })
        .sort((a, b) => (a.balance || 0) - (b.balance || 0))
        .slice(0, 10)

      // Calculate critical stock alerts (items with 0 balance or urgent restocking needed)
      const criticalStockAlerts = items
        .filter(item => {
          const balance = Number(item.balance) || 0
          const minStock = Number(item.min_stock) || 0
          return balance === 0 || (minStock > 0 && balance <= minStock * 0.2) // 20% of minimum stock
        })
        .sort((a, b) => (a.balance || 0) - (b.balance || 0))
        .slice(0, 5)

      setAnalytics({
        lowStockItems,
        criticalStockAlerts,
        monthlyTrends: []
      })

      // Fetch purchase orders summary
      await fetchPurchaseOrderSummary()

      // Fetch employee logs summary
      await fetchEmployeeLogsSummary()

    } catch (err) {
      setError(err.message)
      console.error("Dashboard Data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchaseOrderSummary = async () => {
    try {
      const result = await apiService.purchaseOrders.getPurchaseOrders()
      if (result.success) {
        const orders = result.data || []
        
        const totalOrders = orders.length
        const pendingOrders = orders.filter(order => 
          ['requested', 'ordered', 'in_transit', 'ready_for_pickup'].includes(order.status)
        ).length
        const completedOrders = orders.filter(order => order.status === 'received').length
        
        const totalValue = orders.reduce((sum, order) => sum + (order.total_value || 0), 0)
        const pendingValue = orders
          .filter(order => ['requested', 'ordered', 'in_transit', 'ready_for_pickup'].includes(order.status))
          .reduce((sum, order) => sum + (order.total_value || 0), 0)

        setPurchaseOrderSummary({
          total_orders: totalOrders,
          pending_orders: pendingOrders,
          completed_orders: completedOrders,
          total_value: totalValue,
          pending_value: pendingValue
        })
      }
    } catch (err) {
      console.error("Error fetching purchase order summary:", err)
    }
  }

  const fetchEmployeeLogsSummary = async () => {
    try {
      const result = await apiService.employeeLogs.getEmployeeLogs({
        limit: 3,
        sort_by: "created_at",
        sort_order: "DESC"
      })
      
      if (result.success) {
        setEmployeeLogsSummary(result.data || [])
      }
    } catch (err) {
      console.error("Error fetching employee logs summary:", err)
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

  const handleRefreshData = () => {
    fetchDashboardData()
  }

  const handleNavigateToLogs = () => {
    if (onNavigate) onNavigate("logs")
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
        <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-2 text-red-600 dark:text-red-400 hover:underline"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Procurement Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of procurement operations and key metrics
          </p>
        </div>
        <button
          onClick={handleRefreshData}
          className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="p-3 bg-zinc-600/20 dark:bg-zinc-400/20 rounded-lg">💰</div>
          </div>
        </div>
      </div>

      {/* Purchase Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Orders Overview */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">📋 Purchase Orders Summary</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{purchaseOrderSummary.total_orders}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{purchaseOrderSummary.pending_orders}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{purchaseOrderSummary.completed_orders}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{formatCurrency(purchaseOrderSummary.pending_value)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Value</div>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Logs Summary */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">👥 Recent Employee Activity</h3>
          <div className="space-y-3">
            {employeeLogsSummary.length > 0 ? (
              employeeLogsSummary.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-white/10 dark:bg-black/20 rounded-lg">
                  <div className="text-xl">
                    {log.details?.toLowerCase().includes('checkout') ? '📤' :
                     log.details?.toLowerCase().includes('checkin') ? '📥' :
                     log.details?.toLowerCase().includes('stock') ? '📦' :
                     log.details?.toLowerCase().includes('update') ? '✏️' :
                     log.details?.toLowerCase().includes('create') ? '➕' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                      {log.username || 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {log.details || 'No details available'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(log.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No recent activity
              </div>
            )}
          </div>
          <div className="mt-4">
            <button 
              onClick={() => handleNavigateToLogs()}
              className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              View all logs →
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Status Overview */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">📊 Stock Status Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">In Stock</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{width: `${statistics.total_items > 0 ? (statistics.in_stock / statistics.total_items) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-8">{statistics.in_stock || 0}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Low Stock</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{width: `${statistics.total_items > 0 ? (statistics.low_stock / statistics.total_items) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-8">{statistics.low_stock || 0}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Out of Stock</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{width: `${statistics.total_items > 0 ? (statistics.out_of_stock / statistics.total_items) * 100 : 0}%`}}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-8">{statistics.out_of_stock || 0}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Stock Health: <span className={`font-medium ${
                statistics.out_of_stock === 0 && statistics.low_stock <= 5 
                  ? 'text-green-600 dark:text-green-400' 
                  : statistics.out_of_stock <= 2 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {statistics.out_of_stock === 0 && statistics.low_stock <= 5 ? 'Excellent' :
                 statistics.out_of_stock <= 2 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            🚨 <span>Critical Stock Alerts</span>
          </h3>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {analytics.criticalStockAlerts.map((item) => (
              <div key={item.item_no} className="p-2.5 bg-red-50/50 dark:bg-red-900/20 rounded-md border border-red-200/30 dark:border-red-800/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm leading-tight mb-1 break-words">
                      {item.item_name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        📍 {item.location || 'No location'}
                      </span>
                      {item.item_no && (
                        <span className="opacity-75">
                          ID: {item.item_no}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-red-600 dark:text-red-400 text-base">
                        {item.balance || 0}
                      </div>
                      <div className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                        (item.balance || 0) === 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' 
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                      }`}>
                        {(item.balance || 0) === 0 ? 'OUT' : 'LOW'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {analytics.criticalStockAlerts.length === 0 && (
              <div className="text-center py-6 text-green-600 dark:text-green-400">
                <div className="text-xl mb-1">✅</div>
                <div className="font-medium text-sm">No critical alerts!</div>
                <div className="text-xs opacity-75 mt-0.5">All items properly stocked</div>
              </div>
            )}
          </div>
        </div>

        {/* Department Activity & Analytics */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">📈 Analytics</h3>
          <div className="space-y-4">
            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Inventory Turnover</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {statistics.total_items > 0 ? ((statistics.in_stock / statistics.total_items) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stock Availability</div>
            </div>
            
            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Restock Priority</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {analytics.lowStockItems.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Items Need Attention</div>
            </div>

            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Supplier Diversity</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {statistics.active_suppliers || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Active Suppliers</div>
            </div>

            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Item Value</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(
                  statistics.total_items > 0 && statistics.total_inventory_value > 0 
                    ? statistics.total_inventory_value / statistics.total_items 
                    : 0
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Per Item</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard