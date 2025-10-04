import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { createToken, storeTokens, getStoredToken, clearTokens, isTokenExpired, verifyToken } from "../utils/auth"
import apiService from "../../src/utils/api/api-service"

// Department slug to name mapping
const DEPARTMENT_SLUG_TO_NAME = {
  "hr": "Human Resources",
  "operations": "Operations",
  "finance": "Finance",
  "procurement": "Procurement",
  "engineering": "Engineering",
  "super-admin": "super-admin"
}

// Reverse mapping
const DEPARTMENT_NAME_TO_SLUG = {
  "Human Resources": "hr",
  "Operations": "operations",
  "Finance": "finance",
  "Procurement": "procurement",
  "Engineering": "engineering",
  "super-admin": "super-admin"
}

const departmentInfo = {
  "Human Resources": {
    name: "Human Resources",
    icon: "👥",
    color: "from-slate-600 to-slate-700",
    darkColor: "dark:from-slate-700 dark:to-slate-800",
  },
  Operation: {
    name: "Operatios",
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
  "super-admin": {
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
  const { department: deptSlug } = useParams() // Gets URL slug like "hr", "operations", etc.
  const navigate = useNavigate()
  const { login, isDarkMode, toggleDarkMode } = useAuth()
  const [formData, setFormData] = useState({ username: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)

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
      // Optional: Redirect to home after a delay
      setTimeout(() => {
        navigate("/jjcewgsaccess")
      }, 3000)
    }
  }, [deptSlug, isValidDepartment, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check if department is valid before proceeding
    if (!isValidDepartment) {
      setError("Invalid department selected. Please go back and select a valid department.")
      return
    }

    setIsLoading(true)
    setError("")

    // Validate input
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please enter both username and password")
      setIsLoading(false)
      return
    }

    try {
      const authData = await apiService.auth.login({
        username: formData.username.trim(),
        password: formData.password,
        department: departmentName, // Use the full department name
      })

      if (authData.success) {
        // Prepare user data for JWT
        const userData = {
          id: authData.user.id,
          username: authData.user.username,
          name: authData.user.name,
          department: departmentName, // Use the full department name
          role: authData.user.role,
          permissions: authData.user.permissions || [],
          access_level: authData.user.access_level,
        }

        // Create JWT tokens
        const accessTokenExpiry = rememberMe ? "24h" : "1h"
        const refreshTokenExpiry = rememberMe ? "7d" : "24h"

        const accessToken =
          authData.accessToken ||
          createToken(
            {
              id: userData.id,
              username: userData.username,
              name: userData.name,
              department: departmentName, // Use the full department name
              role: userData.role,
              permissions: userData.permissions,
              access_level: userData.access_level,
            },
            accessTokenExpiry,
          )

        const refreshToken =
          authData.refreshToken ||
          createToken(
            {
              id: userData.id,
              type: "refresh",
              department: departmentName, // Use the full department name
            },
            refreshTokenExpiry,
          )

        // Store tokens
        storeTokens(accessToken, refreshToken)

        // Add login timestamp and token info
        const loginData = {
          ...userData,
          loginTime: new Date().toISOString(),
          tokenExpiry: rememberMe ? "24 hours" : "1 hour",
          hasValidToken: true,
        }

        // Login user
        login(loginData, departmentName)

        // Navigate to department dashboard with URL slug
        if (departmentName === "super-admin") {
          navigate("/jjcewgsaccess/super-admin")
        } else {
          const urlSlug = DEPARTMENT_NAME_TO_SLUG[departmentName] || deptSlug
          navigate(`/jjcewgsaccess/${urlSlug}`)
        }

        // Optional: Show success message
        console.log("Login successful with JWT authentication")
      } else {
        // Clear any existing tokens on failed auth
        clearTokens()
        setError(authData.message || authData.error || "Authentication failed")
      }
    } catch (err) {
      console.error("Authentication error:", err)
      clearTokens()

      // Network error handling
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
    // Clear error when user starts typing
    if (error) {
      setError("")
    }
  }

  // Check for existing valid token on component mount
  useEffect(() => {
    if (!isValidDepartment) return

    const existingToken = getStoredToken()
    if (existingToken) {
      const payload = verifyToken(existingToken)
      if (payload && payload.department === departmentName) {
        setHasValidToken(true)
      } else {
        setHasValidToken(false)
        // Clear invalid or expired tokens
        clearTokens()
      }
    } else {
      setHasValidToken(false)
    }
  }, [departmentName, isValidDepartment])

  const handleContinueWithToken = () => {
    if (departmentName === "super-admin") {
      navigate("/jjcewgsaccess/super-admin", { replace: true })
    } else {
      const urlSlug = DEPARTMENT_NAME_TO_SLUG[departmentName] || deptSlug
      navigate(`/jjcewgsaccess/${urlSlug}`, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-gray-900 dark:to-stone-900 transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleDarkMode}
            className="p-3 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-gray-300/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <button
          onClick={() => navigate("/jjcewgsaccess")}
          className="mb-8 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
        >
          <span className="mr-2">←</span>
          Back to Department Selection
        </button>

        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20">
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${deptInfo.color} ${deptInfo.darkColor} mb-4`}
            >
              <span className="text-2xl">{deptInfo.icon}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{deptInfo.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {departmentName === "super-admin"
                ? "Administrator access required"
                : isValidDepartment
                  ? "Please sign in to access this department"
                  : "Invalid department selected"}
            </p>
          </div>

          {!isValidDepartment ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                <span className="text-red-600 dark:text-red-400 text-sm font-medium">Invalid Department</span>
              </div>
              <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                The department "{deptSlug}" is not valid. You will be redirected to the department selection page.
              </p>
              <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                Valid departments: {Object.keys(DEPARTMENT_SLUG_TO_NAME).join(", ")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {hasValidToken && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">
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
                  <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                    You're already signed in. Continue to dashboard or sign in with different credentials.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                  <div className="flex items-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 dark:bg-black/10 border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your username"
                  required
                  disabled={isLoading || !isValidDepartment}
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 dark:bg-black/10 border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent transition-all duration-200"
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
                <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  Keep me signed in (24 hours)
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isValidDepartment}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white bg-gradient-to-r ${deptInfo.color} ${deptInfo.darkColor} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-all duration-200 transform ${isLoading || !isValidDepartment ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
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

          <div className="mt-6 p-4 bg-white/5 dark:bg-black/10 rounded-lg border border-white/10 dark:border-gray-700/10">
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">🔐</span>
              <p className="text-xs text-gray-500 dark:text-gray-500">Secure JWT Authentication</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your session is protected with JSON Web Tokens and automatic expiration.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Contact your administrator if you need access to {deptInfo.name} department.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export utility functions for use in other components
export { getStoredToken, clearTokens, isTokenExpired, storeTokens, createToken }
export default LoginForm