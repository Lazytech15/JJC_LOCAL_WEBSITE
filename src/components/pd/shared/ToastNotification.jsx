import { useState, useEffect, createContext, useContext, useCallback } from "react"

// Toast Context
const ToastContext = createContext()

// Custom hook for using toast
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // Check for duplicates within 1 second
  const isDuplicate = useCallback((newToast) => {
    const now = Date.now()
    return toasts.some(toast => 
      toast.title === newToast.title &&
      toast.message === newToast.message &&
      toast.type === newToast.type &&
      (now - toast.timestamp) < 1000
    )
  }, [toasts])

  const showToast = useCallback((title, message = "", type = "success", duration = 4000) => {
    const newToast = {
      id: Date.now() + Math.random(),
      title,
      message,
      type,
      timestamp: Date.now(),
      duration
    }

    // Prevent duplicates
    if (isDuplicate(newToast)) {
      return
    }

    setToasts(prev => {
      // Limit to 3 toasts max
      const updated = [newToast, ...prev].slice(0, 3)
      return updated
    })

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(newToast.id)
      }, duration)
    }
  }, [isDuplicate])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const value = {
    toasts,
    showToast,
    dismissToast,
    success: (title, message = "") => showToast(title, message, "success", 4000),
    error: (title, message = "") => showToast(title, message, "error", 6000),
    warning: (title, message = "") => showToast(title, message, "warning", 5000),
    info: (title, message = "") => showToast(title, message, "info", 4000),
    loading: (title, message = "") => showToast(title, message, "loading", 0)
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

// Toast Container Component
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none max-w-md w-full sm:max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// Individual Toast Component
function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300) // Match animation duration
  }

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-green-500/95 dark:bg-green-600/95",
          border: "border-green-400 dark:border-green-500",
          icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case "error":
        return {
          bg: "bg-red-500/95 dark:bg-red-600/95",
          border: "border-red-400 dark:border-red-500",
          icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      case "warning":
        return {
          bg: "bg-yellow-500/95 dark:bg-yellow-600/95",
          border: "border-yellow-400 dark:border-yellow-500",
          icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      case "info":
        return {
          bg: "bg-blue-500/95 dark:bg-blue-600/95",
          border: "border-blue-400 dark:border-blue-500",
          icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case "loading":
        return {
          bg: "bg-blue-500/95 dark:bg-blue-600/95",
          border: "border-blue-400 dark:border-blue-500",
          icon: (
            <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )
        }
      default:
        return {
          bg: "bg-gray-500/95 dark:bg-gray-600/95",
          border: "border-gray-400 dark:border-gray-500",
          icon: null
        }
    }
  }

  const styles = getToastStyles()

  return (
    <div
      className={`
        ${styles.bg} ${styles.border}
        text-white border-l-4 px-4 py-3 rounded-lg shadow-2xl
        backdrop-blur-md transform transition-all duration-300 ease-out
        pointer-events-auto
        ${isExiting 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100 animate-slide-in-right'
        }
        hover:scale-[1.02] hover:shadow-xl
      `}
      role="alert"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        {styles.icon && (
          <div className="mt-0.5 transition-transform duration-300 hover:scale-110">
            {styles.icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-0.5 break-words">
              {toast.title}
            </div>
          )}
          {toast.message && (
            <div className="text-sm opacity-95 break-words">
              {toast.message}
            </div>
          )}
        </div>
        
        {toast.type !== "loading" && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white/20 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Add animation styles to global CSS or use inline styles
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

export default ToastProvider
