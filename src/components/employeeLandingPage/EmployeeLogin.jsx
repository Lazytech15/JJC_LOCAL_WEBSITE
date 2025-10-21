import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Factory, Loader2, Wifi, WifiOff, ArrowLeft, Sun, Moon } from "lucide-react"
import { createToken, storeTokens, getStoredToken, clearTokens, isTokenExpired, verifyToken } from "../../utils/auth"
import { AuthService } from "../../utils/api/services/auth-service"
import { useAuth } from "../../contexts/AuthContext"
import logo from "../../assets/companyLogo.jpg"
import GearLoadingSpinner from "../../../public/LoadingGear"
import apiService from '../../utils/api/api-service'

const Button = ({ children, className = "", disabled = false, type = "button", onClick, isDarkMode = false, ...props }) => (
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

const Input = ({ className = "", isDarkMode = false, ...props }) => (
  <input
    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all ${
      isDarkMode
        ? "bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder-gray-500 focus:border-gray-500 focus:ring-gray-700"
        : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
    } ${className}`}
    {...props}
  />
)

const Label = ({ children, htmlFor, className = "", isDarkMode = false }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-zinc-700"} ${className}`}>
    {children}
  </label>
)

const Card = ({ children, className = "", isDarkMode = false }) => (
  <div className={`rounded-2xl ${isDarkMode ? "bg-gray-800/50 border border-gray-700/50" : "bg-white"} ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = "" }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = "", isDarkMode = false }) => (
  <h2 className={`font-bold ${isDarkMode ? "text-gray-100" : "text-zinc-900"} ${className}`}>
    {children}
  </h2>
)

const CardDescription = ({ children, className = "", isDarkMode = false }) => (
  <p className={`${isDarkMode ? "text-gray-400" : "text-zinc-600"} ${className}`}>
    {children}
  </p>
)

const CardContent = ({ children }) => <div className="p-6 pt-0">{children}</div>

const Checkbox = ({ id, checked, onCheckedChange, disabled, isDarkMode = false }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className={`w-4 h-4 rounded focus:ring-2 focus:ring-offset-0 ${
      isDarkMode
        ? "bg-gray-800 border-gray-600 text-gray-500 focus:ring-gray-700"
        : "text-zinc-600 border-zinc-300 focus:ring-zinc-500"
    }`}
  />
)

const Select = ({ value, onChange, children, className = "", disabled, isDarkMode = false }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all ${
      isDarkMode
        ? "bg-gray-800/50 border-gray-600/50 text-gray-100 focus:border-gray-500 focus:ring-gray-700"
        : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200 bg-white"
    } ${className}`}
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
  const [isInitializing, setIsInitializing] = useState(true)
  const [carouselImages, setCarouselImages] = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(true)

  const navigate = useNavigate()
  const { employeeLogin, isEmployeeAuthenticated, isDarkMode, toggleDarkMode } = useAuth()
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

  const defaultCarouselData = [
    {
      title: "Precision Engineering",
      description: "State-of-the-art machinery and equipment"
    },
    {
      title: "Friendly Employee",
      description: "Employee love their works"
    },
    {
      title: "Expert Craftsmanship",
      description: "Decades of engineering excellence"
    },
    {
      title: "Quality Fabrication",
      description: "Industrial solutions you can trust"
    },
  ]

  // Load landing page images for carousel
  useEffect(() => {
  const loadCarouselImages = async () => {
    try {
      // DON'T set loading state - let UI render immediately
      
      // Get list of images (cached automatically)
      const response = await apiService.profiles.getLandingImages()
      
      if (response.success && response.data.images.length > 0) {
        // Map to URLs immediately without waiting for cache
        const images = response.data.images.map((img, index) => ({
          // Use direct server URL first
          url: apiService.profiles.getLandingImageUrl(img.filename),
          title: defaultCarouselData[index]?.title || "JJC Engineering Works",
          description: defaultCarouselData[index]?.description || "Excellence in engineering",
          filename: img.filename
        }))
        
        // Set images immediately - UI renders right away
        setCarouselImages(images)
        
        // Cache in background without blocking
        images.forEach(async (img) => {
          try {
            await apiService.profiles.getLandingImageBlob(img.filename)
            console.log(`[Carousel] Cached in background: ${img.filename}`)
          } catch (error) {
            console.warn(`[Carousel] Background cache failed: ${img.filename}`)
          }
        })
      } else {
        setCarouselImages([])
      }
    } catch (error) {
      console.error("Error loading carousel images:", error)
      setCarouselImages([])
    }
  }

  loadCarouselImages()
}, [])

  useEffect(() => {
    if (carouselImages.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [carouselImages.length])

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
    setIsInitializing(false)
  }, [])

  const handleContinueWithToken = () => {
    const existingToken = getStoredToken()
    if (existingToken) {
      const payload = verifyToken(existingToken)
      if (payload && payload.role) {
        if (payload.role === 'super-admin') {
          navigate("/jjcewgsaccess/super-admin", { replace: true })
        } else if (payload.role === 'admin' || payload.role === 'manager') {
          const deptRoutes = {
            'Human Resources': '/jjcewgsaccess/hr',
            'Operations': '/jjcewgsaccess/operations',
            'Finance': '/jjcewgsaccess/finance',
            'Procurement': '/jjcewgsaccess/procurement',
            'Engineering': '/jjcewgsaccess/engineering'
          }
          const route = deptRoutes[payload.department] || '/jjcewgsaccess'
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
      if (!username.trim() || !password.trim() || !department) {
        setError("Please fill in all fields.")
        setIsLoading(false)
        return
      }

      const response = await authService.login({
        username: username.trim(),
        password,
        department
      })

      console.log("API Response:", response)

      if (response.success && response.user) {
        const userData = response.user

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

        storeTokens(accessToken, refreshToken)

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

        if (userData.role === 'super-admin') {
          navigate("/jjcewgsaccess/super-admin", { replace: true })
        } else if (userData.role === 'admin' || userData.role === 'manager') {
          const deptRoutes = {
            'Human Resources': '/jjcewgsaccess/hr',
            'Operations': '/jjcewgsaccess/operations',
            'Finance': '/jjcewgsaccess/finance',
            'Procurement': '/jjcewgsaccess/procurement',
            'Engineering': '/jjcewgsaccess/engineering'
          }
          const route = deptRoutes[userData.department] || '/jjcewgsaccess'
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

    if (error) setError("")
  }

  const handleBackToHome = () => {
    navigate("/")
  }

if (isInitializing) {
  return <GearLoadingSpinner isDarkMode={isDarkMode} />
}
  const currentImage = carouselImages[currentSlide]

  return (
    <div className={`min-h-screen overflow-hidden flex transition-colors duration-300 ${
      isDarkMode ? "bg-gray-900" : "bg-zinc-50"
    }`}>
      {/* Left Side - Carousel (Desktop) */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        {carouselImages.length > 0 ? (
          <>
            <div className="absolute inset-0">
              {carouselImages.map((item, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    isDarkMode 
                      ? "from-black/80 via-gray-900/70 to-black/80"
                      : "from-zinc-900/60 via-zinc-900/40 to-zinc-900/60"
                  }`} />

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

            {carouselImages.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${
            isDarkMode ? "bg-gray-900" : "bg-zinc-900"
          }`}>
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">JJC Engineering Works</h2>
              <p className="text-xl text-white/80">Excellence in Industrial Solutions</p>
            </div>
          </div>
        )}

        <div className="absolute top-8 left-8 z-30 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <img
              src={logo}
              alt="JJC Engineering Works Logo"
              className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
            />
          </div>
          <div className="flex justify-center text-white drop-shadow-lg">
            <div className="flex gap-2 text-center items-center">
              <h1 className="text-5xl califoniaFont font-extrabold tracking-wide">JJC</h1>
              <div className="text-left">
                <p className="text-sm font-semibold califoniaFont uppercase leading-tight">Engineering Works</p>
                <hr className="border-white/70" />
                <p className="text-sm font-semibold califoniaFont uppercase text-white">& General Services</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form & Mobile Background */}
      <div className="w-full lg:w-[42%] flex flex-col items-center justify-center p-6 lg:p-12 relative min-h-screen">
        {/* Mobile Background with Blur */}
        {currentImage && (
          <div className="lg:hidden absolute inset-0 z-0">
            <img
              src={currentImage.url}
              alt={currentImage.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 backdrop-blur-md bg-black/40" />
          </div>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={`absolute top-6 right-6 p-3 rounded-full backdrop-blur-sm border transition-all duration-300 z-20 ${
            isDarkMode
              ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 text-gray-100"
              : "bg-white/50 border-zinc-300/50 hover:bg-white/70 text-zinc-900"
          }`}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={handleBackToHome}
          className={`absolute top-6 left-6 flex items-center gap-2 transition-colors font-medium group z-20 ${
            isDarkMode
              ? "text-gray-400 hover:text-gray-100"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>

        <div className="w-full max-w-md relative z-10 flex flex-col">
          <div className="lg:hidden mb-12">
            <div className="flex justify-center items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <img
                  src={logo}
                  alt="JJC Engineering Works Logo"
                  className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">JJC</h1>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase leading-tight text-white drop-shadow-lg">Engineering Works</p>
                  <hr className="border-white/70 my-0.5" />
                  <p className="text-xs font-semibold uppercase text-white drop-shadow-lg">& General Services</p>
                </div>
              </div>
            </div>
          </div>

          <Card className={`shadow-2xl backdrop-blur-sm ${isDarkMode ? "bg-gray-800/80 border-gray-700/50" : "bg-white/90 border-white/30"}`} isDarkMode={isDarkMode}>
            <CardHeader className="relative space-y-1 pb-4">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></span>
              </div>
              <CardTitle className="text-2xl" isDarkMode={isDarkMode}>Welcome Back</CardTitle>
              <CardDescription className="text-base" isDarkMode={isDarkMode}>Sign in to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {hasValidToken && (
                  <div className={`border rounded-xl p-4 ${
                    isDarkMode
                      ? "bg-green-900/20 border-green-800/50"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span className={`text-sm font-medium ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}>Active session found</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleContinueWithToken}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                    <p className={`text-xs ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                      You're already signed in. Continue to dashboard or sign in with different credentials.
                    </p>
                  </div>
                )}

                {error && (
                  <div className={`p-4 border rounded-xl ${
                    isDarkMode
                      ? "bg-red-900/20 border-red-800/50"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">⚠️</span>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? "text-red-400" : "text-red-600"
                      }`}>{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-base" isDarkMode={isDarkMode}>
                    Department
                  </Label>
                  <Select
                    id="department"
                    value={department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
                    isDarkMode={isDarkMode}
                  >
                    {departments.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base" isDarkMode={isDarkMode}>
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
                    isDarkMode={isDarkMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base" isDarkMode={isDarkMode}>
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
                    isDarkMode={isDarkMode}
                  />
                </div>

                <div className="flex items-center justify-center h-full w-full">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                      disabled={isLoading}
                      isDarkMode={isDarkMode}
                    />
                    <label
                      htmlFor="remember"
                      className={`text-sm font-medium leading-none cursor-pointer select-none ${
                        isDarkMode ? "text-gray-300" : "text-zinc-700"
                      }`}
                    >
                      Keep me signed in (24 hours)
                    </label>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  className={`w-full h-12 text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                  disabled={isLoading}
                  isDarkMode={isDarkMode}
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

          <div className="mt-8 text-center">
            <p className={`text-sm drop-shadow-lg ${isDarkMode ? "text-gray-400" : "text-white/80"}`}>
              © {new Date().getFullYear()} JJCEWGS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}