"use client"

import { useAuth } from "../../App"
import { useState, useEffect } from "react"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProcurementData()
  }, [])

  const fetchProcurementData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "procurement",
          action: "fetch_all",
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch procurement data")

      const data = await response.json()
      setProcurementData({
        activeSuppliers: data.activeSuppliers || 0,
        pendingOrders: data.pendingOrders || 0,
        totalContracts: data.totalContracts || 0,
        suppliers: data.suppliers || [],
        orders: data.orders || [],
        contracts: data.contracts || [],
      })
    } catch (err) {
      setError(err.message)
      console.error("Procurement Data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateProcurementData = async (action, data) => {
    try {
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "procurement",
          action: action,
          data: data,
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error(`Failed to ${action}`)

      await fetchProcurementData() // Refresh data
    } catch (err) {
      setError(err.message)
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
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading procurement data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={fetchProcurementData} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {["dashboard", "suppliers", "orders", "contracts"].map((tab) => (
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Procurement Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Active Suppliers</h3>
                  <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                    {procurementData.activeSuppliers}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Pending Orders</h3>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{procurementData.pendingOrders}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Total Contracts</h3>
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {procurementData.totalContracts}
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "suppliers" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Supplier Management</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateProcurementData("add_supplier", {
                      name: "New Supplier",
                      category: "General",
                      status: "Active",
                    })
                  }
                  className="bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add New Supplier
                </button>
                {procurementData.suppliers.length > 0 ? (
                  <div className="space-y-2">
                    {procurementData.suppliers.map((supplier, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg flex justify-between">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">{supplier.name || `Supplier ${index + 1}`}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {supplier.category || "General"} - {supplier.status || "Active"}
                          </p>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Rating: {supplier.rating || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No suppliers found. Add one to get started.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Purchase Orders</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateProcurementData("create_order", {
                      item: "Office Supplies",
                      quantity: 100,
                      amount: 50000,
                      status: "Pending",
                    })
                  }
                  className="bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create Purchase Order
                </button>
                {procurementData.orders.length > 0 ? (
                  <div className="space-y-2">
                    {procurementData.orders.map((order, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg flex justify-between">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">{order.item || `Order ${index + 1}`}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Qty: {order.quantity || 1} - Status: {order.status || "Pending"}
                          </p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold">
                          {formatCurrency(order.amount || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No purchase orders found.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "contracts" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Contract Management</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateProcurementData("create_contract", {
                      title: "Service Agreement",
                      supplier: "Main Supplier",
                      value: 1000000,
                      duration: "12 months",
                    })
                  }
                  className="bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create New Contract
                </button>
                {procurementData.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {procurementData.contracts.map((contract, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-800 dark:text-gray-200">
                              {contract.title || `Contract ${index + 1}`}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Supplier: {contract.supplier || "TBD"}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Duration: {contract.duration || "TBD"}
                            </p>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 font-semibold">
                            {formatCurrency(contract.value || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No contracts found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProcurementDepartment
