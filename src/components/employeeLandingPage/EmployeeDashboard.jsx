import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Home,
  Bell,
  User,
  Clock,
  BarChart3,
  Moon,
  Sun,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { Button } from "../ui/UiComponents"
import { Avatar, AvatarFallback } from "../ui/UiComponents"
import { Badge } from "../ui/UiComponents"
import { useAuth } from "../../contexts/AuthContext"
import { useOnlineStatus } from "../../hooks/use-online-status"
import { useServiceWorker } from "../../hooks/use-service-worker"
import { getStoredToken, verifyToken, clearTokens } from "../../utils/auth"
import logo from "../../assets/companyLogo.jpg"
import apiService from "../../utils/api/api-service"

// Import the components
import DashboardHome from "./DashboardComponents/DashboardHome"
import Announcements from "./DashboardComponents/Announcements"
import TimeAttendance from "./DashboardComponents/TimeAttendance"
import Performance from "./DashboardComponents/Performance"
import Profile from "./DashboardComponents/Profile"

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Data states
  const [announcements, setAnnouncements] = useState([])
  const [attendanceData, setAttendanceData] = useState(null)
  const [performanceData, setPerformanceData] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [documentData, setDocumentData] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)

  const profileMenuRef = useRef(null)

  const navigate = useNavigate()
  const { employee, employeeLogout, isDarkMode, toggleDarkMode } = useAuth()
  const { isOnline, connectionQuality } = useOnlineStatus()
  const { updateAvailable, updateServiceWorker } = useServiceWorker()

  const unreadCount = announcements.filter((a) => !a.read).length
// Replace the entire fetchDashboardData function (lines 56-161) with this:

useEffect(() => {
  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get token and decode to find employee
      const token = getStoredToken()
      if (!token) {
        console.warn('No token found')
        setLoading(false)
        setError('Please log in to continue')
        return
      }

      const payload = verifyToken(token)
      console.log('Token payload:', payload)

      if (!payload || !payload.username) {
        console.warn('Invalid token payload')
        clearTokens()
        setLoading(false)
        setError('Session expired. Please log in again.')
        return
      }

      // First, fetch employee data by username to get the ID
      console.log('Fetching employee by username:', payload.username)
      const employeesResponse = await apiService.employees.getEmployees({
        search: payload.username,
        limit: 1
      })

      console.log('Employees search response:', employeesResponse)

      // Check for employees in the response (API returns employees directly, not nested under data)
      if (!employeesResponse?.employees || employeesResponse.employees.length === 0) {
        setLoading(false)
        setError('Employee not found')
        return
      }

      const foundEmployee = employeesResponse.employees[0]
      // Use 'id' as UID since that's what the API returns
      const uid = foundEmployee.id
      
      console.log('Found employee ID:', uid)
      setEmployeeData(foundEmployee)

      // Now fetch all related data using the ID
      const [
        summaryResponse,
        attendanceResponse,
        profileResponse,
        documentsResponse
      ] = await 
      Promise.allSettled([
        // apiService.summary.getEmployeeSummaries({
        //   uid: uid,
        //   limit: 10
        // }),
        apiService.attendance.getEmployeeAttendance(uid, {
          limit: 30
        }),
        apiService.profiles.getProfileByUid(uid),
        apiService.document.getEmployeeDocuments(uid)
      ])

      console.log('API Responses:', {
        // summary: summaryResponse,
        attendance: attendanceResponse,
        profile: profileResponse,
        documents: documentsResponse
      })

      // Process summaries/announcements
      // if (summaryResponse.status === 'fulfilled') {
      //   const summaries = summaryResponse.value?.data || []
      //   setAnnouncements(summaries.map((s, idx) => ({
      //     id: s.summary_id || idx,
      //     title: s.task_description || s.notes || 'Daily Summary',
      //     time: new Date(s.date).toLocaleDateString(),
      //     read: false,
      //     fullData: s
      //   })))
      // } else {
      //   console.error('Summary fetch failed:', summaryResponse.reason)
      // }

      // Process attendance
      if (attendanceResponse.status === 'fulfilled') {
        setAttendanceData(attendanceResponse.value)
      } else {
        console.error('Attendance fetch failed:', attendanceResponse.reason)
      }

      // Process profile
      if (profileResponse.status === 'fulfilled') {
        setProfileData(profileResponse.value)
      } else {
        console.error('Profile fetch failed:', profileResponse.reason)
      }

      // Process documents
      // if (documentsResponse.status === 'fulfilled') {
      //   setDocumentData(documentsResponse.value)
      // } else {
      //   console.error('Documents fetch failed:', documentsResponse.reason)
      // }

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      console.log('Finished loading dashboard data')
      setLoading(false)
    }
  }

  fetchDashboardData()
}, []) // Run once on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showProfileMenu])

  const handleLogout = () => {
    clearTokens()
    sessionStorage.clear()
    if (employeeLogout) {
      employeeLogout()
    }
    navigate("/employee/login", { replace: true })
  }

  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "announcements", icon: Bell, label: "Announcements", badge: unreadCount },
    { id: "attendance", icon: Clock, label: "Attendance" },
    { id: "performance", icon: BarChart3, label: "Performance" },
    { id: "profile", icon: User, label: "Profile" },
  ]

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-zinc-950" : "bg-zinc-50"}`}>
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDarkMode ? "text-white" : "text-zinc-900"}`} />
          <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen pb-20 lg:pb-0 ${isDarkMode ? "bg-zinc-950" : "bg-zinc-50"}`}>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="bg-zinc-900 text-white px-4 py-3 text-center text-sm">
          <span>A new version is available. </span>
          <button onClick={updateServiceWorker} className="underline font-semibold">
            Update now
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500 text-white px-4 py-3 text-center text-sm">
          {error}
        </div>
      )}

      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-lg ${isDarkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-zinc-200"
          }`}
      >
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="JJC Engineering Works Logo"
                className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
              />
              <h1 className={`text-lg font-bold hidden sm:block ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                JJC Portal
              </h1>
            </div>

            {/* Centered Desktop Navigation */}
            <div className="hidden lg:block border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}">
              <div className="flex items-center justify-center py-3">
                <nav className={`inline-flex items-center gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${isActive
                            ? "bg-white text-zinc-900 shadow-md"
                            : isDarkMode
                              ? "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-300/50"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {isActive && <span>{item.label}</span>}
                        {isActive && item.badge > 0 && (
                          <Badge className="ml-1 bg-red-500 text-white">{item.badge}</Badge>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <div className="absolute top-7 flex items-center right-44 lg:right-36">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-600" : "bg-red-500"}`}></span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={`relative lg:hidden ${isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                onClick={() => setActiveTab("announcements")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="focus:outline-none"
                >
                  <Avatar className={`w-9 h-9 ring-2 cursor-pointer hover:ring-4 transition-all ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                    <AvatarFallback className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}>
                      {employee?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                    }`}>
                    <div className={`p-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar className={`w-12 h-12 ring-2 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                          <AvatarFallback className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}>
                            {employee?.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                            {employee?.name}
                          </p>
                          <p className={`text-xs truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            {employee?.position}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          setActiveTab("profile")
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-100 text-zinc-700"
                          }`}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">View Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          handleLogout()
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-red-400" : "hover:bg-zinc-100 text-red-600"
                          }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardHome 
            employee={employee}
            employeeData={employeeData}
            announcements={announcements}
            attendanceData={attendanceData}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "announcements" && (
          <Announcements 
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "profile" && (
          <Profile 
            employee={employee}
            employeeData={employeeData}
            profileData={profileData}
            documentData={documentData}
            handleLogout={handleLogout}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "attendance" && (
          <TimeAttendance 
            employee={employee}
            employeeData={employeeData}
            attendanceData={attendanceData}
            isDarkMode={isDarkMode} 
          />
        )}

        {activeTab === "performance" && (
          <Performance 
            employee={employee}
            employeeData={employeeData}
            performanceData={performanceData}
            isDarkMode={isDarkMode} 
          />
        )}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t backdrop-blur-lg ${isDarkMode ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-zinc-200"
          }`}
      >
        <div className="flex items-center justify-around px-2 py-3 safe-area-inset-bottom">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-0 flex-1"
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${isActive
                        ? isDarkMode ? "text-white" : "text-zinc-900"
                        : isDarkMode ? "text-zinc-500" : "text-zinc-400"
                      }`}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium truncate w-full text-center ${isActive
                      ? isDarkMode ? "text-white" : "text-zinc-900"
                      : isDarkMode ? "text-zinc-500" : "text-zinc-400"
                    }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full ${isDarkMode ? "bg-white" : "bg-zinc-900"
                    }`} />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}