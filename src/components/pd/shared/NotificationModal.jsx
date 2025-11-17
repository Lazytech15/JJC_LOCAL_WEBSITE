import { X, Check, CheckCheck, Trash2 } from "lucide-react"

export default function NotificationModal({ notification, isOpen, onClose, onMarkAsRead, onDismiss, isDarkMode }) {
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
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden rounded-lg sm:rounded-xl shadow-2xl bg-slate-900 border border-slate-700">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
              notification.priority === 'high' ? 'bg-red-500' :
              notification.priority === 'medium' ? 'bg-yellow-500' :
              notification.priority === 'low' ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white break-words">
                {notification.title}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{notification.time}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {notification.description}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
          <button
            onClick={handleDismiss}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-600 transition-colors"
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
