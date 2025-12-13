import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import apiService from '../../utils/api/api-service'

/**
 * ProfileMenu - A shared profile menu component for department headers
 * 
 * @param {Object} props
 * @param {Function} props.onLogout - Callback function when logout is clicked
 * @param {Function} props.onViewProfile - Callback function when view profile is clicked
 * @param {Function} props.onSettingsOpen - Callback function when settings is clicked (optional)
 * @param {boolean} props.showSettings - Whether to show the settings option (default: true)
 * @param {boolean} props.showToolbox - Whether to show the toolbox option (default: true)
 * @param {string} props.size - Size variant: 'sm' | 'md' (default: 'md')
 */
function ProfileMenu({
  onLogout,
  onViewProfile,
  onSettingsOpen,
  showSettings = true,
  showToolbox = true,
  size = 'md'
}) {
  const { user, isDarkMode } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const menuRef = useRef(null)

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getProfilePictureUrl = (user) => {
    if (!user?.id) return null
    return apiService.profiles.getProfileUrlByUid(user.id)
  }

  const avatarSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const dropdownWidth = size === 'sm' ? 'w-40' : 'w-48'
  const padding = size === 'sm' ? 'p-1' : 'p-1.5'
  const itemPadding = size === 'sm' ? 'px-2 py-1' : 'px-2 py-2'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        className={`flex items-center gap-2 ${padding} rounded-lg transition-colors ${
          isDarkMode
            ? 'hover:bg-slate-800'
            : 'hover:bg-slate-100'
        }`}
        aria-label="Profile menu"
      >
        <div className={`${avatarSize} rounded-full overflow-hidden flex items-center justify-center ${
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
            <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>👤</span>
          )}
        </div>
      </button>

      {/* Profile Dropdown */}
      {showProfileMenu && (
        <div className={`absolute top-full right-0 mt-2 ${dropdownWidth} rounded-lg shadow-xl border overflow-hidden z-50 ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-slate-200'
        }`}>
          <div className={`p-2 sm:p-3 space-y-1 ${textSize}`}>
            {/* User Info */}
            <div className={`${itemPadding} ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <p className="font-medium truncate">{user?.name || 'User'}</p>
              {userProfile?.position && (
                <p className="text-xs truncate">{userProfile.position}</p>
              )}
            </div>

            {/* View Profile */}
            {onViewProfile && (
              <button
                onClick={() => {
                  onViewProfile()
                  setShowProfileMenu(false)
                }}
                className={`w-full text-left ${itemPadding} rounded transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                👁️ View Profile
              </button>
            )}

            {/* Settings */}
            {showSettings && onSettingsOpen && (
              <button
                onClick={() => {
                  onSettingsOpen()
                  setShowProfileMenu(false)
                }}
                className={`w-full text-left ${itemPadding} rounded transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                ⚙️ Settings
              </button>
            )}

            {/* Toolbox */}
            {showToolbox && (
              <button
                onClick={() => {
                  navigate('/jjctoolbox')
                  setShowProfileMenu(false)
                }}
                className={`w-full text-left ${itemPadding} rounded transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                🧰 Toolbox
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => {
                onLogout()
                setShowProfileMenu(false)
              }}
              className={`w-full text-left ${itemPadding} rounded transition-colors text-red-500 hover:bg-red-500/10`}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
