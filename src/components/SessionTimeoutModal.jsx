import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, LogIn, X } from 'lucide-react'

/**
 * Session Timeout Modal
 * Displays when user is logged out from another tab or session expires
 */
export default function SessionTimeoutModal({ 
  isOpen, 
  onClose, 
  reason = "You've been logged out",
  userType = 'employee', // 'admin' or 'employee'
  isDarkMode = false 
}) {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSignIn = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
      if (userType === 'admin') {
        navigate('/jjcewgsaccess', { replace: true })
      } else {
        navigate('/employee/login', { replace: true })
      }
    }, 200)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
      // Navigate to appropriate landing page
      if (userType === 'admin') {
        navigate('/jjcewgsaccess', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }, 200)
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${isDarkMode ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-sm`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${
          isDarkMode 
            ? 'bg-zinc-900 border border-zinc-800' 
            : 'bg-white border border-zinc-200'
        } rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Header with warning color */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Session Timeout</h2>
              <p className="text-white/80 text-sm">Your session has ended</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-center mb-6 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {reason}
          </p>
          
          <p className={`text-center text-sm mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Please sign in again to continue using the application.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSignIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
            
            <button
              onClick={handleClose}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
              }`}
            >
              <X className="w-5 h-5" />
              Close
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className={`px-6 py-3 text-center text-xs ${
          isDarkMode ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-50 text-zinc-400'
        }`}>
          For security reasons, sessions are synchronized across all tabs
        </div>
      </div>
    </div>
  )
}
