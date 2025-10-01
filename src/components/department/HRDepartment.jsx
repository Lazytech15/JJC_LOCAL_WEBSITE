"use client"

import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"
import EmployeeRecords from "../hr/EmployeeRecords"
import Recruitment from "../hr/Recruitment"
import Attendance from "../hr/Attendance"
import apiService from "../../utils/api/api-service"

function HRDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState({ total: 0, newHires: 0, openPositions: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeModule, setActiveModule] = useState("dashboard")

  useEffect(() => {
    fetchHRData()

    const unsubscribeEmployeeUpdated = apiService.socket.subscribeToUpdates("employee_updated", (data) => {
      console.log("[HR] Employee updated:", data)
      fetchHRData() // Refresh data when employee is updated
    })

    const unsubscribeEmployeeCreated = apiService.socket.subscribeToUpdates("employee_created", (data) => {
      console.log("[HR] Employee created:", data)
      fetchHRData() // Refresh data when employee is created
    })

    const unsubscribeEmployeeDeleted = apiService.socket.subscribeToUpdates("employee_deleted", (data) => {
      console.log("[HR] Employee deleted:", data)
      fetchHRData() // Refresh data when employee is deleted
    })

    // Cleanup subscriptions
    return () => {
      unsubscribeEmployeeUpdated()
      unsubscribeEmployeeCreated()
      unsubscribeEmployeeDeleted()
    }
  }, [])

const fetchHRData = async () => {
    try {
      setLoading(true)

      const data = await apiService.auth.getHRData()

      setEmployees(data.employees || [])
      
      // Map the statistics object from API to the stats format expected by component
      const mappedStats = {
        total: data.statistics?.totalEmployees || 0,
        newHires: data.statistics?.newHiresLast30Days || 0,
        openPositions: data.statistics?.openPositions || 0
      }
      
      setStats(mappedStats)
    } catch (err) {
      setError(err.message)
      console.error("Employee data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleModuleClick = (action) => {
    setActiveModule(action)
  }

  const renderContent = () => {
    switch (activeModule) {
      case "employees":
        return <EmployeeRecords />
      case "recruitment":
        return <Recruitment />
      case "attendance":
        return <Attendance />
      default:
        return (
          <>
            {/* Quick Stats */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/20 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-slate-700/50 shadow-lg">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Total Employees</h3>
                  <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</p>
                </div>
                <div className="bg-white/20 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/50 shadow-lg">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">New Hires</h3>
                  <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">{stats.newHires}</p>
                </div>
                <div className="bg-white/20 dark:bg-stone-800/80 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-stone-700/50 shadow-lg">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Open Positions</h3>
                  <p className="text-3xl font-bold text-stone-700 dark:text-stone-300">{stats.openPositions}</p>
                </div>
              </div>
            )}

            {/* HR Modules */}
            <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">HR Management Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Employee Records",
                    icon: "📋",
                    desc: "Manage employee information and records",
                    action: "employees",
                  },
                  { name: "Payroll", icon: "💰", desc: "Process payroll and manage compensation", action: "payroll" },
                  {
                    name: "Add Employee",
                    icon: "🎯",
                    desc: "Manage job postings and applications",
                    action: "recruitment",
                  },
                  {
                    name: "Performance",
                    icon: "📊",
                    desc: "Track employee performance and reviews",
                    action: "performance",
                  },
                  {
                    name: "Training",
                    icon: "🎓",
                    desc: "Manage training programs and certifications",
                    action: "training",
                  },
                  {
                    name: "Attendance",
                    icon: "⏰", 
                    desc: "Track employee attendance and working hours",
                    action: "attendance",
                  },
                ].map((module, index) => (
                  <div
                    key={index}
                    onClick={() => handleModuleClick(module.action)}
                    className="bg-white/30 dark:bg-gray-700/40 rounded-lg p-4 border border-white/20 dark:border-gray-600/30 hover:bg-white/40 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="text-2xl mb-2">{module.icon}</div>
                    <h3 className="text-gray-800 dark:text-gray-100 font-medium mb-1">{module.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{module.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee List */}
            {!loading && employees.length > 0 && (
              <div className="bg-white/20 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/30 dark:border-gray-700/30 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Recent Employees</h2>
                <div className="space-y-3">
                  {employees.slice(0, 5).map((employee, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-white/30 dark:bg-gray-700/40 rounded-lg border border-white/20 dark:border-gray-600/30"
                    >
                      <div>
                        <p className="text-gray-800 dark:text-gray-100 font-medium">
                          {employee.name || `Employee ${index + 1}`}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{employee.position || "Staff"}</p>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">{employee.department || "HR"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-slate-900 dark:to-stone-900 transition-colors duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {activeModule !== "dashboard" && (
            <button
              onClick={() => setActiveModule("dashboard")}
              className="p-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 hover:bg-white/30 dark:hover:bg-gray-800/80 transition-all duration-300 text-gray-700 dark:text-gray-200"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">👥 Human Resources</h1>
            <p className="text-gray-600 dark:text-gray-300">Welcome back, {user?.username}!</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-white/20 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/40 hover:bg-white/30 dark:hover:bg-gray-800/80 transition-all duration-300"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={logout}
            className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Loading State */}
        {loading && activeModule === "dashboard" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading HR data...</p>
          </div>
        )}

        {/* Error State */}
        {error && activeModule === "dashboard" && (
          <div className="bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-300 dark:border-red-700/50 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300">Error: {error}</p>
            <button onClick={fetchHRData} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Render content based on active module */}
        {renderContent()}
      </div>
    </div>
  )
}

export default HRDepartment
