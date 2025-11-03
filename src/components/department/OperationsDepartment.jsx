import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"

function OperationsDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [operationsData, setOperationsData] = useState({
    activeOperations: 0,
    pendingTasks: 0,
    efficiencyRate: 0,
    workflows: [],
    monitoring: [],
    reports: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOperationsData()
  }, [])

  const fetchOperationsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "operations",
          action: "fetch_all",
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch operations data")

      const data = await response.json()
      setOperationsData({
        activeOperations: data.activeOperations || 0,
        pendingTasks: data.pendingTasks || 0,
        efficiencyRate: data.efficiencyRate || 0,
        workflows: data.workflows || [],
        monitoring: data.monitoring || [],
        reports: data.reports || [],
      })
    } catch (err) {
      setError(err.message)
      console.error("Operations Data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateOperationsData = async (action, data) => {
    try {
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "operations",
          action: action,
          data: data,
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error(`Failed to ${action}`)

      await fetchOperationsData() // Refresh data
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-slate-600 dark:border-slate-400">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Operations Department</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome, {user?.name || "Operations Manager"}</p>
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
                className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading operations data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={fetchOperationsData} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {["dashboard", "workflows", "monitoring", "reports"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-slate-600 dark:border-slate-400 text-slate-700 dark:text-slate-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-slate-600 dark:hover:text-slate-400"
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Operations Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Active Operations</h3>
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {operationsData.activeOperations}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Pending Tasks</h3>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{operationsData.pendingTasks}</p>
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-stone-800 dark:text-stone-200">Efficiency Rate</h3>
                  <p className="text-2xl font-bold text-stone-600 dark:text-stone-400">
                    {operationsData.efficiencyRate}%
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "workflows" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Workflow Management</h2>
              <div className="space-y-4">
                <button
                  onClick={() => updateOperationsData("add_workflow", { name: "New Workflow", status: "active" })}
                  className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add New Workflow
                </button>
                {operationsData.workflows.length > 0 ? (
                  <div className="space-y-2">
                    {operationsData.workflows.map((workflow, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-200">{workflow.name || `Workflow ${index + 1}`}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{workflow.status || "Active"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No workflows found. Add one to get started.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "monitoring" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">System Monitoring</h2>
              <div className="space-y-4">
                <button
                  onClick={() => updateOperationsData("refresh_monitoring", {})}
                  className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh Monitoring Data
                </button>
                {operationsData.monitoring.length > 0 ? (
                  <div className="space-y-2">
                    {operationsData.monitoring.map((item, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-200">{item.system || `System ${index + 1}`}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Status: {item.status || "Online"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No monitoring data available.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "reports" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Operations Reports</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateOperationsData("generate_report", { type: "monthly", date: new Date().toISOString() })
                  }
                  className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Generate Monthly Report
                </button>
                {operationsData.reports.length > 0 ? (
                  <div className="space-y-2">
                    {operationsData.reports.map((report, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-200">{report.title || `Report ${index + 1}`}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Generated: {report.date || "Today"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No reports generated yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OperationsDepartment
