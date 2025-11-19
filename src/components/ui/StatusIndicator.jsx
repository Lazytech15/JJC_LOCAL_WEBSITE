
import { useState, useEffect } from "react"
import { AlertTriangle, X, Info, Clock } from "lucide-react"

// Status Badge Component
export function StatusBadge({ status, className = "" }) {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-400',
          border: 'border-green-200 dark:border-green-800',
          icon: null
        }
      case 'inactive':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          border: 'border-red-200 dark:border-red-800',
          icon: AlertTriangle
        }
      case 'on leave':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-400',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: Clock
        }
      case 'terminated':
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/30',
          text: 'text-gray-700 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-800',
          icon: X
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/30',
          text: 'text-gray-700 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-800',
          icon: null
        }
    }
  }

  const styles = getStatusStyles(status)
  const Icon = styles.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${styles.bg} ${styles.text} ${styles.border} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {status || 'Unknown'}
    </span>
  )
}

// Status Warning Banner Component
export const StatusWarningBanner = ({ status, isDarkMode, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || status?.toLowerCase() === 'active') return null

  const getWarningContent = (status) => {
    switch (status?.toLowerCase()) {
      case 'inactive':
        return {
          title: 'Account Inactive',
          message: 'Your employee account is currently marked as Inactive. Please contact HR or your supervisor for assistance.',
          icon: AlertTriangle,
          bgColor: isDarkMode ? 'bg-red-900/20' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-800' : 'border-red-200',
          textColor: isDarkMode ? 'text-red-400' : 'text-red-700',
          iconColor: isDarkMode ? 'text-red-400' : 'text-red-600'
        }
      case 'on leave':
        return {
          title: 'Currently On Leave',
          message: 'Your account shows you are currently on leave. Limited functionality may be available.',
          icon: Clock,
          bgColor: isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
          borderColor: isDarkMode ? 'border-yellow-800' : 'border-yellow-200',
          textColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-700',
          iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
        }
      case 'terminated':
        return {
          title: 'Account Terminated',
          message: 'Your employment has been terminated. Please contact HR for any questions.',
          icon: X,
          bgColor: isDarkMode ? 'bg-gray-900/20' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-800' : 'border-gray-200',
          textColor: isDarkMode ? 'text-gray-400' : 'text-gray-700',
          iconColor: isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }
      default:
        return null
    }
  }

  const warning = getWarningContent(status)
  if (!warning) return null

  const Icon = warning.icon

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  return (
    <div className={`rounded-xl border p-4 ${warning.bgColor} ${warning.borderColor} mb-6`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-black/20' : 'bg-white/50'}`}>
          <Icon className={`w-5 h-5 ${warning.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${warning.textColor} mb-1`}>
            {warning.title}
          </h3>
          <p className={`text-sm ${warning.textColor} opacity-90`}>
            {warning.message}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-black/20' : 'hover:bg-white/50'} ${warning.iconColor}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Status Modal Component
export const StatusWarningModal = ({ status, isDarkMode, onClose }) => {
  const getModalContent = (status) => {
    switch (status?.toLowerCase()) {
      case 'inactive':
        return {
          title: 'Account Status: Inactive',
          message: 'Your employee account is currently marked as Inactive. This may be due to:',
          reasons: [
            'Pending documentation or onboarding completion',
            'Temporary suspension pending review',
            'Administrative hold',
            'System maintenance'
          ],
          action: 'Please contact your HR department or direct supervisor for immediate assistance.',
          icon: AlertTriangle,
          bgColor: isDarkMode ? 'bg-red-900/20' : 'bg-red-50',
          iconBg: isDarkMode ? 'bg-red-900/30' : 'bg-red-100',
          iconColor: isDarkMode ? 'text-red-400' : 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        }
      case 'on leave':
        return {
          title: 'Account Status: On Leave',
          message: 'Your account shows you are currently on leave. Please note:',
          reasons: [
            'Limited system access may be available',
            'Some features may be restricted',
            'Your leave period is being tracked',
            'Normal access will resume after your leave period'
          ],
          action: 'If you have questions about your leave status, please contact HR.',
          icon: Clock,
          bgColor: isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
          iconBg: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100',
          iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return null
    }
  }

  const content = getModalContent(status)
  if (!content) return null

  const Icon = content.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${content.iconBg}`}>
              <Icon className={`w-6 h-6 ${content.iconColor}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              {content.title}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className={`${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {content.message}
          </p>

          <ul className={`space-y-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {content.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-zinc-500 mt-1">•</span>
                <span className="text-sm">{reason}</span>
              </li>
            ))}
          </ul>

          <div className={`p-4 rounded-xl ${content.bgColor} border ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex gap-2">
              <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${content.iconColor}`} />
              <p className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {content.action}
              </p>
            </div>
          </div>
        </div>

        <div className={`flex justify-end gap-3 p-6 border-t ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${content.buttonColor}`}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}