import { useAuth } from "../../contexts/AuthContext"

// Card Components
export const Card = ({ children, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <div className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
      isDarkMode 
        ? "border-zinc-800 bg-zinc-900" 
        : "border-zinc-200 bg-white"
    } ${className}`}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${
      isDarkMode ? "text-white" : "text-zinc-900"
    } ${className}`}>
      {children}
    </h3>
  )
}

export const CardDescription = ({ children, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <p className={`text-sm ${
      isDarkMode ? "text-zinc-400" : "text-zinc-500"
    } ${className}`}>
      {children}
    </p>
  )
}

export const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
)

// Badge Component
export const Badge = ({ children, variant = "default", className = "" }) => {
  const { isDarkMode } = useAuth()
  
  const variants = {
    default: isDarkMode 
      ? "bg-zinc-800 text-white hover:bg-zinc-700" 
      : "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: isDarkMode 
      ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" 
      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: isDarkMode 
      ? "border border-zinc-700 text-zinc-300 hover:bg-zinc-800" 
      : "border border-zinc-300 text-zinc-900 hover:bg-zinc-50",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
  }

  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

// Button Component
export const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const { isDarkMode } = useAuth()
  
  const variants = {
    default: isDarkMode 
      ? "bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-900" 
      : "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950",
    destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
    outline: isDarkMode 
      ? "border-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white active:bg-zinc-800" 
      : "border-2 border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 active:bg-zinc-100",
    secondary: isDarkMode 
      ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-800" 
      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300",
    ghost: isDarkMode 
      ? "hover:bg-zinc-800 text-zinc-300 active:bg-zinc-700" 
      : "hover:bg-zinc-100 text-zinc-700 active:bg-zinc-200",
    link: isDarkMode 
      ? "text-zinc-300 underline-offset-4 hover:underline" 
      : "text-zinc-900 underline-offset-4 hover:underline",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-lg px-8 text-base",
    icon: "h-10 w-10",
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Input Component
export const Input = ({ className = "", ...props }) => {
  const { isDarkMode } = useAuth()
  return (
    <input
      className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        isDarkMode 
          ? "border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-zinc-600" 
          : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
      } ${className}`}
      {...props}
    />
  )
}

// Label Component
export const Label = ({ children, htmlFor, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
        isDarkMode ? "text-zinc-300" : "text-zinc-700"
      } ${className}`}
    >
      {children}
    </label>
  )
}

// Checkbox Component
export const Checkbox = ({ checked, onCheckedChange, className = "", ...props }) => {
  const { isDarkMode } = useAuth()
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`peer h-5 w-5 shrink-0 rounded border-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
        checked 
          ? isDarkMode 
            ? "bg-zinc-700 border-zinc-700 text-white" 
            : "bg-zinc-900 border-zinc-900 text-white"
          : isDarkMode 
            ? "bg-zinc-900 border-zinc-700 hover:border-zinc-600" 
            : "bg-white border-zinc-300 hover:border-zinc-400"
      } ${className}`}
      {...props}
    >
      {checked && (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// Avatar Components
export const Avatar = ({ children, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ${
      isDarkMode ? "ring-zinc-700" : "ring-zinc-200"
    } ${className}`}>
      {children}
    </div>
  )
}

export const AvatarImage = ({ src, alt, className = "" }) => (
  <img
    src={src}
    alt={alt}
    className={`aspect-square h-full w-full object-cover ${className}`}
  />
)

export const AvatarFallback = ({ children, className = "" }) => {
  const { isDarkMode } = useAuth()
  return (
    <div className={`flex h-full w-full items-center justify-center rounded-full font-semibold text-sm ${
      isDarkMode 
        ? "bg-zinc-800 text-zinc-300" 
        : "bg-zinc-100 text-zinc-700"
    } ${className}`}>
      {children}
    </div>
  )
}