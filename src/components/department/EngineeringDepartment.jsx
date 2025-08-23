"use client"

import { useAuth } from "../../App"
import { useState, useEffect } from "react"

function EngineeringDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [engineeringData, setEngineeringData] = useState({
    activeProjects: 0,
    completedProjects: 0,
    maintenanceTasks: 0,
    projects: [],
    infrastructure: [],
    maintenance: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEngineeringData()
  }, [])

  const fetchEngineeringData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "engineering",
          action: "fetch_all",
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch engineering data")

      const data = await response.json()
      setEngineeringData({
        activeProjects: data.activeProjects || 0,
        completedProjects: data.completedProjects || 0,
        maintenanceTasks: data.maintenanceTasks || 0,
        projects: data.projects || [],
        infrastructure: data.infrastructure || [],
        maintenance: data.maintenance || [],
      })
    } catch (err) {
      setError(err.message)
      console.error("Engineering Data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateEngineeringData = async (action, data) => {
    try {
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "engineering",
          action: action,
          data: data,
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error(`Failed to ${action}`)

      await fetchEngineeringData() // Refresh data
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
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border-l-4 border-neutral-600 dark:border-neutral-400">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Engineering Department</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome, {user?.name || "Chief Engineer"}</p>
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
                className="bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-600 dark:border-neutral-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading engineering data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">Error: {error}</p>
            <button onClick={fetchEngineeringData} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-300/20 dark:border-gray-700/20">
            {["dashboard", "projects", "infrastructure", "maintenance"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-neutral-600 dark:border-neutral-400 text-neutral-700 dark:text-neutral-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-neutral-400"
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Engineering Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Active Projects</h3>
                  <p className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                    {engineeringData.activeProjects}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Completed Projects</h3>
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {engineeringData.completedProjects}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Maintenance Tasks</h3>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {engineeringData.maintenanceTasks}
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "projects" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Project Management</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateEngineeringData("create_project", {
                      name: "Infrastructure Upgrade",
                      status: "Planning",
                      budget: 5000000,
                      timeline: "6 months",
                    })
                  }
                  className="bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create New Project
                </button>
                {engineeringData.projects.length > 0 ? (
                  <div className="space-y-2">
                    {engineeringData.projects.map((project, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-800 dark:text-gray-200">{project.name || `Project ${index + 1}`}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Status: {project.status || "Active"}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Timeline: {project.timeline || "TBD"}
                            </p>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 font-semibold">
                            {formatCurrency(project.budget || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No projects found. Create one to get started.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "infrastructure" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Infrastructure Planning</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateEngineeringData("add_infrastructure", {
                      type: "Road Network",
                      location: "Metro Manila",
                      priority: "High",
                      cost: 10000000,
                    })
                  }
                  className="bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Infrastructure Plan
                </button>
                {engineeringData.infrastructure.length > 0 ? (
                  <div className="space-y-2">
                    {engineeringData.infrastructure.map((item, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg flex justify-between">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">
                            {item.type || `Infrastructure ${index + 1}`}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Location: {item.location || "TBD"} - Priority: {item.priority || "Medium"}
                          </p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold">
                          {formatCurrency(item.cost || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No infrastructure plans found.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "maintenance" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Maintenance Schedule</h2>
              <div className="space-y-4">
                <button
                  onClick={() =>
                    updateEngineeringData("schedule_maintenance", {
                      facility: "Government Building A",
                      type: "Routine Inspection",
                      scheduled: new Date().toISOString().split("T")[0],
                      priority: "Medium",
                    })
                  }
                  className="bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Schedule Maintenance
                </button>
                {engineeringData.maintenance.length > 0 ? (
                  <div className="space-y-2">
                    {engineeringData.maintenance.map((task, index) => (
                      <div key={index} className="p-3 bg-white/5 dark:bg-black/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-800 dark:text-gray-200">
                              {task.facility || `Facility ${index + 1}`}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Type: {task.type || "General Maintenance"}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Scheduled: {task.scheduled || "TBD"}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === "High"
                                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                                : task.priority === "Medium"
                                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                                  : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            }`}
                          >
                            {task.priority || "Low"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No maintenance tasks scheduled.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EngineeringDepartment
