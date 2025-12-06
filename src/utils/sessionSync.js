/**
 * Session Synchronization Utility
 * Handles cross-tab logout AND login synchronization using BroadcastChannel API
 * Falls back to localStorage events for older browsers
 */

const ADMIN_CHANNEL = 'jjc_admin_session'
const EMPLOYEE_CHANNEL = 'jjc_employee_session'
const SESSION_SYNC_KEY = 'jjc_session_sync'

// Track if channels are supported
const isBroadcastSupported = typeof BroadcastChannel !== 'undefined'

// Broadcast channels for cross-tab communication
let adminChannel = null
let employeeChannel = null

// Callbacks for session events
let onAdminLogoutCallback = null
let onEmployeeLogoutCallback = null
let onAdminLoginCallback = null
let onEmployeeLoginCallback = null

/**
 * Initialize session sync channels
 * @param {Object} callbacks - { onAdminLogout, onEmployeeLogout, onAdminLogin, onEmployeeLogin }
 */
export const initSessionSync = (callbacks = {}) => {
  const { onAdminLogout, onEmployeeLogout, onAdminLogin, onEmployeeLogin } = callbacks
  
  onAdminLogoutCallback = onAdminLogout
  onEmployeeLogoutCallback = onEmployeeLogout
  onAdminLoginCallback = onAdminLogin
  onEmployeeLoginCallback = onEmployeeLogin

  if (isBroadcastSupported) {
    // Use BroadcastChannel for modern browsers
    try {
      adminChannel = new BroadcastChannel(ADMIN_CHANNEL)
      employeeChannel = new BroadcastChannel(EMPLOYEE_CHANNEL)

      adminChannel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          console.log('📢 Admin logout broadcast received')
          onAdminLogoutCallback?.({
            reason: event.data.reason || 'You have been logged out from another tab',
            timestamp: event.data.timestamp
          })
        } else if (event.data?.type === 'LOGIN') {
          console.log('📢 Admin login broadcast received')
          onAdminLoginCallback?.({
            user: event.data.user,
            timestamp: event.data.timestamp
          })
        }
      }

      employeeChannel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          console.log('📢 Employee logout broadcast received')
          onEmployeeLogoutCallback?.({
            reason: event.data.reason || 'You have been logged out from another tab',
            timestamp: event.data.timestamp
          })
        } else if (event.data?.type === 'LOGIN') {
          console.log('📢 Employee login broadcast received')
          onEmployeeLoginCallback?.({
            user: event.data.user,
            timestamp: event.data.timestamp
          })
        }
      }

      console.log('✅ Session sync channels initialized (BroadcastChannel)')
    } catch (error) {
      console.error('Failed to initialize BroadcastChannel:', error)
      initStorageFallback()
    }
  } else {
    // Fallback to localStorage events
    initStorageFallback()
  }
}

/**
 * Fallback to localStorage events for older browsers
 */
const initStorageFallback = () => {
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_SYNC_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue)
        if (data.type === 'ADMIN_LOGOUT') {
          console.log('📢 Admin logout storage event received')
          onAdminLogoutCallback?.({
            reason: data.reason || 'You have been logged out from another tab',
            timestamp: data.timestamp
          })
        } else if (data.type === 'EMPLOYEE_LOGOUT') {
          console.log('📢 Employee logout storage event received')
          onEmployeeLogoutCallback?.({
            reason: data.reason || 'You have been logged out from another tab',
            timestamp: data.timestamp
          })
        } else if (data.type === 'ADMIN_LOGIN') {
          console.log('📢 Admin login storage event received')
          onAdminLoginCallback?.({
            user: data.user,
            timestamp: data.timestamp
          })
        } else if (data.type === 'EMPLOYEE_LOGIN') {
          console.log('📢 Employee login storage event received')
          onEmployeeLoginCallback?.({
            user: data.user,
            timestamp: data.timestamp
          })
        }
      } catch (e) {
        console.error('Failed to parse session sync data:', e)
      }
    }
  })
  console.log('✅ Session sync initialized (localStorage fallback)')
}

/**
 * Broadcast admin logout to other tabs
 * @param {string} reason - Optional reason for logout
 */
export const broadcastAdminLogout = (reason = 'Session ended') => {
  const message = {
    type: 'LOGOUT',
    reason,
    timestamp: Date.now()
  }

  if (isBroadcastSupported && adminChannel) {
    adminChannel.postMessage(message)
  }
  
  // Also use localStorage for fallback
  localStorage.setItem(SESSION_SYNC_KEY, JSON.stringify({
    type: 'ADMIN_LOGOUT',
    reason,
    timestamp: Date.now()
  }))
  // Clear it immediately so it can trigger again
  setTimeout(() => localStorage.removeItem(SESSION_SYNC_KEY), 100)
  
  console.log('📢 Admin logout broadcasted')
}

/**
 * Broadcast admin login to other tabs
 * @param {Object} user - User data to broadcast
 */
export const broadcastAdminLogin = (user = {}) => {
  const message = {
    type: 'LOGIN',
    user,
    timestamp: Date.now()
  }

  if (isBroadcastSupported && adminChannel) {
    adminChannel.postMessage(message)
  }
  
  // Also use localStorage for fallback
  localStorage.setItem(SESSION_SYNC_KEY, JSON.stringify({
    type: 'ADMIN_LOGIN',
    user,
    timestamp: Date.now()
  }))
  setTimeout(() => localStorage.removeItem(SESSION_SYNC_KEY), 100)
  
  console.log('📢 Admin login broadcasted')
}

/**
 * Broadcast employee logout to other tabs
 * @param {string} reason - Optional reason for logout
 */
export const broadcastEmployeeLogout = (reason = 'Session ended') => {
  const message = {
    type: 'LOGOUT',
    reason,
    timestamp: Date.now()
  }

  if (isBroadcastSupported && employeeChannel) {
    employeeChannel.postMessage(message)
  }
  
  // Also use localStorage for fallback
  localStorage.setItem(SESSION_SYNC_KEY, JSON.stringify({
    type: 'EMPLOYEE_LOGOUT',
    reason,
    timestamp: Date.now()
  }))
  setTimeout(() => localStorage.removeItem(SESSION_SYNC_KEY), 100)
  
  console.log('📢 Employee logout broadcasted')
}

/**
 * Broadcast employee login to other tabs
 * @param {Object} user - User data to broadcast
 */
export const broadcastEmployeeLogin = (user = {}) => {
  const message = {
    type: 'LOGIN',
    user,
    timestamp: Date.now()
  }

  if (isBroadcastSupported && employeeChannel) {
    employeeChannel.postMessage(message)
  }
  
  // Also use localStorage for fallback
  localStorage.setItem(SESSION_SYNC_KEY, JSON.stringify({
    type: 'EMPLOYEE_LOGIN',
    user,
    timestamp: Date.now()
  }))
  setTimeout(() => localStorage.removeItem(SESSION_SYNC_KEY), 100)
  
  console.log('📢 Employee login broadcasted')
}

/**
 * Clean up channels on unmount
 */
export const cleanupSessionSync = () => {
  if (adminChannel) {
    adminChannel.close()
    adminChannel = null
  }
  if (employeeChannel) {
    employeeChannel.close()
    employeeChannel = null
  }
  console.log('🧹 Session sync channels cleaned up')
}

/**
 * Check if a token exists and is valid
 * @param {boolean} isEmployee - Check employee token or admin token
 * @returns {boolean}
 */
export const hasValidSession = (isEmployee = false) => {
  const tokenKey = isEmployee ? 'employeeToken' : 'auth_token'
  const token = localStorage.getItem(tokenKey)
  
  if (!token) return false
  
  try {
    // Basic JWT decode to check expiration
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)
    
    return payload.exp && payload.exp > now
  } catch {
    return false
  }
}
