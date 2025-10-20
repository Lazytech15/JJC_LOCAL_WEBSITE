import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import apiService from "../utils/api/api-service"
import GearLoadingSpinner from "../../public/LoadingGear"
import LandingGalleryManager from "./admin/ImageManagement"

const departments = [
  { id: "hr", name: "Human Resource", icon: "👥", color: "slate", route: "/jjcewgsaccess/hr" },
  { id: "operations", name: "Operations", icon: "⚙️", color: "gray", route: "/jjcewgsaccess/operations" },
  { id: "finance-payroll", name: "Finance and Payroll", icon: "💰", color: "stone", route: "/jjcewgsaccess/finance" },
  { id: "procurement", name: "Procurement", icon: "📋", color: "zinc", route: "/jjcewgsaccess/procurement" },
  { id: "engineering", name: "Engineering", icon: "🔧", color: "neutral", route: "/jjcewgsaccess/engineering" },
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
      const result = await apiService.employees.getEmployees({
        limit: 100,
        offset: 0
      })

      console.log(result)

      if (result.success) {
        const employees = result.employees || []
        const stats = result.statistics || {}
        
        const totalUsers = employees.length
        const activeUsers = employees.filter(emp => emp.status === 'Active').length
        
        const deptGroups = employees.reduce((acc, emp) => {
          const dept = emp.department || 'Unknown'
          if (!acc[dept]) acc[dept] = []
          acc[dept].push(emp)
          return acc
        }, {})

        const deptData = {}
        departments.forEach(dept => {
          const deptName = getDepartmentNameFromId(dept.id)
          const deptEmployees = deptGroups[deptName] || []
          deptData[dept.id] = {
            employees: deptEmployees.length,
            activeEmployees: deptEmployees.filter(e => e.status === 'Active').length,
            departments: result.departments?.length || 0
          }
        })

        setSystemStats({
          totalUsers,
          activeSessions: activeUsers,
          totalDepartments: result.departments?.length || 5,
          systemHealth: totalUsers > 0 ? "Good" : "Warning",
        })
        
        setDepartmentData(deptData)
        
        const formattedUsers = employees.slice(0, 10).map(emp => ({
          id: emp.uid || emp.id,
          name: emp.fullName,
          department: emp.department || 'N/A',
          status: emp.status || 'Active',
          lastLogin: emp.last_login || emp.lastLogin || 'N/A',
          accessLevel: emp.access_level || emp.accessLevel || 'user'
        }))
        
        setUsers(formattedUsers)
      }
    } catch (error) {
      console.error('Error fetching system data:', error)
      setSystemStats({
        totalUsers: 47,
        activeSessions: 12,
        totalDepartments: 5,
        systemHealth: "Good",
      })
      setDepartmentData({
        hr: { employees: 156, activeEmployees: 145 },
        operations: { employees: 89, activeEmployees: 78 },
        "finance-payroll": { employees: 45, activeEmployees: 43 },
        procurement: { employees: 67, activeEmployees: 62 },
        engineering: { employees: 34, activeEmployees: 31 },
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

  const getDepartmentNameFromId = (id) => {
    const mapping = {
      'hr': 'Human Resources',
      'operations': 'Operations',
      'finance-payroll': 'Finance',
      'procurement': 'Procurement',
      'engineering': 'Engineering'
    }
    return mapping[id] || id
  }

  const navigateToDepartment = (route) => {
    navigate(route)
  }

  const handleLogout = () => {
    logout()
    navigate("/jjcewgsaccess")
  }

  const StatCard = ({ title, value, icon, color = "red" }) => (
    <div
      className={`backdrop-blur-md rounded-xl p-6 border transition-all duration-300 ${
        isDarkMode
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-white/60 border-white/40 hover:bg-white/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
            {value}
          </p>
        </div>
        <div className="text-3xl opacity-70">{icon}</div>
      </div>
    </div>
  )

  const DepartmentCard = ({ dept, data }) => (
    <div
      onClick={() => navigateToDepartment(dept.route)}
      className={`backdrop-blur-md rounded-xl p-6 border transition-all duration-300 cursor-pointer group ${
        isDarkMode
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-white/60 border-white/40 hover:bg-white/80"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{dept.icon}</span>
          <h3 className={`font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
            {dept.name}
          </h3>
        </div>
        <span className={`transition-colors ${
          isDarkMode 
            ? "text-gray-400 group-hover:text-gray-200" 
            : "text-gray-500 group-hover:text-gray-700"
        }`}>
          →
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {data ? (
          <>
            <div className="flex justify-between">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Total Employees:</span>
              <span className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                {data.employees || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Active Employees:</span>
              <span className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                {data.activeEmployees || 0}
              </span>
            </div>
          </>
        ) : (
          <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            Click to access department
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900"
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
      }`}>
        <GearLoadingSpinner isDarkMode={isDarkMode} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
        : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
    }`}>
      {/* Header */}
      <div className={`backdrop-blur-md border-b transition-colors duration-300 ${
        isDarkMode
          ? "bg-black/20 border-white/10"
          : "bg-white/40 border-white/30"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`rounded-full p-3 ${
                isDarkMode
                  ? "bg-gradient-to-br from-red-700 to-red-900"
                  : "bg-gradient-to-br from-red-500 to-red-700"
              }`}>
                <span className="text-white text-xl">👑</span>
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  Super Admin Dashboard
                </h1>
                <div className="flex items-center gap-2">
                  <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                    Welcome back, {user?.name}
                  </p>
                  {user?.isSuperAdmin && user?.department && user?.department !== 'superAdmin' && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isDarkMode
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-purple-500/20 text-purple-700"
                    }`}>
                      🔑 Cross-Department Access from {user?.department}
                    </span>
                  )}
                  {user?.isSuperAdmin && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isDarkMode
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-blue-500/20 text-blue-700"
                    }`}>
                      ⚡ SuperAdmin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg border transition-all duration-300 ${
                  isDarkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white/60 border-white/40 hover:bg-white/80"
                }`}
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

      {/* SuperAdmin Info Banner */}
      {user?.isSuperAdmin && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className={`rounded-xl p-4 border ${
            isDarkMode
              ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30"
              : "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20"
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  SuperAdmin Access Active
                </h3>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  You have full system access and can navigate to any department. Click on any department card below to access their dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className={`flex space-x-1 mb-8 backdrop-blur-md rounded-xl p-1 border ${
          isDarkMode
            ? "bg-white/5 border-white/10"
            : "bg-white/60 border-white/40"
        }`}>
          {[
            { id: "overview", name: "System Overview", icon: "📊" },
            { id: "departments", name: "Departments", icon: "🏢" },
            { id: "users", name: "User Management", icon: "👥" },
            { id: "gallery", name: "Media Manager", icon: "🖼️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-lg"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-white/10"
                    : "text-gray-600 hover:bg-white/50"
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
              <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                Department Access
              </h2>
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
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
              Department Management
            </h2>
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
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                User Management
              </h2>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200">
                Add New User
              </button>
            </div>
            <div className={`backdrop-blur-md rounded-xl border overflow-hidden ${
              isDarkMode
                ? "bg-white/5 border-white/10"
                : "bg-white/60 border-white/40"
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDarkMode ? "bg-white/5" : "bg-white/40"}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Name
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Department
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Access Level
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-white/10" : "divide-gray-200"}`}>
                    {users.map((user, index) => (
                      <tr 
                        key={user.id || `user-${index}`} 
                        className={isDarkMode ? "hover:bg-white/5" : "hover:bg-white/40"}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {user.name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {user.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.status === "Active"
                                ? isDarkMode
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-green-100 text-green-800"
                                : isDarkMode
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {user.accessLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className={`mr-3 ${
                            isDarkMode
                              ? "text-red-400 hover:text-red-300"
                              : "text-red-600 hover:text-red-800"
                          }`}>
                            Edit
                          </button>
                          <button className={isDarkMode
                            ? "text-gray-400 hover:text-gray-300"
                            : "text-gray-600 hover:text-gray-800"
                          }>
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

        {activeTab === "gallery" && (
          <div>
            <LandingGalleryManager isDarkMode={isDarkMode} />
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard