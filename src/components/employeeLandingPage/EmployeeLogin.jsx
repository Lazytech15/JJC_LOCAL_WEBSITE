import { useState, useEffect } from "react"
import { Factory, Loader2, Wifi, WifiOff, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"

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

export default function EmployeeLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isOnline] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Carousel images
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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!username || !password) {
        setError("Please fill in all fields.")
        return
      }

      const employeeData = {
        id: "emp-001",
        username,
        name: "John Doe",
        employeeId: "JJC-2024-001",
        department: "Engineering",
        position: "Senior Engineer",
        loginTime: new Date().toISOString(),
      }

      console.log("Login successful:", employeeData)
      alert("Login successful! Redirecting to dashboard...")
    } catch (err) {
      setError("Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToHome = () => {
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Left Side - Carousel */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        {/* Carousel Images */}
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
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-900/60" />
              
              {/* Content */}
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

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all border border-white/30 shadow-lg"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all border border-white/30 shadow-lg"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Carousel Indicators */}
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

        {/* Company Logo Overlay */}
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
        {/* Back Button */}
        <button
          onClick={handleBackToHome}
          className="absolute top-6 left-6 flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors font-medium group z-20"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-3xl mb-4 shadow-xl">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">JJC Engineering Works</h1>
            <p className="text-zinc-600">Employee Portal</p>
          </div>

          {/* Online Status Badge */}
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

          {/* Login Card */}
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

          {/* Footer Text */}
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