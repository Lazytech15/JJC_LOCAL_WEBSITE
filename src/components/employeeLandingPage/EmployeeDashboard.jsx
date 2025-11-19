import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Home, Bell, User, Clock, BarChart3, Moon, Sun, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "../ui/UiComponents"
import { Avatar, AvatarFallback } from "../ui/UiComponents"
import { Badge } from "../ui/UiComponents"
import { useAuth } from "../../contexts/AuthContext"
import { DEPARTMENT_SLUG_MAP } from "../../contexts/AuthContext"
import { useOnlineStatus } from "../../hooks/use-online-status"
import { useServiceWorker } from "../../hooks/use-service-worker"
import { getStoredToken, verifyToken, clearTokens, storeTokens } from "../../utils/auth"
import logo from "../../assets/companyLogo.jpg"
import apiService from "../../utils/api/api-service"
import GearLoadingSpinner from "../../../public/LoadingGear"
// Import the components
import DashboardHome from "./DashboardComponents/DashboardHome"
import Announcements from "./DashboardComponents/Announcements"
import TimeAttendance from "./DashboardComponents/TimeAttendance"
import Performance from "./DashboardComponents/Performance"
import Profile from "./DashboardComponents/Profile"
import { StatusWarningModal, StatusWarningBanner } from "../ui/StatusIndicator"

// Centralized department routes and normalization
const DEPARTMENT_BASE_URL = import.meta.env.VITE_DEPT_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")
const DEPARTMENT_BASE_PATH = import.meta.env.VITE_DEPT_BASE_PATH || "/jjcewgsaccess"

function buildDeptUrl(slug) {
  const base = (DEPARTMENT_BASE_URL || "").replace(/\/+$/, "")
  const path = (DEPARTMENT_BASE_PATH || "").replace(/^\/+/, "").replace(/\/+$/, "")
  return `${base}/${path}/${slug}`
}

const DEPARTMENT_ROUTES = {
  procurement: { label: "Procurement", url: buildDeptUrl("procurement") },
  operations: { label: "Operations", url: buildDeptUrl("operations") },
  hr: { label: "Human Resource", url: buildDeptUrl("hr") },
}

function normalizeDepartmentName(dep) {
  if (!dep || typeof dep !== "string") return null
  const lower = dep.toLowerCase().trim()

  // Direct matches to slugs
  if (DEPARTMENT_ROUTES[lower]) return lower

  // Match by known names from AuthContext mapping (name -> slug)
  for (const [name, slug] of Object.entries(DEPARTMENT_SLUG_MAP)) {
    if (lower === name.toLowerCase()) {
      if (DEPARTMENT_ROUTES[slug]) return slug
    }
  }

  // Heuristics for common variants
  if (lower.includes("proc")) return "procurement"
  if (lower.includes("oper")) return "operations"
  if (lower === "hr" || lower.includes("human")) return "hr"

  return null
}

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
  const [dailySummaries, setDailySummaries] = useState([])
  const [profileImage, setProfileImage] = useState(null)

  const profileMenuRef = useRef(null)

  const [showStatusModal, setShowStatusModal] = useState(true)

  const navigate = useNavigate()
  const { employee, employeeLogout, isDarkMode, toggleDarkMode } = useAuth()
  const { isOnline, connectionQuality } = useOnlineStatus()
  const { updateAvailable, updateServiceWorker } = useServiceWorker()
  
  // Resolve department-based navigation via normalization
  const rawDepartment = employeeData?.department || employee?.department || ""
  const normalizedDept = normalizeDepartmentName(rawDepartment)
  const deptRoute = normalizedDept ? DEPARTMENT_ROUTES[normalizedDept] : null

  const unreadCount = Array.isArray(announcements) ? announcements.filter((a) => !a.read).length : 0

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Check for auto-login from department pages via URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const autoLogin = urlParams.get('autoLogin')
        const tokenParam = urlParams.get('token')
        const usernameParam = urlParams.get('username')
        const tabParam = urlParams.get('tab')

        let token = null
        
        if (autoLogin === 'true' && tokenParam) {
          console.log('[EmployeeDashboard] Auto-login detected from URL')
          // Decode and use the token from URL
          token = decodeURIComponent(tokenParam)
          
          // Store the token
          storeTokens(token, true) // true for employee token
          
          // Set the active tab if provided
          if (tabParam) {
            setActiveTab(tabParam)
          }
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          // Get token from storage
          token = getStoredToken()
        }
        
        if (!token) {
          console.warn("No token found")
          setLoading(false)
          setError("Please log in to continue")
          return
        }

        const payload = verifyToken(token)
        console.log("[v0] Token payload:", payload)

        if (!payload || !payload.username) {
          console.warn("Invalid token payload")
          clearTokens()
          setLoading(false)
          setError("Session expired. Please log in again.")
          return
        }

        // Try multiple fields for user ID
        const uid = payload.userId || payload.id || payload.uid
        console.log("[v0] Using UID from token:", uid)

        if (!uid) {
          setLoading(false)
          setError("Invalid session: No user ID found")
          return
        }

        let foundEmployee = null
          try {
            // Fetch current employee data (bypasses status filter)
            const res = await apiService.employees.getCurrentEmployeeData(uid)
            if (res?.success && res?.employee) {
              foundEmployee = res.employee
              console.log("[v0] Found current employee:", foundEmployee)
            } else {
              // Fallback to old method if new method fails
              const fallbackRes = await apiService.employees.getEmployees({ 
                employeeUid: uid,
                includeAllStatuses: 'true',
                limit: 1 
              })
              if (fallbackRes?.employees?.[0]) {
                foundEmployee = fallbackRes.employees[0]
              }
            }
          } catch (err) {
            console.error("Fetch employee failed:", err)
          }

        if (!foundEmployee) {
          foundEmployee = {
            id: uid,
            employee_uid: uid,
            username: payload.username,
            name: payload.name,
            department: payload.department,
            role: payload.role,
            access_level: payload.accessLevel || payload.access_level || 'user',
          }
        }

        console.log("[v0] Found employee:", foundEmployee)
        console.log("[v0] Employee access_level:", foundEmployee.access_level)
        setEmployeeData(foundEmployee)

        // Fetch all records and filter by current user
        const [summaryResponse, attendanceResponse, profilePictureResponse, documentsResponse, announcementsResponse] =
          await Promise.allSettled([
            apiService.summary.getDailySummaryRecords({
              limit: 1000,
              offset: 0
            }),
            apiService.attendance.getAttendanceRecords({
              limit: 1000,
              offset: 0
            }),
            apiService.profiles.getProfileByUid(uid),
            apiService.document.getEmployeeDocuments(uid),
            apiService.announcements.getAnnouncements({
              limit: 1000,
              offset: 0
            }),
          ])

        console.log("API Responses:", {
          summary: summaryResponse,
          attendance: attendanceResponse,
          profilePicture: profilePictureResponse,
          documents: documentsResponse,
          announcements: announcementsResponse,
          employee: foundEmployee,
        })

        // Process summaries - filter by current user's UID
        if (summaryResponse.status === "fulfilled") {
          const allSummaries = summaryResponse.value?.data || []
          const userSummaries = allSummaries.filter(s => s.employee_uid === uid)

          console.log("[v0] Filtered summaries for user:", userSummaries.length, "out of", allSummaries.length)
          setDailySummaries(userSummaries)
        } else {
          console.error("Summary fetch failed:", summaryResponse.reason)
          setDailySummaries([])
        }

        // Process attendance - filter by current user's UID
        if (attendanceResponse.status === "fulfilled") {
          const allAttendance = attendanceResponse.value?.data || []
          const userAttendance = allAttendance.filter(record => record.employee_uid === uid)

          console.log("[v0] Filtered attendance for user:", userAttendance.length, "out of", allAttendance.length)
          setAttendanceData({
            ...attendanceResponse.value,
            data: userAttendance
          })
        } else {
          console.error("Attendance fetch failed:", attendanceResponse.reason)
        }

        // Process profile picture
        if (profilePictureResponse.status === "fulfilled") {
          const profileResult = profilePictureResponse.value
          if (profileResult.success && profileResult.url) {
            setProfileImage(profileResult.url)
            console.log("Profile picture loaded:", profileResult.url)
          } else {
            console.log("No profile picture available")
          }
        } else {
          console.error("Profile picture fetch failed:", profilePictureResponse.reason)
        }

        // Process documents
        if (documentsResponse.status === "fulfilled") {
          setDocumentData(documentsResponse.value)
        } else {
          console.error("Documents fetch failed:", documentsResponse.reason)
        }

        // Process announcements from API
        if (announcementsResponse.status === "fulfilled") {
          const announcementData = announcementsResponse.value?.data || announcementsResponse.value || []
          const announcements_array = Array.isArray(announcementData) ? announcementData : []
          console.log("[v0] Fetched announcements:", announcements_array.length)
          setAnnouncements(announcements_array)
        } else {
          console.error("Announcements fetch failed:", announcementsResponse.reason)
          setAnnouncements([])
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data")
      } finally {
        console.log("Finished loading dashboard data")
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

  const handleDepartmentAccess = async () => {
    if (!deptRoute) return

    // Check if user is admin
    if (employeeData?.access_level !== 'admin' && employee?.access_level !== 'admin') {
      setError("Access denied. Only administrators can access department pages.")
      setTimeout(() => setError(null), 5000)
      return
    }

    try {
      // Get current token
      const token = getStoredToken()
      if (!token) {
        console.error("No authentication token found")
        setError("Authentication token not found. Please log in again.")
        return
      }

      const payload = verifyToken(token)
      if (!payload) {
        console.error("Invalid token")
        setError("Invalid session. Please log in again.")
        return
      }

      console.log("[DepartmentAccess] Token payload:", payload)
      console.log("[DepartmentAccess] Employee data:", employeeData)
      console.log("[DepartmentAccess] Target department:", rawDepartment)

      // Encode token for URL parameter (safe for cross-domain)
      const encodedToken = encodeURIComponent(token)
      const username = payload.username || employee?.username || employeeData?.username
      
      // Build URL with token parameter for auto-login
      const urlWithAuth = `${deptRoute.url}?autoLogin=true&token=${encodedToken}&username=${encodeURIComponent(username)}&loginType=employee`
      
      console.log("[DepartmentAccess] Navigating to:", deptRoute.url)
      
      // Navigate to department page with auth params
      window.location.href = urlWithAuth
    } catch (error) {
      console.error("Error accessing department:", error)
      setError("Failed to access department. Please try again.")
    }
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
      <GearLoadingSpinner isDarkMode={isDarkMode} />
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
      {error && <div className="bg-red-500 text-white px-4 py-3 text-center text-sm">{error}</div>}

      <StatusWarningBanner 
        status={employeeData?.status} 
        isDarkMode={isDarkMode}
      />

      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-lg`}
      >
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={logo || "/placeholder.svg"}
                alt="JJC Engineering Works Logo"
                className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
              />
              <div className={`hidden md:flex justify-center text-white drop-shadow-lg`}>
                <div className="flex gap-2 text-center items-center">
                  <h1
                    className={`text-5xl font-extrabold califoniaFont tracking-wide ${isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                      }`}
                  >
                    JJC
                  </h1>
                  <div className="text-left mt-2">
                    <p
                      className={`text-sm font-semibold uppercase califoniaFont leading-tight ${isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      Engineering Works
                    </p>
                    <hr className="border-white/70" />
                    <p
                      className={`text-sm califoniaFont font-semibold uppercase text-white ${isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      & General Services
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Desktop Navigation */}
            <div className="hidden lg:block border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}">
              <div className="flex items-center justify-center py-3">
                <nav
                  className={`inline-flex items-center gap-1 p-1 rounded-xl ${isDarkMode ? "bg-zinc-800" : "bg-zinc-200"}`}
                >
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
                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="focus:outline-none">
                  <Avatar
                    className={`w-9 h-9 ring-2 cursor-pointer hover:ring-4 transition-all ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage || "/placeholder.svg"}
                        alt={employee?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback
                        className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}
                      >
                        {employee?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div
                    className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                      }`}
                  >
                    <div className={`p-4 border-b ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                      <div className="flex items-center gap-3">
                        <Avatar className={`w-12 h-12 ring-2 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                          {profileImage ? (
                            <img
                              src={profileImage || "/placeholder.svg"}
                              alt={employee?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <AvatarFallback
                              className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}
                            >
                              {employee?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          )}
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
                          navigate("/jjctoolbox")
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-100 text-zinc-700"
                          }`}
                      >
                        <span className="text-sm font-medium">Go To Toolbox</span>
                      </button>
                      
                      {/* Department Access - Only for admins with department assignment */}
                      {deptRoute && (employeeData?.access_level === 'admin' || employee?.access_level === 'admin') && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            handleDepartmentAccess()
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                        >
                          <span className="text-sm font-medium">{`Go to ${deptRoute.label}`}</span>
                        </button>
                      )}
                      
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
            dailySummaries={dailySummaries}
            documentData={documentData}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "announcements" && (
          <Announcements
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "profile" && (
          <Profile
            employee={employee}
            employeeData={employeeData}
            profileData={profileData}
            profileImage={profileImage}
            documentData={documentData}
            handleLogout={handleLogout}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "attendance" && <TimeAttendance dailySummaries={dailySummaries} isDarkMode={isDarkMode} />}

        {activeTab === "performance" && (
          <Performance
            dailySummaries={dailySummaries}
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
                      ? isDarkMode
                        ? "text-white"
                        : "text-zinc-900"
                      : isDarkMode
                        ? "text-zinc-500"
                        : "text-zinc-400"
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
                    ? isDarkMode
                      ? "text-white"
                      : "text-zinc-900"
                    : isDarkMode
                      ? "text-zinc-500"
                      : "text-zinc-400"
                    }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full ${isDarkMode ? "bg-white" : "bg-zinc-900"
                      }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
      {showStatusModal && employeeData?.status && 
        employeeData.status.toLowerCase() !== 'active' && (
          <StatusWarningModal
            status={employeeData?.status}
            isDarkMode={isDarkMode}
            onClose={() => setShowStatusModal(false)}
          />
        )}
    </div>
  )
}