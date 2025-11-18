import { memo } from "react"
import ModalPortal from "./ModalPortal"

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning" // warning, danger, info
}) {
  if (!isOpen) return null

  const getTypeStyles = () => {
    switch(type) {
      case 'danger':
        return {
          icon: (
            <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          headerBg: 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800',
          confirmBtn: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
        }
      case 'warning':
        return {
          icon: (
            <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700',
          confirmBtn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
        }
      default:
        return {
          icon: (
            <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          headerBg: 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800',
          confirmBtn: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        }
    }
  }

  const styles = getTypeStyles()

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border-2 border-slate-300 dark:border-slate-700 overflow-hidden animate-scaleIn">
          {/* Header */}
          <div className={`${styles.headerBg} p-4 flex items-center justify-center`}>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full">
              {styles.icon}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-black dark:text-white text-center">
              {title}
            </h3>
            <p className="text-black dark:text-slate-400 text-center">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-black dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 ${styles.confirmBtn} text-white rounded-lg transition-colors font-semibold shadow-lg hover:shadow-xl`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(ConfirmationModal)
