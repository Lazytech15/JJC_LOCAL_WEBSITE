import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Factory, Loader2, Wifi, WifiOff, ArrowLeft } from "lucide-react"
import { createToken, storeTokens, getStoredToken, clearTokens, isTokenExpired } from "../../utils/auth"
import { AuthService } from "../../utils/api/services/auth-service"
import { useAuth } from "../../contexts/AuthContext"

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

  const navigate = useNavigate()
  const { employeeLogin, isEmployeeAuthenticated } = useAuth()
  const authService = new AuthService()

  const departments = [
    { value: "", label: "Select Department" },
    { value: "Human Resources", label: "Human Resources" },
    { value: "Operation", label: "Operation" },
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
    // Check if user is already logged in
    if (isEmployeeAuthenticated) {
      navigate("/employee/dashboard", { replace: true })
    }
  }, [isEmployeeAuthenticated, navigate])

  const handleSubmit = async () => {
    setError("")
    setIsLoading(true)

    try {
      // Validate fields
      if (!username || !password || !department) {
        setError("Please fill in all fields.")
        setIsLoading(false)
        return
      }

      // Call login API
      const response = await authService.login({
        username,
        password,
        department
      })

      console.log("API Response:", response)

      if (response.success && response.user) {
        const userData = response.user

        // Create token with user data
        const token = createToken({
          userId: userData.id,
          username: userData.username,
          name: userData.name,
          department: userData.department,
          accessLevel: userData.access_level,
          role: userData.role,
          permissions: userData.permissions
        })

        // Store tokens
        storeTokens(token, rememberMe)

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
            loginTime: new Date().toISOString()
          })
        }

        console.log("Login successful:", {
          user: userData,
          token: token.substring(0, 20) + "..."
        })

        // Navigate based on role
        if (userData.role === 'super-admin') {
          navigate("/jjcewsaccess/super-admin", { replace: true })
        } else if (userData.role === 'admin' || userData.role === 'manager') {
          // Map department to route
          const deptRoutes = {
            'Human Resources': '/jjcewsaccess/hr',
            'Operation': '/jjcewsaccess/operations',
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
        setError("Login failed. Please try again.")
      }
    } catch (err) {
      console.error("Login error:", err)
      
      if (err.message.includes("404")) {
        setError("User not found or not authorized for this department.")
      } else if (err.message.includes("401")) {
        setError("Invalid credentials. Please check your password.")
      } else if (err.message.includes("400")) {
        setError("Invalid request. Please check all fields.")
      } else {
        setError("Login failed. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToHome = () => {
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Left Side - Carousel */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
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
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>

        <div className="absolute top-8 left-8 z-30 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <Factory className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white drop-shadow-lg">JJC Engineering Works</h1>
            <p className="text-xs text-white/90 drop-shadow">Since 1996</p>
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
              <Factory className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">JJC Engineering Works</h1>
            <p className="text-zinc-600">Employee Portal</p>
          </div>

          <div className="mb-6">
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-sm shadow-sm transition-all ${
                isOnline 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              <span className="text-sm font-medium">{isOnline ? "Connected" : "Offline Mode"}</span>
            </div>
          </div>

          <Card className="shadow-xl border border-zinc-200">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl text-zinc-900">Welcome Back</CardTitle>
              <CardDescription className="text-base">Sign in to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-base">
                    Department
                  </Label>
                  <Select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
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
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
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
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSubmit()
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base"
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
                      Keep me signed in
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
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} JJC Engineering Works. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}