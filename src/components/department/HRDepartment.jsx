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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className={`backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-sm sm:text-lg font-semibold mb-1 sm:mb-2 ${textPrimaryClass}`}>Total Employees</h3>
                <p className={`text-xl sm:text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-slate-700"}`}>{stats.total}</p>
              </div>
              <div className={`backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-sm sm:text-lg font-semibold mb-1 sm:mb-2 ${textPrimaryClass}`}>New Hires</h3>
                <p className={`text-xl sm:text-3xl font-bold ${isDarkMode ? "text-green-400" : "text-gray-700"}`}>{stats.newHires}</p>
              </div>
              <div className={`col-span-2 sm:col-span-1 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h3 className={`text-sm sm:text-lg font-semibold mb-1 sm:mb-2 ${textPrimaryClass}`}>Open Positions</h3>
                <p className={`text-xl sm:text-3xl font-bold ${isDarkMode ? "text-orange-400" : "text-stone-700"}`}>{stats.openPositions}</p>
              </div>
            </div>

            {/* HR Modules */}
            <div className={`backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
              <h2 className={`text-lg sm:text-xl font-semibold mb-4 sm:mb-6 ${textPrimaryClass}`}>HR Management Modules</h2>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
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
                    className={`rounded-lg p-3 sm:p-4 border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                      isDarkMode 
                        ? "bg-gray-700/50 border-gray-600/40 hover:bg-gray-700/70" 
                        : "bg-white/30 border-white/20 hover:bg-white/40"
                    }`}
                  >
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{module.icon}</div>
                    <h3 className={`font-medium text-sm sm:text-base mb-0.5 sm:mb-1 ${textPrimaryClass}`}>{module.name}</h3>
                    <p className={`text-xs sm:text-sm ${textSecondaryClass} line-clamp-2`}>{module.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee List */}
            {employees.length > 0 && (
              <div className={`backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 ${cardClass}`}>
                <h2 className={`text-lg sm:text-xl font-semibold mb-4 sm:mb-6 ${textPrimaryClass}`}>Recent Employees</h2>
                <div className="space-y-2 sm:space-y-3">
                  {employees.slice(0, 5).map((employee, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-2 sm:p-3 rounded-lg border transition-all duration-300 ${
                        isDarkMode 
                          ? "bg-gray-700/40 border-gray-600/40 hover:bg-gray-700/60" 
                          : "bg-white/30 border-white/20 hover:bg-white/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-sm sm:text-base truncate ${textPrimaryClass}`}>
                          {employee.name || `Employee ${index + 1}`}
                        </p>
                        <p className={`text-xs sm:text-sm truncate ${textSecondaryClass}`}>{employee.position || "Staff"}</p>
                      </div>
                      <span className={`text-xs sm:text-sm ml-2 flex-shrink-0 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{employee.department || "HR"}</span>
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

  // Bottom nav items for mobile
  const bottomNavItems = [
    { name: "Home", icon: "🏠", action: "dashboard" },
    { name: "Employees", icon: "📋", action: "employees" },
    { name: "Add", icon: "➕", action: "recruitment" },
    { name: "Attendance", icon: "⏰", action: "attendance" },
    { name: "Announce", icon: "📣", action: "announce" },
  ]

  return (
    <div className={`min-h-screen pb-16 sm:pb-0 p-4 sm:p-8 transition-colors duration-300 ${
      isDarkMode
        ? "bg-linear-to-br from-gray-950 via-gray-900 to-gray-950"
        : "bg-linear-to-br from-gray-50 via-slate-50 to-stone-50"
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          {activeModule !== "dashboard" && (
            <button
              onClick={() => setActiveModule("dashboard")}
              className={`hidden sm:block p-1.5 sm:p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                isDarkMode
                  ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-gray-200"
                  : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
              }`}
            >
              ←
            </button>
          )}
          <div>
            <h1 className={`text-xl sm:text-3xl font-bold mb-1 sm:mb-2 ${textPrimaryClass}`}>👥 Human Resources</h1>
            <p className={`text-sm sm:text-base ${textSecondaryClass}`}>Welcome back, {user?.name}!</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 self-end sm:self-auto">
          <button
            onClick={toggleDarkMode}
            className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80 text-yellow-400"
                : "bg-white/20 border-white/30 hover:bg-white/30 text-gray-700"
            }`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={logout}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors duration-200 ${
              isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-600 hover:bg-slate-700 text-white"
            }`}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 sm:hidden border-t backdrop-blur-lg z-50 ${
        isDarkMode
          ? "bg-gray-900/95 border-gray-700/50"
          : "bg-white/95 border-gray-200"
      }`}>
        <div className="flex justify-around items-center h-16 px-2">
          {bottomNavItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleModuleClick(item.action)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all duration-200 ${
                activeModule === item.action
                  ? isDarkMode
                    ? "text-blue-400"
                    : "text-slate-700"
                  : isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className={`text-xl mb-0.5 ${activeModule === item.action ? "scale-110" : ""} transition-transform`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${activeModule === item.action ? "font-semibold" : ""}`}>
                {item.name}
              </span>
              {activeModule === item.action && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                  isDarkMode ? "bg-blue-400" : "bg-slate-600"
                }`} />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default HRDepartment