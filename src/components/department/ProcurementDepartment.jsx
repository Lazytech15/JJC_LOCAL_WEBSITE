import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect, lazy, Suspense } from "react"
import apiService from "../../utils/api/api-service"
import { getStoredToken, verifyToken } from "../../utils/auth"

// Lazy-load heavy procurement sub-components directly to avoid importing the whole barrel
const AdminDashboard = lazy(() => import("../pd/AdminDashboard"))
const InventoryManagement = lazy(() => import("../pd/inventory/InventoryManagement"))
const PurchaseOrderTracker = lazy(() => import("../pd/purchase-orders/PurchaseOrderTracker"))
const SupplierManagement = lazy(() => import("../pd/SuppliesManagement"))
const EmployeeLogs = lazy(() => import("../pd/EmployeeLogs"))
const ItemDetailView = lazy(() => import("../pd/inventory/ItemDetailView"))
const ToastProvider = lazy(() => import("../pd/shared/ToastNotification"))
const SettingsModal = lazy(() => import("../pd/shared/SettingsModal"))
const NotificationModal = lazy(() => import("../pd/shared/NotificationModal"))

function ProcurementDepartment() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [keyboardNavigated, setKeyboardNavigated] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [showQuickStats, setShowQuickStats] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState(null)
  // Keyboard navigation for tabs
  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: "📊", color: "amber", description: "Overview & Analytics" },
    { key: "inventory", label: "Inventory", icon: "📦", color: "blue", description: "Stock Management" },
    { key: "orders", label: "Purchase Orders", icon: "📋", color: "purple", description: "Order Tracking" },
    { key: "suppliers", label: "Suppliers", icon: "🏢", color: "cyan", description: "Vendor Management" },
    { key: "logs", label: "Employee Logs", icon: "👥", color: "pink", description: "Activity Records" }
  ]

  const handleKeyDown = (event) => {
    const currentIndex = tabs.findIndex(tab => tab.key === activeTab)
    
    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      setKeyboardNavigated(true)
      setActiveTab(tabs[currentIndex - 1].key)
      setTimeout(() => setKeyboardNavigated(false), 300)
    } else if (event.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
      setKeyboardNavigated(true)
      setActiveTab(tabs[currentIndex + 1].key)
      setTimeout(() => setKeyboardNavigated(false), 300)
    } else if (event.key === 'Home') {
      setKeyboardNavigated(true)
      setActiveTab(tabs[0].key)
      setTimeout(() => setKeyboardNavigated(false), 300)
    } else if (event.key === 'End') {
      setKeyboardNavigated(true)
      setActiveTab(tabs[tabs.length - 1].key)
      setTimeout(() => setKeyboardNavigated(false), 300)
    }
  }

  // Get profile picture URL
  const getProfilePictureUrl = (user) => {
    if (!user || !user.id) return null
    
    // Check if we have cached profile data
    if (userProfile && userProfile.id === user.id && userProfile.profilePicture) {
      return userProfile.profilePicture
    }
    
    // Return API endpoint for profile picture
    return apiService.profiles.getProfileUrlByUid(user.id)
  }

  // Load user profile data
  const loadUserProfile = async () => {
    if (!user?.id) return
    
    try {
      const response = await apiService.employees.getEmployee(user.id)
      if (response.success && response.employee) {
        setUserProfile(response.employee)
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  // Load notifications (announcements)
  const loadNotifications = async () => {
    setNotificationsLoading(true)
    setNotificationsError(null)

    try {
      console.log("Loading notifications...")
      console.log("Current user from auth:", user)

      // Get employee ID from token
      const token = getStoredToken()
      if (!token) {
        console.error("No authentication token found")
        setNotificationsError("Authentication required")
        setNotificationsLoading(false)
        return
      }

      console.log("Token found, verifying...")

      const payload = verifyToken(token)
      console.log("Token payload:", payload)
      let uid = payload?.userId

      // Fallback to user.id from auth context if token doesn't have userId
      if (!uid && user?.id) {
        console.log("Using user.id from auth context as fallback:", user.id)
        uid = user.id
      }

      if (!uid) {
        console.error("No user ID found in token or auth context")
        setNotificationsError("Invalid session")
        setNotificationsLoading(false)
        return
      }

      console.log("User ID from token:", uid)

      // Fetch announcements for the employee
      console.log("Fetching announcements from API...")
      const response = await apiService.announcements.getEmployeeAnnouncements(uid)

      console.log("API Response:", response)

      if (response?.data) {
        const formattedAnnouncements = response.data.map((ann) => ({
          id: ann.id,
          title: ann.title || ann.message || "Announcement",
          description: ann.description || ann.content || "",
          time: new Date(ann.created_at || ann.date).toLocaleDateString(),
          read: ann.is_read || ann.read || false,
          priority: ann.priority || "normal",
          fullData: ann,
        }))
        console.log("Formatted announcements:", formattedAnnouncements)
        setNotifications(formattedAnnouncements)
      } else {
        console.log("No data in response")
        setNotifications([])
      }
    } catch (error) {
      console.error("Error fetching announcements:", error)
      setNotificationsError("Failed to load announcements")
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Mark announcement as read
  const markAnnouncementAsRead = async (announcementId) => {
    try {
      // Get employee ID from token
      const token = getStoredToken()
      if (!token) return

      const payload = verifyToken(token)
      let uid = payload?.userId

      // Fallback to user.id from auth context if token doesn't have userId
      if (!uid && user?.id) {
        uid = user.id
      }

      if (!uid) return

      await apiService.announcements.markAnnouncementAsRead(announcementId, uid)

      // Update local state
      setNotifications((prev) =>
        prev.map((ann) =>
          ann.id === announcementId ? { ...ann, read: true } : ann
        )
      )
    } catch (error) {
      console.error('Failed to mark announcement as read:', error)
    }
  }

  // Dismiss notification (remove from list)
  const dismissNotification = async (announcementId) => {
    try {
      // Get employee ID from token
      const token = getStoredToken()
      if (!token) return

      const payload = verifyToken(token)
      let uid = payload?.userId

      // Fallback to user.id from auth context if token doesn't have userId
      if (!uid && user?.id) {
        uid = user.id
      }

      if (!uid) return

      // Call API to delete/dismiss the announcement
      await apiService.announcements.dismissAnnouncement(announcementId, uid)

      // Remove from local state
      setNotifications((prev) =>
        prev.filter((ann) => ann.id !== announcementId)
      )
    } catch (error) {
      console.error('Failed to dismiss announcement:', error)
      // Still remove from UI even if API fails
      setNotifications((prev) =>
        prev.filter((ann) => ann.id !== announcementId)
      )
    }
  }

  // Handle quick stats toggle
  const handleQuickStatsToggle = () => {
    setShowQuickStats(!showQuickStats)
  }

  // Handle notifications (toggle panel)
  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications)
  }

  // Scroll detection for navigation morphing
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
      setShowBackToTop(scrollPosition > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Only handle keyboard navigation when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
        return
      }
      handleKeyDown(event)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTab])

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile()
  }, [user])

  // Load notifications on mount
  useEffect(() => {
    loadNotifications()
  }, [])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu')) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  // Close notifications panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-menu')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  return (
    <ToastProvider>
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-slate-950" : "bg-slate-50"}`}>
      {/* Industrial Background Pattern */}
      <div className={`fixed inset-0 pointer-events-none ${isDarkMode ? "opacity-[0.03]" : "opacity-[0.02]"}`}>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>
      
      <div className="relative z-50">
            <div className={`rounded-lg sm:rounded-xl shadow-xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 border-l-4 relative group mx-2 sm:mx-3 md:mx-4 ${
              isDarkMode 
                ? "bg-slate-800 border-amber-400" 
                : "bg-white border-amber-500"
            }`}>
          {/* Animated Background Pattern */}
          <div className={`absolute inset-0 ${isDarkMode ? "opacity-[0.05]" : "opacity-[0.03]"}`}>
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}/>
          </div>

          {/* Floating Gear Animation - Hidden on mobile */}
          <div className="hidden sm:block absolute top-4 right-4 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500 animate-spin" style={{animationDuration: '8s'}}>
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
            </svg>
          </div>

          <div className="relative flex flex-row justify-between items-center gap-2 sm:gap-4 xl:gap-6 w-full">
            {/* Left Section - Department Info & User Profile */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Department Icon */}
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-colors duration-300 shrink-0 ${
                isDarkMode 
                  ? "bg-amber-500/20 border-amber-500/30" 
                  : "bg-amber-500/20 border-amber-500/30 group-hover:bg-amber-500/30"
              }`}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>

              {/* Department & User Info */}
              <div className="flex-1 min-w-0">
                <h1 className={`text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight truncate ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>
                  Procurement Department
                </h1>
                <p className={`text-[10px] sm:text-xs lg:text-sm font-medium truncate hidden sm:block ${
                  isDarkMode ? "text-amber-400/90" : "text-amber-600"
                }`}>
                  Engineering • Metal Works & Inventory Management
                </p>
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex gap-2 sm:gap-3 items-center justify-end">
              {/* Notifications Button */}
              <div className="relative notifications-menu">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 sm:p-3 rounded-lg backdrop-blur-sm border transition-all duration-300 group/notif relative ${
                    isDarkMode 
                      ? "bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 hover:border-slate-500/50" 
                      : "bg-gray-200 hover:bg-gray-300 border-gray-300 hover:border-gray-400"
                  }`}
                  title="Notifications"
                >
                  <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                    isDarkMode ? "text-slate-300 group-hover/notif:text-white" : "text-gray-700 group-hover/notif:text-gray-900"
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l7-7h10z" />
                  </svg>
                  {/* Notification Badge */}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 flex items-center justify-center ${
                      isDarkMode ? "border-slate-800" : "border-white"
                    }`}>
                      <span className="text-[10px] text-white font-bold">{notifications.filter(n => !n.read).length}</span>
                    </div>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div className={`absolute top-16 left-1/2 transform -translate-x-1/2 w-80 sm:w-96 backdrop-blur-md rounded-lg shadow-2xl border z-9999 max-h-[calc(100vh-6rem)] overflow-y-auto notifications-menu ${
                    isDarkMode ? "bg-slate-800/95 border-slate-700/50" : "bg-white border-slate-200"
                  }`}>
                    <div className="p-4">
                      <div className={`flex items-center justify-between mb-4 pb-3 border-b sticky top-0 backdrop-blur-md z-10 ${
                        isDarkMode ? "border-slate-700/50 bg-slate-800/95" : "border-slate-200 bg-white"
                      }`}>
                        <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Notifications</h3>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => loadNotifications()}
                            disabled={notificationsLoading}
                            className="text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                            title="Refresh notifications"
                          >
                            <svg className={`w-4 h-4 ${notificationsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Loading State */}
                      {notificationsLoading && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className={`animate-spin rounded-full h-8 w-8 border-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"} border-t-amber-500 mx-auto mb-3`}></div>
                            <p className={`${isDarkMode ? "text-slate-400" : "text-slate-500"} text-sm`}>Loading announcements...</p>
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {notificationsError && !notificationsLoading && (
                        <div className={`p-4 rounded-lg border ${isDarkMode ? "border-red-500/30 bg-red-500/10" : "border-red-400/30 bg-red-100/50"} mb-4`}>
                          <div className="flex items-center gap-2">
                            <svg className={`w-5 h-5 ${isDarkMode ? "text-red-400" : "text-red-600"} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className={`${isDarkMode ? "text-red-400" : "text-red-700"} text-sm font-medium`}>{notificationsError}</p>
                          </div>
                          <button 
                            onClick={() => loadNotifications()}
                            className={`mt-2 ${isDarkMode ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"} text-xs underline`}
                          >
                            Try Again
                          </button>
                        </div>
                      )}

                      {/* Notifications List */}
                      {!notificationsLoading && !notificationsError && (
                        <div className="space-y-2">
                          {notifications.length > 0 ? (
                            notifications.map((notification) => (
                              <div 
                                key={notification.id} 
                                className={`group p-3 rounded-lg border transition-all duration-200 ${
                                  notification.read 
                                    ? isDarkMode ? 'bg-slate-800/40 border-slate-700/40' : 'bg-slate-100 border-slate-200'
                                    : isDarkMode ? 'bg-slate-700/50 border-slate-600/50 hover:border-slate-500/50' : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${
                                    notification.priority === 'high' ? 'bg-red-500' :
                                    notification.priority === 'medium' ? 'bg-yellow-500' :
                                    notification.priority === 'low' ? 'bg-green-500' : 'bg-blue-500'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <button
                                        onClick={() => setSelectedNotification(notification)}
                                        className="flex-1 text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <h4 className={`font-medium text-sm line-clamp-2 ${
                                            notification.read ? (isDarkMode ? 'text-slate-400' : 'text-slate-500') : (isDarkMode ? 'text-white' : 'text-slate-900')
                                          }`}>
                                            {notification.title}
                                          </h4>
                                          {notification.read && (
                                            <svg className={`w-4 h-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" transform="translate(4, 0)" />
                                            </svg>
                                          )}
                                        </div>
                                        <p className={`${isDarkMode ? "text-slate-500" : "text-slate-400"} text-xs mt-1`}>{notification.time}</p>
                                      </button>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          dismissNotification(notification.id)
                                        }}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/20 hover:border-red-500/40"
                                        title="Dismiss notification"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Dismiss
                                      </button>
                                      {!notification.read && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            markAnnouncementAsRead(notification.id)
                                          }}
                                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors border border-amber-500/20 hover:border-amber-500/40"
                                          title="Mark as read"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" transform="translate(4, 0)" />
                                          </svg>
                                          Mark as Read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <svg className={`w-12 h-12 ${isDarkMode ? "text-slate-600" : "text-slate-400"} mx-auto mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l7-7h10z" />
                              </svg>
                              <p className={`${isDarkMode ? "text-slate-400" : "text-slate-500"} text-sm`}>No announcements available</p>
                            </div>
                          )}
                        </div>
                      )}

                      {notifications.length > 0 && !notificationsLoading && !notificationsError && (
                        <div className={`mt-4 pt-3 border-t sticky bottom-0 backdrop-blur-md ${isDarkMode ? "border-slate-700/50 bg-slate-800/95" : "border-slate-200 bg-white"}`}>
                          <button className={`w-full text-center ${isDarkMode ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"} text-sm font-medium transition-colors py-2`}>
                            View All Notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Section */}
              <div className="relative profile-menu">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-3 p-2 rounded-lg ${isDarkMode ? "bg-slate-700/50 hover:bg-slate-700/50" : "bg-gray-100 hover:bg-gray-200"} transition-all duration-300 group/profile`}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-600" : "bg-gray-300"} border-2 border-amber-400/50 group-hover/profile:border-amber-400 transition-colors duration-300 shrink-0`}>
                    {getProfilePictureUrl(user) ? (
                      <img
                        src={getProfilePictureUrl(user)}
                        alt={`${user?.name || 'User'} profile`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "text-slate-300" : "text-gray-600"} text-sm ${getProfilePictureUrl(user) ? "hidden" : "flex"}`}>
                      👤
                    </div>
                  </div>

                  <div className="text-left min-w-0 hidden sm:block">
                    <p className={`${isDarkMode ? "text-white" : "text-gray-900"} font-semibold text-sm lg:text-base truncate`}>
                      {user?.name || "Procurement Officer"}
                    </p>
                    <p className={`${isDarkMode ? "text-slate-300" : "text-gray-600"} text-xs lg:text-sm truncate`}>
                      {userProfile?.position || "Procurement Specialist"}
                    </p>
                  </div>

                  <svg className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-600"} transition-transform duration-200 shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className={`fixed top-20 right-4 w-72 ${isDarkMode ? "bg-slate-800/95 border-slate-700/50" : "bg-white border-slate-200"} backdrop-blur-md rounded-lg shadow-2xl border z-9999 profile-menu`}>
                    <div className="p-4 space-y-2">
                      {/* View Profile (Employee Dashboard) - Only for admins */}
                      {user?.access_level === 'admin' && (
                        <button 
                          onClick={() => {
                            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
                            if (token) {
                              const encodedToken = encodeURIComponent(token)
                              const username = user?.username || ''
                              window.location.href = `/employee/dashboard?autoLogin=true&token=${encodedToken}&username=${encodeURIComponent(username)}&tab=profile`
                            } else {
                              window.location.href = '/employee/dashboard?tab=profile'
                            }
                          }}
                          className={`w-full text-left px-3 py-2 ${isDarkMode ? "text-slate-300 hover:text-white hover:bg-slate-700/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"} rounded-md transition-colors duration-200 flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          View Profile
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          setShowProfileMenu(false)
                          setShowSettingsModal(true)
                        }}
                        className={`w-full text-left px-3 py-2 ${isDarkMode ? "text-slate-300 hover:text-white hover:bg-slate-700/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"} rounded-md transition-colors duration-200 flex items-center gap-2`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                      <button 
                        onClick={handleLogout}
                        className={`w-full text-left px-3 py-2 ${isDarkMode ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:text-red-700 hover:bg-red-50"} rounded-md transition-colors duration-200 flex items-center gap-2`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m6 0l-6 6m6-6l-6-6" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative max-w-[1600px] mx-auto p-2 sm:p-3 md:p-4 pb-20 md:pb-4">{/* Loading State - Compact */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className={`animate-spin rounded-full h-12 w-12 border-3 ${isDarkMode ? "border-slate-700" : "border-slate-200"} border-t-amber-500`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                </svg>
              </div>
            </div>
            <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} mt-4 font-medium text-sm`}>Loading data...</p>
          </div>
        )}

        {/* Error State - Compact */}
        {error && (
          <div className={`${isDarkMode ? "bg-red-950/30 border-red-800" : "bg-red-50 border-red-300"} border rounded-lg p-3 mb-3 shadow-md`}>
            <div className="flex items-start gap-2">
              <svg className={`w-5 h-5 ${isDarkMode ? "text-red-400" : "text-red-600"} shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className={`${isDarkMode ? "text-red-400" : "text-red-700"} text-sm font-medium`}>{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className={`mt-1.5 ${isDarkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-800"} text-xs underline`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation - Top */}
        <div className={`
            hidden md:block sticky top-0 z-10 w-full mb-3
            transition-shadow duration-150 ease-in-out
          `}>
            <div className={`
              relative mx-auto max-w-[1600px] px-4
              transition-shadow duration-150 ease-in-out
              ${isScrolled ? 'rounded-full shadow-xl border-2' : 'rounded-xl shadow-lg border'}
              ${isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"}
            `}>
            <div
              className={`flex overflow-x-auto scrollbar-thin ${isDarkMode ? "scrollbar-thumb-slate-600" : "scrollbar-thumb-slate-300"} scrollbar-track-transparent justify-center w-full transition-transform duration-150 ${isScrolled ? 'px-3 py-2' : 'px-4 py-3'}`}
              style={{ transform: isScrolled ? 'scale(0.985)' : 'scale(1)' }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative shrink-0 font-semibold
                    flex items-center gap-2 group
                    transition-all duration-500 ease-out
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tab.color}-500
                    active:scale-95 touch-manipulation
                    ${isScrolled 
                      ? 'px-4 py-2 text-sm rounded-full mx-1 min-h-[44px]' 
                      : 'px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base rounded-xl mx-1 min-h-[48px] sm:min-h-[56px]'
                    }
                    ${activeTab === tab.key
                      ? `text-white bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 shadow-lg shadow-${tab.color}-500/30 transform scale-105 ${keyboardNavigated ? 'ring-2 ring-white/50 animate-pulse' : ''}`
                      : isDarkMode 
                        ? `text-slate-400 bg-transparent hover:bg-slate-800/30 hover:text-slate-200 active:bg-slate-700/50`
                        : `text-slate-700 bg-transparent hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200`
                    }
                  `}
                  aria-label={`${tab.label} - ${tab.description}`}
                  title={tab.description}
                >
                  {/* Active tab glow effect */}
                  {activeTab === tab.key && (
                    <div className={`absolute inset-0 bg-gradient-to-r from-${tab.color}-400/20 to-${tab.color}-600/20 rounded-full blur-xl -z-10`}></div>
                  )}
                  
                  <span className={`
                    transition-all duration-300
                    ${isScrolled ? 'text-base' : 'text-lg sm:text-xl'}
                    ${activeTab === tab.key ? 'animate-pulse' : ''}
                  `}>{tab.icon}</span>
                  
                  <span className={`
                    whitespace-nowrap transition-all duration-300
                    ${isScrolled && activeTab !== tab.key ? 'hidden sm:inline opacity-75' : 'opacity-100'}
                    ${activeTab === tab.key ? 'font-bold' : 'font-medium'}
                  `}>{tab.label}</span>
                  
                  {/* Subtle active indicator dot */}
                  {activeTab === tab.key && !isScrolled && (
                    <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-${tab.color}-300 rounded-full`}></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Panel */}
        {showQuickStats && (
          <div className="mb-4 transform transition-all duration-300 ease-out">
            <div className={`${isDarkMode ? "bg-slate-800/90 border-slate-700/50" : "bg-white border-gray-200"} backdrop-blur-md rounded-xl shadow-xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg sm:text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Quick Statistics</h2>
                <button
                  onClick={() => setShowQuickStats(false)}
                  className={`p-1 rounded-lg ${isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-gray-200"} transition-colors duration-200`}
                >
                  <svg className={`w-5 h-5 ${isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg p-3 sm:p-4 shadow-md border border-slate-300 dark:border-slate-700">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">TOTAL ITEMS</h3>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">1,247</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">+12% from last month</p>
                </div>
                <div className="bg-linear-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-lg p-3 sm:p-4 shadow-md border border-green-300 dark:border-green-800">
                  <h3 className="font-bold text-green-700 dark:text-green-300 text-xs uppercase">IN STOCK</h3>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">892</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">71% of total</p>
                </div>
                <div className="bg-linear-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-800/20 rounded-lg p-3 sm:p-4 shadow-md border border-amber-300 dark:border-amber-800">
                  <h3 className="font-bold text-amber-700 dark:text-amber-300 text-xs uppercase">LOW STOCK</h3>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">23</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Requires attention</p>
                </div>
                <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 sm:p-4 shadow-md border border-purple-300 dark:border-purple-800">
                  <h3 className="font-bold text-purple-700 dark:text-purple-300 text-xs uppercase">ACTIVE POS</h3>
                  <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400">15</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">$127K total value</p>
                </div>
              </div>
            </div>
          </div>
        )}

          <div className={`${isDarkMode ? "bg-slate-900/90 border-slate-700/50" : "bg-white border-gray-200"} backdrop-blur-xl rounded-lg shadow-lg border`}>
            <div className="p-3 sm:p-4">
              <Suspense fallback={<div className={`py-6 text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Loading module...</div>}>
                {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
                {activeTab === "inventory" && <InventoryManagement />}
                {activeTab === "orders" && <PurchaseOrderTracker />}
                {activeTab === "suppliers" && <SupplierManagement />}
                {activeTab === "logs" && <EmployeeLogs />}
              </Suspense>
            </div>
          </div>
      </div>
      </div>
      {/* Back to top button - positioned above mobile nav on small screens */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed right-4 bottom-24 md:bottom-6 z-9999 bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
          title="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 ${isDarkMode ? "bg-slate-900/95 border-slate-700/50" : "bg-white/95 border-gray-300"} backdrop-blur-lg border-t pb-safe`}>
        <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg
                min-w-14 min-h-14 transition-all duration-300 touch-manipulation
                ${activeTab === tab.key
                  ? `text-white bg-${tab.color}-500 shadow-lg shadow-${tab.color}-500/30`
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
              aria-label={tab.label}
              title={tab.label}
            >
              {/* Active indicator */}
              {activeTab === tab.key && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
              )}
              
              {/* Icon */}
              <span className="text-2xl">{tab.icon}</span>
              
              {/* Label - smaller text on mobile */}
              <span className="text-[10px] font-medium leading-tight text-center truncate max-w-full">
                {tab.key === 'orders' ? 'Orders' : tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add bottom padding for mobile navigation */}
      <div className="md:hidden h-20"></div>

      {/* Settings Modal */}
      <Suspense fallback={null}>
        <SettingsModal 
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          user={user}
        />
      </Suspense>

      {/* Notification Detail Modal */}
      <Suspense fallback={null}>
        <NotificationModal
          notification={selectedNotification}
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkAsRead={(id) => {
            markAnnouncementAsRead(id)
            setSelectedNotification(null)
          }}
          onDismiss={(id) => {
            dismissNotification(id)
            setSelectedNotification(null)
          }}
          isDarkMode={isDarkMode}
        />
      </Suspense>
    </ToastProvider>
  )
}

export default ProcurementDepartment