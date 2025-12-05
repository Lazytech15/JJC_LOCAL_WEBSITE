import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { createToken, storeTokens, getStoredToken, clearTokens, isTokenExpired, verifyToken } from "../utils/auth"
import apiService from "../../src/utils/api/api-service"
import GearLoadingSpinner from "../../public/LoadingGear"

// Department slug to name mapping - FIXED
const DEPARTMENT_SLUG_TO_NAME = {
  "hr": "Human Resources",
  "operations": "Operations", 
  "finance": "Finance",
  "procurement": "Procurement",
  "engineering": "Engineering",
  "superadmin": "superAdmin" 
}

// Reverse mapping - FIXED
const DEPARTMENT_NAME_TO_SLUG = {
  "Human Resources": "hr",
  "Operations": "operations", 
  "Finance": "finance",
  "Procurement": "procurement",
  "Engineering": "engineering",
  "superAdmin": "superadmin"
}

const departmentInfo = {
  "Human Resources": {
    name: "Human Resources",
    icon: "👥",
    color: "from-slate-600 to-slate-700",
    darkColor: "dark:from-slate-700 dark:to-slate-800",
  },
  Operations: { 
    name: "Operations",
    icon: "⚙️",
    color: "from-gray-600 to-gray-700",
    darkColor: "dark:from-gray-700 dark:to-gray-800",
  },
  Finance: {
    name: "Finance",
    icon: "💰",
    color: "from-stone-600 to-stone-700",
    darkColor: "dark:from-stone-700 dark:to-stone-800",
  },
  Procurement: {
    name: "Procurement",
    icon: "📋",
    color: "from-zinc-600 to-zinc-700",
    darkColor: "dark:from-zinc-700 dark:to-zinc-800",
  },
  Engineering: {
    name: "Engineering",
    icon: "🔧",
    color: "from-neutral-600 to-neutral-700",
    darkColor: "dark:from-neutral-700 dark:to-neutral-800",
  },
  superAdmin: { 
    name: "Super Admin",
    icon: "👑",
    color: "from-red-600 to-red-700",
    darkColor: "dark:from-red-700 dark:to-red-800",
  },
}

// Default department info for fallback
const defaultDepartmentInfo = {
  name: "Unknown Department",
  icon: "🏢",
  color: "from-gray-600 to-gray-700",
  darkColor: "dark:from-gray-700 dark:to-gray-800",
}

function LoginForm() {
  const { department: deptSlug } = useParams()
  const navigate = useNavigate()
  const { login, isDarkMode, toggleDarkMode } = useAuth()
  const [formData, setFormData] = useState({ username: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Convert URL slug to department name
  const departmentName = DEPARTMENT_SLUG_TO_NAME[deptSlug] || deptSlug

  // Safe department info retrieval with fallback
  const deptInfo = departmentName && departmentInfo[departmentName] 
    ? departmentInfo[departmentName] 
    : defaultDepartmentInfo

  // Check if department is valid
  const isValidDepartment = deptSlug && DEPARTMENT_SLUG_TO_NAME[deptSlug]

  // If invalid department, show error and redirect
  useEffect(() => {
    if (deptSlug && !isValidDepartment) {
      console.error(`Invalid department slug: ${deptSlug}`)
      setError(`Invalid department: ${deptSlug}. Please select a valid department.`)
      setTimeout(() => {
        navigate("/jjcewgsaccess")
      }, 3000)
    }
  }, [deptSlug, isValidDepartment, navigate])

  const handleSubmit = async (e) => {
  e.preventDefault()

  if (!isValidDepartment) {
    setError("Invalid department selected. Please go back and select a valid department.")
    return
  }

  setIsLoading(true)
  setError("")

  if (!formData.username.trim() || !formData.password.trim()) {
    setError("Please enter both username and password")
    setIsLoading(false)
    return
  }

  try {
    const authData = await apiService.auth.login({
      username: formData.username.trim(),
      password: formData.password,
      department: departmentName,
    })

    if (authData.success) {
      // ========================================================================
      // Verify admin access level (double-check on frontend)
      // Backend already validates this, but we check again for security
      // ========================================================================
      if (authData.user.access_level !== "admin") {
        clearTokens()
        setError("Access denied. Only administrators can log in to this system.")
        setIsLoading(false)
        return
      }

      const userData = {
        id: authData.user.id,
        username: authData.user.username,
        name: authData.user.name,
        department: authData.user.department, // User's ACTUAL department
        loginDepartment: departmentName, // Department they're logging into
        role: authData.user.role,
        permissions: authData.user.permissions || [],
        access_level: authData.user.access_level,
        isSuperAdmin: authData.user.isSuperAdmin, // True only if admin + superAdmin dept
      }

      const accessTokenExpiry = rememberMe ? "24h" : "1h"
      const refreshTokenExpiry = rememberMe ? "7d" : "24h"

      const accessToken =
        authData.accessToken ||
        createToken(
          {
            id: userData.id,
            username: userData.username,
            name: userData.name,
            department: userData.department, // Use actual department
            loginDepartment: departmentName, // Track where they logged in
            role: userData.role,
            permissions: userData.permissions,
            access_level: userData.access_level,
            isSuperAdmin: userData.isSuperAdmin,
          },
          accessTokenExpiry,
        )

      const refreshToken =
        authData.refreshToken ||
        createToken(
          {
            id: userData.id,
            type: "refresh",
            department: userData.department,
            loginDepartment: departmentName,
          },
          refreshTokenExpiry,
        )

      storeTokens(accessToken, refreshToken)

      const loginData = {
        ...userData,
        loginTime: new Date().toISOString(),
        tokenExpiry: rememberMe ? "24 hours" : "1 hour",
        hasValidToken: true,
      }

      login(loginData, departmentName)

      // Navigate to correct route
      if (departmentName === "superAdmin") {
        navigate("/jjcewgsaccess/superadmin")
      } else {
        const urlSlug = DEPARTMENT_NAME_TO_SLUG[departmentName] || deptSlug
        navigate(`/jjcewgsaccess/${urlSlug}`)
      }

      console.log("Login successful with JWT authentication")
    } else {
      clearTokens()
      setError(authData.message || authData.error || "Authentication failed")
    }
  } catch (err) {
    console.error("Authentication error:", err)
    clearTokens()

    if (err.name === "NetworkError" || !navigator.onLine) {
      setError("Network connection error. Please check your internet connection.")
    } else {
      setError(err.message || "Unable to connect to server. Please try again later.")
    }
  } finally {
    setIsLoading(false)
  }
}

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) {
      setError("")
    }
  }

  useEffect(() => {
    if (!isValidDepartment) {
      setIsInitializing(false)
      return
    }

    // Check for employee auto-login from sessionStorage (secure method)
    const urlParams = new URLSearchParams(window.location.search)
    const autoLogin = urlParams.get('autoLogin')
    const loginTypeParam = urlParams.get('loginType')

    if (autoLogin === 'true') {
      console.log('[LoginForm] Auto-login detected')
      
      try {
        // Get token from secure sessionStorage instead of URL
        const navAuth = sessionStorage.getItem('nav_auth_token')
        if (!navAuth) {
          console.log('[LoginForm] No nav auth token found in sessionStorage')
          window.history.replaceState({}, document.title, window.location.pathname)
          setIsInitializing(false)
          return
        }
        
        const authData = JSON.parse(navAuth)
        const decodedToken = authData.token
        const usernameParam = authData.username
        
        // Clear the temporary auth data immediately after reading
        sessionStorage.removeItem('nav_auth_token')
        
        // Verify the token
        const payload = verifyToken(decodedToken)
        
        if (payload) {
          console.log('[LoginForm] Token valid, logging in automatically...')
          console.log('[LoginForm] Token payload:', payload)
          
          // Remove URL parameters to clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Store the token
          storeTokens(decodedToken, false)
          
          // Set user data from token
          const userData = {
            id: payload.userId || payload.id,
            username: payload.username || usernameParam,
            name: payload.name,
            department: payload.department,
            role: payload.role || 'user',
            permissions: payload.permissions || [],
            access_level: payload.accessLevel || payload.access_level || 'user',
            loginTime: new Date().toISOString(),
            hasValidToken: true,
          }
          
          console.log('[LoginForm] User data prepared:', userData)
          
          login(userData, departmentName, decodedToken)
          
          // Navigate to the department page
          const urlSlug = DEPARTMENT_NAME_TO_SLUG[departmentName] || deptSlug
          console.log('[LoginForm] Navigating to:', `/jjcewgsaccess/${urlSlug}`)
          navigate(`/jjcewgsaccess/${urlSlug}`, { replace: true })
          
          setIsInitializing(false)
          return
        } else {
          console.warn('[LoginForm] Token verification failed')
        }
      } catch (error) {
        console.error('[LoginForm] Employee auto-login failed:', error)
      }
    }

    // Regular token check
    const existingToken = getStoredToken()
    if (existingToken) {
      const payload = verifyToken(existingToken)
      if (payload && payload.department === departmentName) {
        setHasValidToken(true)
      } else {
        setHasValidToken(false)
        clearTokens()
      }
    } else {
      setHasValidToken(false)
    }
    setIsInitializing(false)
  }, [departmentName, isValidDepartment, deptSlug, login, navigate])

  const handleContinueWithToken = () => {
    // FIXED: Navigate to correct route
    if (departmentName === "superAdmin") {
      navigate("/jjcewgsaccess/superadmin", { replace: true })
    } else {
      const urlSlug = DEPARTMENT_NAME_TO_SLUG[departmentName] || deptSlug
      navigate(`/jjcewgsaccess/${urlSlug}`, { replace: true })
    }
  }

  if (isInitializing) {
    return <GearLoadingSpinner isDarkMode={isDarkMode} />
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-8 transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 text-gray-100"
          : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 text-gray-900"
      }`}
    >
      <div className="max-w-md w-full">
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleDarkMode}
            className={`p-3 rounded-full backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode
                ? "bg-black/20 border-gray-700/20 hover:bg-black/30"
                : "bg-white/10 border-gray-300/20 hover:bg-white/20"
            }`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <button
          onClick={() => navigate("/jjcewgsaccess")}
          className={`mb-8 flex items-center transition-colors duration-200 ${
            isDarkMode
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <span className="mr-2">←</span>
          Back to Department Selection
        </button>

        <div
          className={`backdrop-blur-md rounded-2xl p-8 shadow-2xl border ${
            isDarkMode
              ? "bg-black/20 border-gray-700/20"
              : "bg-white/10 border-white/20"
          }`}
        >
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${deptInfo.color} ${deptInfo.darkColor} mb-4`}
            >
              <span className="text-2xl">{deptInfo.icon}</span>
            </div>
            <h2
              className={`text-2xl font-bold mb-2 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {deptInfo.name}
            </h2>
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              {departmentName === "superAdmin"
                ? "Administrator access required"
                : isValidDepartment
                  ? "Please sign in to access this department"
                  : "Invalid department selected"}
            </p>
          </div>

          {!isValidDepartment ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span
                  className={`mr-2 ${
                    isDarkMode ? "text-red-400" : "text-red-600"
                  }`}
                >
                  ⚠️
                </span>
                <span
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-red-400" : "text-red-600"
                  }`}
                >
                  Invalid Department
                </span>
              </div>
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                The department "{deptSlug}" is not valid. You will be redirected to the department selection page.
              </p>
              <p
                className={`text-xs mt-2 ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                Valid departments: {Object.keys(DEPARTMENT_SLUG_TO_NAME).join(", ")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {hasValidToken && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`mr-2 ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        Active session found
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleContinueWithToken}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    You're already signed in. Continue to dashboard or sign in with different credentials.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="mr-2">⚠️</span>
                    <span
                      className={`text-sm ${
                        isDarkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {error}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="username"
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    isDarkMode
                      ? "bg-black/10 border-gray-700/20 text-gray-200 focus:ring-slate-400"
                      : "bg-white/10 border-white/20 text-gray-800 focus:ring-slate-500"
                  }`}
                  placeholder="Enter your username"
                  required
                  disabled={isLoading || !isValidDepartment}
                  autoComplete="username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    isDarkMode
                      ? "bg-black/10 border-gray-700/20 text-gray-200 focus:ring-slate-400"
                      : "bg-white/10 border-white/20 text-gray-800 focus:ring-slate-500"
                  }`}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading || !isValidDepartment}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-3 h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  disabled={isLoading || !isValidDepartment}
                />
                <label
                  htmlFor="rememberMe"
                  className={`text-sm cursor-pointer ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Keep me signed in (24 hours)
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isValidDepartment}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white bg-gradient-to-r ${deptInfo.color} ${deptInfo.darkColor} hover:opacity-90 focus:outline-none focus:ring-2 transition-all duration-200 transform ${
                  isLoading || !isValidDepartment
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105"
                } ${
                  isDarkMode ? "focus:ring-slate-400" : "focus:ring-slate-500"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing In...
                  </span>
                ) : !isValidDepartment ? (
                  "Invalid Department"
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🔒</span>
                    Sign In Securely
                  </span>
                )}
              </button>
            </form>
          )}

          <div
            className={`mt-6 p-4 rounded-lg border ${
              isDarkMode
                ? "bg-black/10 border-gray-700/10"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">🔐</span>
              <p className="text-xs text-gray-500">Secure JWT Authentication</p>
            </div>
            <p
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Your session is protected with JSON Web Tokens and automatic expiration.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Contact your administrator if you need access to {deptInfo.name} department.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { getStoredToken, clearTokens, isTokenExpired, storeTokens, createToken }
export default LoginForm