import { X, Check, CheckCheck, Trash2 } from "lucide-react"
import { useAuth } from "../../../contexts/AuthContext"

export default function NotificationModal({ notification, isOpen, onClose, onMarkAsRead, onDismiss, isDarkMode: forcedDarkMode }) {
  // Allow parent to pass isDarkMode, else fall back to context
  const { isDarkMode: contextDark } = useAuth()
  const isDarkMode = typeof forcedDarkMode === 'boolean' ? forcedDarkMode : contextDark
  if (!isOpen || !notification) return null

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id)
    onClose()
  }

  const handleDismiss = () => {
    onDismiss(notification.id)
    onClose()
  }

  return (
  <div className="fixed inset-0 z-10001 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${isDarkMode ? 'bg-black/50' : 'bg-black/30'} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden rounded-lg sm:rounded-xl shadow-2xl border backdrop-blur-md ${
        isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b backdrop-blur-sm ${
          isDarkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
              notification.priority === 'high' ? 'bg-red-500' :
              notification.priority === 'medium' ? 'bg-yellow-500' :
              notification.priority === 'low' ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg sm:text-xl font-bold wrap-break-word ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {notification.title}
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{notification.time}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors shrink-0 ml-2 ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          <div className={`max-w-none ${isDarkMode ? 'prose prose-invert prose-slate' : ''}`}>
            <p className={`${isDarkMode ? 'text-slate-300' : 'text-gray-700'} leading-relaxed whitespace-pre-wrap`}>
              {notification.description}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`flex justify-end gap-3 p-6 border-t ${isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={handleDismiss}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              isDarkMode ? 'border-red-600/50 text-red-300 hover:bg-red-600/10 hover:border-red-600' : 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Dismiss
          </button>
          {!notification.read && (
            <button
              onClick={handleMarkAsRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark as Read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
