/**
 * Session Persistence Utility
 * Handles saving and restoring user sessions and last visited routes for PWA
 * 
 * This ensures:
 * - Admins return to their department selector or department page
 * - Employees return to their dashboard
 * - Users don't have to re-login when reopening the app
 */

// Storage keys
const LAST_ROUTE_KEY = 'pwa_last_route'
const LAST_ROUTE_TIMESTAMP_KEY = 'pwa_last_route_timestamp'
const USER_TYPE_KEY = 'pwa_user_type' // 'admin' | 'employee'

// Route configurations for different user types
const ADMIN_ALLOWED_ROUTES = [
  '/jjcewgsaccess',
  '/jjcewgsaccess/login',
  '/jjcewgsaccess/superadmin',
  '/jjcewgsaccess/hr',
  '/jjcewgsaccess/operations',
  '/jjcewgsaccess/finance',
  '/jjcewgsaccess/procurement',
  '/jjcewgsaccess/engineering'
]

const EMPLOYEE_ALLOWED_ROUTES = [
  '/',
  '/employee/login',
  '/employee/dashboard'
]

// Default routes for each user type
const DEFAULT_ROUTES = {
  admin: '/jjcewgsaccess',
  employee: '/employee/dashboard',
  guest: '/'
}

/**
 * Save the current route to localStorage
 * @param {string} route - The current route path
 * @param {string} userType - 'admin' | 'employee' | 'guest'
 */
export const saveLastRoute = (route, userType = 'guest') => {
  try {
    // Don't save login routes as "last route" - we want to restore to the actual page
    if (route.includes('/login')) {
      return
    }

    // Validate route based on user type
    if (userType === 'admin' && !ADMIN_ALLOWED_ROUTES.some(r => route.startsWith(r))) {
      return
    }
    if (userType === 'employee' && !EMPLOYEE_ALLOWED_ROUTES.some(r => route === r || route.startsWith(r))) {
      return
    }

    localStorage.setItem(LAST_ROUTE_KEY, route)
    localStorage.setItem(LAST_ROUTE_TIMESTAMP_KEY, Date.now().toString())
    localStorage.setItem(USER_TYPE_KEY, userType)
    
    console.log(`📍 Saved last route: ${route} for ${userType}`)
  } catch (error) {
    console.error('Error saving last route:', error)
  }
}

/**
 * Get the last saved route for restoration
 * @param {string} currentUserType - The current authenticated user type
 * @returns {string|null} The route to restore to, or null if none
 */
export const getLastRoute = (currentUserType = 'guest') => {
  try {
    const savedRoute = localStorage.getItem(LAST_ROUTE_KEY)
    const savedUserType = localStorage.getItem(USER_TYPE_KEY)
    const savedTimestamp = localStorage.getItem(LAST_ROUTE_TIMESTAMP_KEY)
    
    if (!savedRoute) {
      return null
    }

    // Check if the saved route matches the current user type
    // Don't restore admin routes for employees and vice versa
    if (currentUserType !== savedUserType && currentUserType !== 'guest') {
      console.log(`📍 User type mismatch: saved ${savedUserType}, current ${currentUserType}`)
      return null
    }

    // Optional: Check if the saved route is not too old (e.g., 30 days)
    if (savedTimestamp) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      if (Date.now() - parseInt(savedTimestamp) > thirtyDaysMs) {
        clearLastRoute()
        return null
      }
    }

    console.log(`📍 Restoring to last route: ${savedRoute}`)
    return savedRoute
  } catch (error) {
    console.error('Error getting last route:', error)
    return null
  }
}

/**
 * Get the default route for a user type
 * @param {string} userType - 'admin' | 'employee' | 'guest'
 * @returns {string} The default route for the user type
 */
export const getDefaultRoute = (userType = 'guest') => {
  return DEFAULT_ROUTES[userType] || DEFAULT_ROUTES.guest
}

/**
 * Clear the saved last route (call on logout)
 */
export const clearLastRoute = () => {
  try {
    localStorage.removeItem(LAST_ROUTE_KEY)
    localStorage.removeItem(LAST_ROUTE_TIMESTAMP_KEY)
    localStorage.removeItem(USER_TYPE_KEY)
    console.log('📍 Cleared last route')
  } catch (error) {
    console.error('Error clearing last route:', error)
  }
}

/**
 * Determine the restore route based on authentication state
 * @param {Object} authState - Object containing isAuthenticated, isEmployeeAuthenticated, selectedDepartment
 * @returns {{ route: string, shouldRedirect: boolean }}
 */
export const getRestoreRoute = (authState) => {
  const { isAuthenticated, isEmployeeAuthenticated, selectedDepartment, isSuperAdmin } = authState
  const currentPath = window.location.pathname

  // If user is an authenticated admin
  if (isAuthenticated) {
    const savedRoute = getLastRoute('admin')
    
    // If there's a saved admin route, use it
    if (savedRoute && ADMIN_ALLOWED_ROUTES.some(r => savedRoute.startsWith(r))) {
      // Don't redirect if already on the saved route
      if (currentPath === savedRoute) {
        return { route: savedRoute, shouldRedirect: false }
      }
      return { route: savedRoute, shouldRedirect: true }
    }
    
    // Otherwise, determine based on role
    if (isSuperAdmin) {
      return { route: '/jjcewgsaccess/superadmin', shouldRedirect: currentPath !== '/jjcewgsaccess/superadmin' }
    }
    
    // Map department to route
    const departmentRouteMap = {
      'Human Resources': '/jjcewgsaccess/hr',
      'Operations': '/jjcewgsaccess/operations',
      'Finance': '/jjcewgsaccess/finance',
      'Procurement': '/jjcewgsaccess/procurement',
      'Engineering': '/jjcewgsaccess/engineering'
    }
    
    const deptRoute = departmentRouteMap[selectedDepartment]
    if (deptRoute) {
      return { route: deptRoute, shouldRedirect: currentPath !== deptRoute }
    }
    
    // Default to department selector
    return { route: '/jjcewgsaccess', shouldRedirect: currentPath !== '/jjcewgsaccess' }
  }
  
  // If user is an authenticated employee
  if (isEmployeeAuthenticated) {
    const savedRoute = getLastRoute('employee')
    
    // Employees can only access dashboard
    if (savedRoute === '/employee/dashboard' || currentPath === '/employee/dashboard') {
      return { route: '/employee/dashboard', shouldRedirect: currentPath !== '/employee/dashboard' }
    }
    
    return { route: '/employee/dashboard', shouldRedirect: true }
  }
  
  // Not authenticated - check if there's a saved route that suggests user type
  const savedUserType = localStorage.getItem(USER_TYPE_KEY)
  if (savedUserType === 'admin') {
    // Previously was admin, redirect to admin login area
    return { route: '/jjcewgsaccess', shouldRedirect: currentPath !== '/jjcewgsaccess' && currentPath !== '/' }
  }
  
  // Default to landing page for guests/employees
  return { route: '/', shouldRedirect: false }
}

/**
 * Check if the app was launched from PWA (standalone mode)
 * @returns {boolean}
 */
export const isRunningAsPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://') ||
         window.matchMedia('(display-mode: fullscreen)').matches
}

/**
 * Hook-friendly function to track route changes
 * Call this in a useEffect when location changes
 * @param {string} pathname - Current pathname
 * @param {string} userType - Current user type
 */
export const trackRouteChange = (pathname, userType) => {
  // Only track if running as PWA or if explicitly saving routes
  saveLastRoute(pathname, userType)
}
