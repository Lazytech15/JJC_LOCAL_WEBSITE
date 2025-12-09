import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import apiService from '../../../utils/api/api-service'

function ProcurementHeader({
  activeTab,
  onTabChange,
  notifications,
  notificationsLoading,
  onNotificationsRefresh,
  onNotificationsDismiss,
  onNotificationsMarkRead,
  onNotificationClick,
  onSettingsOpen,
  onLogout,
  onViewProfile,
  showMobileMenu,
  onMobileMenuToggle
}) {
  const { user, isDarkMode, toggleDarkMode } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Load user profile
    if (user?.id) {
      apiService.employees.getEmployee(user.id)
        .then(response => {
          if (response.success && response.employee) {
            setUserProfile(response.employee)
          }
        })
        .catch(error => console.error('Failed to load user profile:', error))
    }
  }, [user])

  const getProfilePictureUrl = (user) => {
    if (!user?.id) return null
    return apiService.profiles.getProfileUrlByUid(user.id)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'inventory', label: 'Inventory', icon: '📦' },
    { key: 'orders', label: 'Orders', icon: '📋' },
    { key: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { key: 'logs', label: 'Logs', icon: '👥' }
  ]

  return (
    <>
      {/* Desktop Header - Single Line with Navigation */}
      <header
        className={`hidden md:block sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? isDarkMode
              ? 'bg-slate-900/95 border-slate-700/50'
              : 'bg-white/95 border-slate-200'
            : isDarkMode
              ? 'bg-slate-900 border-slate-700/30'
              : 'bg-white border-slate-200'
        } border-b backdrop-blur-lg`}
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Department Info */}
            <div className="min-w-0 shrink-0 flex-1">
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Procurement
              </h1>
            </div>

            {/* Center: Navigation Tabs */}
            <nav className="flex items-center justify-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-medium ${
                    activeTab === tab.key
                      ? 'bg-blue-500 text-white shadow-lg'
                      : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-2 shrink-0 flex-1">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg transition-colors relative ${
                    isDarkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  aria-label="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l7-7h10z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className={`absolute top-full right-0 mt-2 w-80 rounded-lg shadow-xl border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex flex-col max-h-96">
                      {/* Scrollable Content Area */}
                      <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent hover:scrollbar-thumb-slate-500 flex-1">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/30">
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Notifications
                          </h3>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className={`text-sm transition-colors ${
                              isDarkMode
                                ? 'text-slate-400 hover:text-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Content */}
                        {notificationsLoading ? (
                          <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
                        ) : notifications.length > 0 ? (
                          <div className="space-y-2">
                            {notifications.slice(0, 5).map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  onNotificationClick?.(notif)
                                  setShowNotifications(false)
                                }}
                                className={`p-3 rounded border transition-colors cursor-pointer hover:shadow-md ${
                                  notif.read
                                    ? isDarkMode
                                      ? 'bg-slate-700/20 border-slate-700/30 hover:bg-slate-700/30'
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                    : isDarkMode
                                      ? 'bg-blue-900/30 border-blue-800/50 hover:bg-blue-900/40'
                                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium line-clamp-2 text-sm ${
                                      isDarkMode ? 'text-slate-200' : 'text-slate-900'
                                    }`}>
                                      {notif.title}
                                    </p>
                                    <p className={`text-xs mt-1 ${
                                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                      {notif.time}
                                    </p>
                                  </div>
                                </div>
                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/20">
                                  {!notif.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onNotificationsMarkRead(notif.id)
                                      }}
                                      className="flex-1 text-xs px-2 py-1 rounded transition-colors bg-blue-500 text-white hover:bg-blue-600"
                                    >
                                      ✓ Mark Read
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onNotificationsDismiss(notif.id)
                                    }}
                                    className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                                      isDarkMode
                                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                  >
                                    ✕ Dismiss
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm text-center py-4 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            No notifications
                          </p>
                        )}
                      </div>

                      {/* Sticky Footer Button */}
                      {notifications.length > 5 && (
                        <div className={`sticky bottom-0 px-4 py-3 border-t ${
                          isDarkMode
                            ? 'border-slate-700/30 bg-slate-800/80'
                            : 'border-slate-200 bg-white/80'
                        } backdrop-blur-sm`}>
                          <button
                            onClick={onNotificationsRefresh}
                            className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                              isDarkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            View All Notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-800 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4m8.485-14.485l-2.828 2.828m-11.314 0L2.515 4.515m14.142 14.142l2.828 2.828M4.343 19.657l2.828-2.828" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-slate-800'
                      : 'hover:bg-slate-100'
                  }`}
                  aria-label="Profile menu"
                >
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    {getProfilePictureUrl(user) ? (
                      <img
                        src={getProfilePictureUrl(user)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <span className="text-sm">👤</span>
                    )}
                  </div>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className={`absolute top-full right-0 mt-2 w-48 rounded-lg shadow-xl border overflow-hidden ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="p-3 space-y-1 text-sm">
                      <div className={`px-2 py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <p className="font-medium">{user?.name || 'User'}</p>
                        <p className="text-xs">{userProfile?.position || 'Officer'}</p>
                      </div>
                      <button
                        onClick={() => {
                          onViewProfile?.()
                          setShowProfileMenu(false)
                        }}
                        className={`w-full text-left px-2 py-2 rounded transition-colors ${
                          isDarkMode
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        👁️ View Profile
                      </button>
                      <button
                        onClick={() => {
                          onSettingsOpen()
                          setShowProfileMenu(false)
                        }}
                        className={`w-full text-left px-2 py-2 rounded transition-colors ${
                          isDarkMode
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        onClick={() => {
                          navigate('/jjctoolbox')
                          setShowProfileMenu(false)
                        }}
                        className={`w-full text-left px-2 py-2 rounded transition-colors ${
                          isDarkMode
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        🧰 Toolbox
                      </button>
                      <button
                        onClick={() => {
                          onLogout()
                          setShowProfileMenu(false)
                        }}
                        className={`w-full text-left px-2 py-2 rounded transition-colors text-red-500 hover:bg-red-500/10`}
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - Compact, Single Line */}
      <header
        className={`md:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? isDarkMode
              ? 'bg-slate-900/95 border-slate-700/50'
              : 'bg-white/95 border-slate-200'
            : isDarkMode
              ? 'bg-slate-900 border-slate-700/30'
              : 'bg-white border-slate-200'
        } border-b backdrop-blur-lg`}
      >
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          {/* Department Title */}
          <h1 className={`text-base font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Procurement
          </h1>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg transition-colors relative ${
                  isDarkMode
                    ? 'hover:bg-slate-800 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                aria-label="Notifications"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l7-7h10z" />
                </svg>
                {unreadCount > 0 && (
                  <span className={`absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute top-full right-0 mt-2 w-72 rounded-lg shadow-xl border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent hover:scrollbar-thumb-slate-500">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/30">
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Notifications
                      </h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className={`text-xs transition-colors ${
                          isDarkMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Content */}
                    {notificationsLoading ? (
                      <div className="py-3 text-center text-xs text-slate-500">Loading...</div>
                    ) : notifications.length > 0 ? (
                      <div className="space-y-2">
                        {notifications.slice(0, 4).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              onNotificationClick?.(notif)
                              setShowNotifications(false)
                            }}
                            className={`p-2 rounded border transition-colors text-xs cursor-pointer hover:shadow-md ${
                              notif.read
                                ? isDarkMode
                                  ? 'bg-slate-700/20 border-slate-700/30 hover:bg-slate-700/30'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                : isDarkMode
                                  ? 'bg-blue-900/30 border-blue-800/50 hover:bg-blue-900/40'
                                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            <p className={`font-medium line-clamp-1 ${
                              isDarkMode ? 'text-slate-200' : 'text-slate-900'
                            }`}>
                              {notif.title}
                            </p>
                            {/* Mobile Action Buttons */}
                            <div className="flex gap-1 mt-2 pt-2 border-t border-slate-700/20">
                              {!notif.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onNotificationsMarkRead(notif.id)
                                  }}
                                  className="flex-1 text-xs px-1.5 py-1 rounded transition-colors bg-blue-500 text-white hover:bg-blue-600"
                                >
                                  ✓ Read
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNotificationsDismiss(notif.id)
                                }}
                                className={`flex-1 text-xs px-1.5 py-1 rounded transition-colors ${
                                  isDarkMode
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                              >
                                ✕ Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs text-center py-3 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        No notifications
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4m8.485-14.485l-2.828 2.828m-11.314 0L2.515 4.515m14.142 14.142l2.828 2.828M4.343 19.657l2.828-2.828" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center p-1 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-800'
                    : 'hover:bg-slate-100'
                }`}
                aria-label="Profile menu"
              >
                <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs ${
                  isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                }`}>
                  {getProfilePictureUrl(user) ? (
                    <img
                      src={getProfilePictureUrl(user)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl border overflow-hidden ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="p-2 space-y-1 text-xs">
                    <div className={`px-2 py-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <p className="font-medium truncate">{user?.name || 'User'}</p>
                    </div>
                    <button
                      onClick={() => {
                        onViewProfile?.()
                        setShowProfileMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        isDarkMode
                          ? 'hover:bg-slate-700 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      👁️ View Profile
                    </button>
                    <button
                      onClick={() => {
                        onSettingsOpen()
                        setShowProfileMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        isDarkMode
                          ? 'hover:bg-slate-700 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      ⚙️ Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate('/jjctoolbox')
                        setShowProfileMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                        isDarkMode
                          ? 'hover:bg-slate-700 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      🧰 Toolbox
                    </button>
                    <button
                      onClick={() => {
                        onLogout()
                        setShowProfileMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1 rounded transition-colors text-red-500 hover:bg-red-500/10`}
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation - Bottom Sticky Bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
          isDarkMode
            ? 'bg-slate-900/95 border-slate-700/30'
            : 'bg-white/95 border-slate-200'
        } backdrop-blur-lg`}
      >
        <div className="flex items-center justify-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center py-2 px-2 transition-colors flex-1 min-w-0 ${
                activeTab === tab.key
                  ? 'text-blue-500 border-t-2 border-blue-500'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs font-medium mt-0.5 truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

export default ProcurementHeader
