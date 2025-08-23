"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../App"

const departments = [
  { id: "hr", name: "Human Resource", icon: "👥", color: "slate" },
  { id: "operations", name: "Operations", icon: "⚙️", color: "gray" },
  { id: "finance-payroll", name: "Finance and Payroll", icon: "💰", color: "stone" },
  { id: "procurement", name: "Procurement", icon: "📋", color: "zinc" },
  { id: "engineering", name: "Engineering", icon: "🔧", color: "neutral" },
]

function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    totalDepartments: 5,
    systemHealth: "Good",
  })
  const [departmentData, setDepartmentData] = useState({})
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSystemData()
  }, [])

  const fetchSystemData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${window.location.origin}/api/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: "super-admin",
          action: "get-system-overview",
          data: {},
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSystemStats(data.stats || systemStats)
        setDepartmentData(data.departments || {})
        setUsers(data.users || [])
      }
    } catch (error) {
      // Fallback demo data
      setSystemStats({
        totalUsers: 47,
        activeSessions: 12,
        totalDepartments: 5,
        systemHealth: "Good",
      })
      setDepartmentData({
        hr: { employees: 156, activeProjects: 8 },
        operations: { workflows: 23, completedTasks: 89 },
        "finance-payroll": { budget: 2500000, transactions: 234 },
        procurement: { suppliers: 45, contracts: 67 },
        engineering: { projects: 12, infrastructure: 34 },
      })
      setUsers([
        { id: 1, name: "Juan Dela Cruz", department: "HR", status: "Active", lastLogin: "2024-01-15" },
        { id: 2, name: "Maria Santos", department: "Finance", status: "Active", lastLogin: "2024-01-15" },
        { id: 3, name: "Pedro Garcia", department: "Operations", status: "Inactive", lastLogin: "2024-01-10" },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToDepartment = (departmentId) => {
    navigate(`/${departmentId}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const StatCard = ({ title, value, icon, color = "red" }) => (
    <div
      className={`bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/20 dark:border-gray-700/20 hover:bg-white/15 dark:hover:bg-black/25 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">{value}</p>
        </div>
        <div className={`text-3xl opacity-70`}>{icon}</div>
      </div>
    </div>
  )

  const DepartmentCard = ({ dept, data }) => (
    <div
      onClick={() => navigateToDepartment(dept.id)}
      className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/20 dark:border-gray-700/20 hover:bg-white/15 dark:hover:bg-black/25 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{dept.icon}</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{dept.name}</h3>
        </div>
        <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          →
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {data &&
          Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {typeof value === "number" && key.includes("budget") ? `₱${value.toLocaleString()}` : value}
              </span>
            </div>
          ))}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-slate-900 dark:to-stone-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-slate-900 dark:to-stone-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-white/20 dark:border-gray-700/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-full p-3">
                <span className="text-white text-xl">👑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Super Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Welcome back, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-white/10 dark:bg-black/20 border border-white/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-gray-700/20">
          {[
            { id: "overview", name: "System Overview", icon: "📊" },
            { id: "departments", name: "Departments", icon: "🏢" },
            { id: "users", name: "User Management", icon: "👥" },
            { id: "settings", name: "System Settings", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-black/20"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Users" value={systemStats.totalUsers} icon="👥" />
              <StatCard title="Active Sessions" value={systemStats.activeSessions} icon="🟢" />
              <StatCard title="Departments" value={systemStats.totalDepartments} icon="🏢" />
              <StatCard title="System Health" value={systemStats.systemHealth} icon="💚" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">Department Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                  <DepartmentCard key={dept.id} dept={dept} data={departmentData[dept.id]} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "departments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Department Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <DepartmentCard key={dept.id} dept={dept} data={departmentData[dept.id]} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">User Management</h2>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200">
                Add New User
              </button>
            </div>
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 dark:bg-black/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-gray-700/20">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 dark:hover:bg-black/10">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {user.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.status === "Active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {user.lastLogin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mr-3">
                            Edit
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">System Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Two-Factor Authentication</span>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                      Enabled
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Session Timeout</span>
                    <span className="text-gray-800 dark:text-gray-200">30 minutes</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">System Maintenance</h3>
                <div className="space-y-4">
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors duration-200">
                    Backup Database
                  </button>
                  <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition-colors duration-200">
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard
