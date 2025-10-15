import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect } from "react"
import EmployeeRecords from "../hr/EmployeeRecords"
import Recruitment from "../hr/Recruitment"
import Attendance from "../hr/Attendance"
import Announcement from "../hr/Announcement"
import GearLoadingSpinner from "../../../public/LoadingGear"
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
      fetchHRData()
    })

    const unsubscribeEmployeeCreated = apiService.socket.subscribeToUpdates("employee_created", (data) => {
      console.log("[HR] Employee created:", data)
      fetchHRData()
    })

    const unsubscribeEmployeeDeleted = apiService.socket.subscribeToUpdates("employee_deleted", (data) => {
      console.log("[HR] Employee deleted:", data)
      fetchHRData()
    })

    return () => {
      unsubscribeEmployeeUpdated()
      unsubscribeEmployeeCreated()
      unsubscribeEmployeeDeleted()
    }
  }, [])

  const fetchHRData = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiService.auth.getHRData()

      setEmployees(data.employees || [])
      
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

  const cardClass = isDarkMode 
    ? "bg-gray-800/60 border-gray-700/50" 
    : "bg-white/20 border-white/30"
  
  const textPrimaryClass = isDarkMode ? "text-gray-100" : "text-gray-800"
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-600"

  const renderContent = () => {
    switch (activeModule) {
      case "employees":
        return <EmployeeRecords />
      case "recruitment":
        return <Recruitment />
      case "attendance":
        return <Attendance />
      case "announce":
        return <Announcement />
      default:
        return (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-2 ${textPrimaryClass}`}>Total Employees</h3>
                <p className={`text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-slate-700"}`}>{stats.total}</p>
              </div>
              <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-2 ${textPrimaryClass}`}>New Hires</h3>
                <p className={`text-3xl font-bold ${isDarkMode ? "text-green-400" : "text-gray-700"}`}>{stats.newHires}</p>
              </div>
              <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-2 ${textPrimaryClass}`}>Open Positions</h3>
                <p className={`text-3xl font-bold ${isDarkMode ? "text-orange-400" : "text-stone-700"}`}>{stats.openPositions}</p>
              </div>
            </div>

            {/* HR Modules */}
            <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
              <h2 className={`text-xl font-semibold mb-6 ${textPrimaryClass}`}>HR Management Modules</h2>
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
                    name: "Announcement",
                    icon: "📣",
                    desc: "Manage Announcement for Employee",
                    action: "announce",
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
                    className={`rounded-lg p-4 border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                      isDarkMode 
                        ? "bg-gray-700/50 border-gray-600/40 hover:bg-gray-700/70" 
                        : "bg-white/30 border-white/20 hover:bg-white/40"
                    }`}
                  >
                    <div className="text-2xl mb-2">{module.icon}</div>
                    <h3 className={`font-medium mb-1 ${textPrimaryClass}`}>{module.name}</h3>
                    <p className={`text-sm ${textSecondaryClass}`}>{module.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee List */}
            {employees.length > 0 && (
              <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h2 className={`text-xl font-semibold mb-6 ${textPrimaryClass}`}>Recent Employees</h2>
                <div className="space-y-3">
                  {employees.slice(0, 5).map((employee, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-300 ${
                        isDarkMode 
                          ? "bg-gray-700/40 border-gray-600/40 hover:bg-gray-700/60" 
                          : "bg-white/30 border-white/20 hover:bg-white/40"
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${textPrimaryClass}`}>
                          {employee.name || `Employee ${index + 1}`}
                        </p>
                        <p className={`text-sm ${textSecondaryClass}`}>{employee.position || "Staff"}</p>
                      </div>
                      <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{employee.department || "HR"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
    }
  }

  // Show loading spinner if data is still loading on dashboard
  if (loading && activeModule === "dashboard") {
    return <GearLoadingSpinner isDarkMode={isDarkMode} />
  }

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
        : "bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {activeModule !== "dashboard" && (
            <button
              onClick={() => setActiveModule("dashboard")}
              className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-gray-200"
                  : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
              }`}
            >
              ←
            </button>
          )}
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${textPrimaryClass}`}>👥 Human Resources</h1>
            <p className={textSecondaryClass}>Welcome back, {user?.username}!</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-yellow-400"
                : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
            }`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={logout}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-600 hover:bg-slate-700 text-white"
            }`}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Error State */}
        {error && activeModule === "dashboard" && (
          <div className={`backdrop-blur-sm border rounded-lg p-4 transition-all duration-300 ${
            isDarkMode 
              ? "bg-red-950/50 border-red-800/60 text-red-300" 
              : "bg-red-100/80 border-red-300 text-red-700"
          }`}>
            <p className="font-medium">Error: {error}</p>
            <button 
              onClick={fetchHRData} 
              className={`mt-2 hover:underline font-medium ${isDarkMode ? "text-red-300" : "text-red-600"}`}
            >
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