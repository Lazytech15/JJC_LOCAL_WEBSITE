import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"

function AdminDashboard({ onNavigate, isDarkMode }) {
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
    cancelled_orders: 0,
    total_value: 0,
    pending_value: 0,
    completed_value: 0,
    status_breakdown: {
      requested: 0,
      ordered: 0,
      in_transit: 0,
      ready_for_pickup: 0,
      received: 0,
      cancelled: 0
    }
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
        const orders = result.orders || []
        
        const totalOrders = orders.length
        const pendingOrders = orders.filter(order => 
          ['requested', 'ordered', 'in_transit', 'ready_for_pickup'].includes(order.status)
        ).length
        const completedOrders = orders.filter(order => order.status === 'received').length
        const cancelledOrders = orders.filter(order => order.status === 'cancelled').length
        
        const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.total_value) || 0), 0)
        const pendingValue = orders
          .filter(order => ['requested', 'ordered', 'in_transit', 'ready_for_pickup'].includes(order.status))
          .reduce((sum, order) => sum + (parseFloat(order.total_value) || 0), 0)
        const completedValue = orders
          .filter(order => order.status === 'received')
          .reduce((sum, order) => sum + (parseFloat(order.total_value) || 0), 0)

        // Status breakdown
        const statusBreakdown = {
          requested: orders.filter(order => order.status === 'requested').length,
          ordered: orders.filter(order => order.status === 'ordered').length,
          in_transit: orders.filter(order => order.status === 'in_transit').length,
          ready_for_pickup: orders.filter(order => order.status === 'ready_for_pickup').length,
          received: completedOrders,
          cancelled: cancelledOrders
        }

        setPurchaseOrderSummary({
          total_orders: totalOrders,
          pending_orders: pendingOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          total_value: totalValue,
          pending_value: pendingValue,
          completed_value: completedValue,
          status_breakdown: statusBreakdown
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
      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-slate-200 dark:border-slate-700 border-t-amber-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
            </svg>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-6 font-medium text-sm sm:text-base">Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-300 font-semibold mb-1">Error Loading Dashboard</h3>
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="mt-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium underline"
            >
              Dismiss Error
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-600 dark:border-slate-700">
            <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3,13H15V11H3M3,6V8H21V6M3,18H9V16H3V18Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Procurement Dashboard</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Overview of metal works inventory & operations
            </p>
          </div>
        </div>
        <button
          onClick={handleRefreshData}
          className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Enhanced Stats Cards - Industrial Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-4 sm:p-6 border-2 border-slate-300 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-700">
              <path d="M19,15H17V13H19M19,19H17V17H19M13,7H11V5H13M13,11H11V9H13M13,15H11V13H13M13,19H11V17H13M7,11H5V9H7M7,15H5V13H7M7,19H5V17H7M15,11V5L12,2L9,5V7H3V21H21V11H15Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Suppliers</p>
              <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,15H17V13H19M19,19H17V17H19M13,7H11V5H13M13,11H11V9H13M13,15H11V13H13M13,19H11V17H13M7,11H5V9H7M7,15H5V13H7M7,19H5V17H7M15,11V5L12,2L9,5V7H3V21H21V11H15Z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {statistics.active_suppliers || 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Active partners</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 sm:p-6 border-2 border-blue-300 dark:border-blue-800 relative overflow-hidden group hover:shadow-xl transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-blue-700">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total Items</p>
              <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">
              {statistics.total_items || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-1">In inventory</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl p-4 sm:p-6 border-2 border-green-300 dark:border-green-800 relative overflow-hidden group hover:shadow-xl transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-green-700">
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">In Stock</p>
              <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">
              {statistics.in_stock || 0}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400/80 mt-1">Available now</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-800/20 rounded-xl p-4 sm:p-6 border-2 border-amber-300 dark:border-amber-800 relative overflow-hidden group hover:shadow-xl transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-700">
              <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
            </svg>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Value</p>
              <div className="p-2 bg-amber-200 dark:bg-amber-800/50 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(statistics.total_inventory_value || 0)}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-1">Total inventory</p>
          </div>
        </div>
      </div>

      {/* Purchase Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Orders Overview */}
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📋 Purchase Orders Summary</h3>
            <button
              onClick={() => onNavigate && onNavigate("orders")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{purchaseOrderSummary.total_orders}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{purchaseOrderSummary.pending_orders}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Orders</div>
              </div>
            </div>
            
            {/* Financial overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{formatCurrency(purchaseOrderSummary.total_value)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(purchaseOrderSummary.pending_value)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Value</div>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Order Status Breakdown</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{purchaseOrderSummary.status_breakdown.requested}</div>
                  <div className="text-gray-500 dark:text-gray-500">Requested</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{purchaseOrderSummary.status_breakdown.ordered}</div>
                  <div className="text-gray-500 dark:text-gray-500">Ordered</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{purchaseOrderSummary.status_breakdown.in_transit}</div>
                  <div className="text-gray-500 dark:text-gray-500">In Transit</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{purchaseOrderSummary.status_breakdown.ready_for_pickup}</div>
                  <div className="text-gray-500 dark:text-gray-500">Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{purchaseOrderSummary.status_breakdown.received}</div>
                  <div className="text-gray-500 dark:text-gray-500">Received</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">{purchaseOrderSummary.status_breakdown.cancelled}</div>
                  <div className="text-gray-500 dark:text-gray-500">Cancelled</div>
                </div>
              </div>
            </div>

            {/* Performance metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {purchaseOrderSummary.total_orders > 0 ? 
                    Math.round((purchaseOrderSummary.completed_orders / purchaseOrderSummary.total_orders) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 rounded-lg p-4">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(purchaseOrderSummary.total_orders > 0 ? 
                    purchaseOrderSummary.total_value / purchaseOrderSummary.total_orders : 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</div>
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