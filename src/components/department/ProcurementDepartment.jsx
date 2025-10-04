import { useAuth } from "../../contexts/AuthContext"
import { useState } from "react"
import InventoryManagement from "../pd/InventoryManagement"
import SupplierManagement from "../pd/SuppliesManagement"
import ModalPortal from "../pd/ModalPortal"
import RestockList from "../pd/RestockList"
import PurchaseOrderTracker from "../pd/PurchaseOrderTracker"
import EmployeeLogs from "../pd/EmployeeLogs"
import { ItemDetailView } from "../pd/ItemDetailView"
import AdminDashboard from "../pd/AdminDashboard"

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
              { key: "orders", label: "Purchase Orders", icon: "📋" },
              { key: "suppliers", label: "Suppliers", icon: "🏢" },
              { key: "logs", label: "Employee Logs", icon: "👥" }
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
          {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
          {activeTab === "inventory" && <InventoryManagement />}
          {activeTab === "restock" && <RestockList />}
          {activeTab === "orders" && <PurchaseOrderTracker />}
          {activeTab === "suppliers" && <SupplierManagement />}
          {activeTab === "logs" && <EmployeeLogs />}
        </div>
      </div>
    </div>
  )
}

export default ProcurementDepartment