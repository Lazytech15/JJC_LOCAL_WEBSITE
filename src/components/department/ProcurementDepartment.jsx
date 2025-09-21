import { useAuth } from "../../App"
import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import InventoryManagement from "../pd/InventoryManagement"
import SupplierManagement from "../pd/SuppliesManagement"

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState({})

  useEffect(() => {
    fetchProcurementData()
  }, [])

  const fetchProcurementData = async () => {
    try {
      setLoading(true)

      // Use ItemsService instead of direct fetch
      const result = await apiService.items.getItems({ limit: 1000 })
      const items = result.data || []

      // Calculate procurement statistics from items data
      const uniqueSuppliers = [...new Set(items.filter((item) => item.supplier).map((item) => item.supplier))]

      // Fix: Calculate total inventory value properly
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
        out_of_stock: outOfStock,
        active_suppliers: uniqueSuppliers.length
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
                        {statistics.active_suppliers || 0}
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

          {activeTab === "inventory" && <InventoryManagement />}
          {activeTab === "suppliers" && <SupplierManagement />}
        </div>
      </div>
    </div>
  )
}

export default ProcurementDepartment