import { useAuth } from "../../contexts/AuthContext"
import { useState, useEffect, lazy, Suspense, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import apiService from "../../utils/api/api-service"
import { getStoredToken, verifyToken } from "../../utils/auth"
import { useRealtimeEvents } from "../../hooks/useRealtime"
import { playStockAlertSound, preloadDefaultSounds } from "../../utils/notificationSound"
import ProcurementHeader from "../pd/shared/ProcurementHeader"

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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false)

  // Real-time event handler for announcements and stock alerts
  const handleAnnouncementEvent = useCallback((data) => {
    console.log('🔔 Real-time announcement event received:', data)
    const priority = data?.priority || 'medium'
    console.log('🔊 Attempting to play sound for announcement, priority:', priority)
    playStockAlertSound(priority)
    loadNotifications()
  }, [user])

  // Handler for stock alerts specifically
  const handleStockAlert = useCallback((data) => {
    console.log('🚨 Stock alert received:', data)
    const priority = data?.priority || 'urgent'
    console.log('🔊 Attempting to play sound for stock alert, priority:', priority)
    playStockAlertSound(priority)
    loadNotifications()
  }, [])

  // Subscribe to real-time announcement events
  useRealtimeEvents({
    'announcement_created': handleAnnouncementEvent,
    'announcement_updated': () => loadNotifications(),
    'announcement_deleted': () => loadNotifications(),
    'stock_alert_created': handleStockAlert
  }, [handleAnnouncementEvent, handleStockAlert])

  // Keyboard navigation for tabs
  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "inventory", label: "Inventory", icon: "📦" },
    { key: "orders", label: "Orders", icon: "📋" },
    { key: "suppliers", label: "Suppliers", icon: "🏢" },
    { key: "logs", label: "Employee Logs", icon: "👥" }
  ]

  // Get profile picture URL
  const getProfilePictureUrl = (user) => {
    if (!user || !user.id) return null
    if (userProfile && userProfile.id === user.id && userProfile.profilePicture) {
      return userProfile.profilePicture
    }
    return apiService.profiles.getProfileUrlByUid(user.id)
  }

  // Normalize UID extraction from token payloads or auth user
  const resolveUid = (payload, fallbackUser) => {
    if (!payload && !fallbackUser) return null
    const candidates = [payload?.userId, payload?.id, payload?.employeeId, payload?.uid]
    for (const c of candidates) {
      if (c) return c
    }
    if (fallbackUser?.id) return fallbackUser.id
    return null
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
      const uid = resolveUid(payload, user)

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
      const uid = resolveUid(payload, user)

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
      const uid = resolveUid(payload, user)

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

  // Handle logout
  const handleLogout = () => {
    logout()
  }

  // Scroll detection for navigation morphing
  useEffect(() => {
    // Load user profile and notifications on mount
  }, [])

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile()
  }, [user])

  // Load notifications on mount and whenever `user` changes
  useEffect(() => {
    loadNotifications()
  }, [user])

  // Preload notification sounds on mount
  useEffect(() => {
    preloadDefaultSounds()
  }, [])

  // Close notifications panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && !event.target.closest('.mobile-menu')) {
        setShowMobileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileMenu])

  return (
    <ToastProvider>
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header & Navigation */}
      <ProcurementHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        onNotificationsRefresh={() => setShowAllNotificationsModal(true)}
        onNotificationsDismiss={dismissNotification}
        onNotificationsMarkRead={markAnnouncementAsRead}
        onNotificationClick={setSelectedNotification}
        onSettingsOpen={() => setShowSettingsModal(true)}
        onLogout={handleLogout}
        onViewProfile={() => {
          // Navigate to employee dashboard profile page
          navigate('/employee/dashboard?tab=profile')
        }}
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
      />

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-6 pt-16 md:pt-20 pb-28 md:pb-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className={`h-12 w-12 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin ${isDarkMode ? 'border-slate-700 border-t-blue-500' : ''}`}></div>
            <p className={`mt-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
            <button
              onClick={() => setError(null)}
              className={`mt-2 text-sm underline ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className={`rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="p-4 sm:p-6">
            <Suspense fallback={
              <div className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading module...
              </div>
            }>
              {activeTab === 'dashboard' && <AdminDashboard onNavigate={setActiveTab} />}
              {activeTab === 'inventory' && <InventoryManagement />}
              {activeTab === 'orders' && <PurchaseOrderTracker />}
              {activeTab === 'suppliers' && <SupplierManagement />}
              {activeTab === 'logs' && <EmployeeLogs />}
            </Suspense>
          </div>
        </div>
      </main>

      {/* All Notifications Modal */}
      {showAllNotificationsModal && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isDarkMode ? 'bg-black/50' : 'bg-black/40'} backdrop-blur-sm`}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className={`w-full max-w-2xl rounded-lg shadow-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              {/* Header */}
              <div className={`p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    All Notifications
                  </h2>
                  <button
                    onClick={() => setShowAllNotificationsModal(false)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent hover:scrollbar-thumb-slate-500">
                {notificationsLoading ? (
                  <div className="text-center py-8">
                    <div className={`h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin mx-auto mb-4 ${isDarkMode ? 'border-slate-700' : ''}`}></div>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading notifications...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setSelectedNotification(notif)
                          setShowAllNotificationsModal(false)
                        }}
                        className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                          notif.read
                            ? isDarkMode
                              ? 'bg-slate-800/30 border-slate-700/30'
                              : 'bg-slate-50 border-slate-200'
                            : isDarkMode
                              ? 'bg-blue-900/30 border-blue-800/50'
                              : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium text-sm sm:text-base ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                              {notif.title}
                            </h3>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {notif.time}
                            </p>
                          </div>
                          {!notif.read && (
                            <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      No notifications available
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  onClick={() => setShowAllNotificationsModal(false)}
                  className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      </div>
    </ToastProvider>
  )
}

export default ProcurementDepartment

