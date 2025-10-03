import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Factory, Loader2, Wifi, WifiOff, ArrowLeft } from "lucide-react"
import { createToken, storeTokens, getStoredToken, clearTokens, isTokenExpired, verifyToken } from "../../utils/auth"
import { AuthService } from "../../utils/api/services/auth-service"
import { useAuth } from "../../contexts/AuthContext"
import logo from "../../assets/companyLogo.jpg"

const Button = ({ children, className = "", disabled = false, type = "button", onClick, ...props }) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
)

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 outline-none transition-all ${className}`}
    {...props}
  />
)

const Label = ({ children, htmlFor, className = "" }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-zinc-700 mb-1 ${className}`}>
    {children}
  </label>
)

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = "" }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = "" }) => (
  <h2 className={`font-bold ${className}`}>{children}</h2>
)

const CardDescription = ({ children, className = "" }) => (
  <p className={`text-zinc-600 ${className}`}>{children}</p>
)

const CardContent = ({ children }) => <div className="p-6 pt-0">{children}</div>

const Checkbox = ({ id, checked, onCheckedChange, disabled }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className="w-4 h-4 text-zinc-600 border-zinc-300 rounded focus:ring-2 focus:ring-zinc-500"
  />
)

const Select = ({ value, onChange, children, className = "", disabled }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-lg border border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 outline-none transition-all bg-white ${className}`}
  >
    {children}
  </select>
)

export default function EmployeeLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [department, setDepartment] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [hasValidToken, setHasValidToken] = useState(false)

  const navigate = useNavigate()
  const { employeeLogin, isEmployeeAuthenticated } = useAuth()
  const authService = new AuthService()

  const departments = [
    { value: "", label: "Select Department" },
    { value: "Human Resources", label: "Human Resources" },
    { value: "Operations", label: "Operation" },
    { value: "Finance", label: "Finance" },
    { value: "Procurement", label: "Procurement" },
    { value: "Engineering", label: "Engineering" },
    { value: "super-admin", label: "Super Admin" }
  ]

  const carouselImages = [
    {
      url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1920&q=80",
      title: "Precision Engineering",
      description: "State-of-the-art machinery and equipment"
    },
    {
      url: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1920&q=80",
      title: "Modern Facilities",
      description: "Advanced manufacturing capabilities"
    },
    {
      url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1920&q=80",
      title: "Expert Craftsmanship",
      description: "Decades of engineering excellence"
    },
    {
      url: "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1920&q=80",
      title: "Quality Fabrication",
      description: "Industrial solutions you can trust"
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isEmployeeAuthenticated) {
      navigate("/employee/dashboard", { replace: true })
    }
  }, [isEmployeeAuthenticated, navigate])

  // Check for existing valid token
  useEffect(() => {
    const existingToken = getStoredToken()
    if (existingToken && !isTokenExpired(existingToken)) {
      const payload = verifyToken(existingToken)
      if (payload) {
        setHasValidToken(true)
      }
    } else {
      setHasValidToken(false)
      clearTokens()
    }
  }, [])

  const handleContinueWithToken = () => {
    const existingToken = getStoredToken()
    if (existingToken) {
      const payload = verifyToken(existingToken)
      if (payload && payload.role) {
        // Navigate based on stored role
        if (payload.role === 'super-admin') {
          navigate("/jjcewsaccess/super-admin", { replace: true })
        } else if (payload.role === 'admin' || payload.role === 'manager') {
          const deptRoutes = {
            'Human Resources': '/jjcewsaccess/hr',
            'Operations': '/jjcewsaccess/operations',
            'Finance': '/jjcewsaccess/finance',
            'Procurement': '/jjcewsaccess/procurement',
            'Engineering': '/jjcewsaccess/engineering'
          }
          const route = deptRoutes[payload.department] || '/jjcewsaccess'
          navigate(route, { replace: true })
        } else {
          navigate("/employee/dashboard", { replace: true })
        }
      }
    }
  }

  const handleSubmit = async () => {
    setError("")
    setIsLoading(true)

    try {
      // Validate fields
      if (!username.trim() || !password.trim() || !department) {
        setError("Please fill in all fields.")
        setIsLoading(false)
        return
      }

      // Call login API
      const response = await authService.login({
        username: username.trim(),
        password,
        department
      })

      console.log("API Response:", response)

      if (response.success && response.user) {
        const userData = response.user

        // Create JWT tokens
        const accessTokenExpiry = rememberMe ? "24h" : "1h"
        const refreshTokenExpiry = rememberMe ? "7d" : "24h"

        const accessToken = response.accessToken || createToken({
          userId: userData.id,
          username: userData.username,
          name: userData.name,
          department: userData.department,
          accessLevel: userData.access_level,
          role: userData.role,
          permissions: userData.permissions
        }, accessTokenExpiry)

        const refreshToken = response.refreshToken || createToken({
          id: userData.id,
          type: "refresh",
          department: userData.department
        }, refreshTokenExpiry)

        // Store tokens
        storeTokens(accessToken, refreshToken)

        // Update AuthContext with employee data
        if (employeeLogin) {
          employeeLogin({
            id: userData.id,
            name: userData.name,
            username: userData.username,
            employeeId: `JJC-${userData.id}`,
            department: userData.department,
            position: userData.access_level,
            role: userData.role,
            permissions: userData.permissions,
            loginTime: new Date().toISOString(),
            tokenExpiry: rememberMe ? "24 hours" : "1 hour",
            hasValidToken: true
          })
        }

        console.log("Login successful with JWT authentication")

        // Navigate based on role
        if (userData.role === 'super-admin') {
          navigate("/jjcewsaccess/super-admin", { replace: true })
        } else if (userData.role === 'admin' || userData.role === 'manager') {
          const deptRoutes = {
            'Human Resources': '/jjcewsaccess/hr',
            'Operations': '/jjcewsaccess/operations',
            'Finance': '/jjcewsaccess/finance',
            'Procurement': '/jjcewsaccess/procurement',
            'Engineering': '/jjcewsaccess/engineering'
          }
          const route = deptRoutes[userData.department] || '/jjcewsaccess'
          navigate(route, { replace: true })
        } else {
          navigate("/employee/dashboard", { replace: true })
        }
      } else {
        clearTokens()
        setError(response.message || response.error || "Authentication failed")
      }
    } catch (err) {
      console.error("Login error:", err)
      clearTokens()

      // Network error handling
      if (err.name === "NetworkError" || !navigator.onLine) {
        setError("Network connection error. Please check your internet connection.")
      } else if (err.message.includes("404")) {
        setError("User not found or not authorized for this department.")
      } else if (err.message.includes("401")) {
        setError("Invalid credentials. Please check your password.")
      } else if (err.message.includes("400")) {
        setError("Invalid request. Please check all fields.")
      } else {
        setError(err.message || "Unable to connect to server. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    if (field === 'username') setUsername(value)
    if (field === 'password') setPassword(value)
    if (field === 'department') setDepartment(value)

    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleBackToHome = () => {
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-zinc-50 overflow-hidden flex">
      {/* Left Side - Carousel */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <div className="absolute inset-0">
          {carouselImages.map((item, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-900/60" />

              <div className="absolute inset-0 flex flex-col justify-end p-12">
                <div className="max-w-2xl">
                  <h2 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                    {item.title}
                  </h2>
                  <p className="text-xl text-white/90 drop-shadow-lg">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                }`}
            />
          ))}
        </div>

        <div className="absolute top-8 left-8 z-30 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <img
                              src={logo}
                              alt="JJC Engineering Works Logo"
                              className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
                            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white drop-shadow-lg">JJCEWGS</h1>
            <p className="text-xs text-white/90 drop-shadow">JJC Engineering Works & General Services</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 lg:p-12 relative">
        <button
          onClick={handleBackToHome}
          className="absolute top-6 left-6 flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors font-medium group z-20"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>

        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-3xl mb-4 shadow-xl">
              <img
                              src={logo}
                              alt="JJC Engineering Works Logo"
                              className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
                            />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">JJC Engineering Works & General Services</h1>
            <p className="text-zinc-600">Employee Portal</p>
          </div>



          <Card className="shadow-xl border border-zinc-200 mt-5">
            <CardHeader className="relative space-y-1 pb-4">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></span>
              </div>
              <CardTitle className="text-2xl text-zinc-900">Welcome Back</CardTitle>
              <CardDescription className="text-base">Sign in to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {hasValidToken && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span className="text-green-600 text-sm font-medium">Active session found</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleContinueWithToken}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                    <p className="text-green-600 text-xs">
                      You're already signed in. Continue to dashboard or sign in with different credentials.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">⚠️</span>
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-base">
                    Department
                  </Label>
                  <Select
                    id="department"
                    value={department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
                  >
                    {departments.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSubmit()
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base"
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none text-zinc-700 cursor-pointer select-none"
                    >
                      Keep me signed in (24 hours)
                    </label>
                  </div>
                  <a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full h-12 text-base bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">🔒</span>
                      Sign In Securely
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">🔐</span>
              <p className="text-xs text-zinc-600 font-medium">Secure JWT Authentication</p>
            </div>
            <p className="text-xs text-zinc-500">
              Your session is protected with JSON Web Tokens and automatic expiration.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} JJCEWGS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}