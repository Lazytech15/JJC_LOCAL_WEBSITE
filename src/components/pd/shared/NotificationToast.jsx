/**
 * NotificationToast Component
 * Displays real-time notifications for employee logs
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const NotificationToast = ({ notification, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(timer)
      clearTimeout(dismissTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  if (!notification) return null

  const { log, critical } = notification

  return createPortal(
    <div 
      className={`fixed top-4 right-4 z-10001 transform transition-all duration-300 ${
        isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
      style={{ maxWidth: '400px' }}
    >
      <div className={`rounded-2xl shadow-2xl border-2 backdrop-blur-xl overflow-hidden ${
        critical 
          ? 'bg-red-50/95 dark:bg-red-900/95 border-red-500' 
          : 'bg-white/95 dark:bg-slate-800/95 border-blue-500'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${
          critical 
            ? 'bg-gradient-to-r from-red-500 to-rose-600' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {critical ? '🚨' : '📬'}
            </span>
            <div className="text-white">
              <div className="font-bold text-sm">
                {critical ? 'Critical Activity' : 'New Activity'}
              </div>
              <div className="text-xs opacity-90">
                {new Date(log.log_date + ' ' + log.log_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0">
              <span className="text-xl">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                {log.username || 'Unknown User'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {log.details || log.purpose || 'New activity logged'}
              </div>
              {log.item_no && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono">
                    #{log.item_no}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div 
            className={`h-full ${
              critical 
                ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>,
    document.body
  )
}

/**
 * NotificationBadge Component
 * Displays unread notification count
 */
export const NotificationBadge = ({ count, onClick }) => {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      title={`${count} unread notification${count > 1 ? 's' : ''}`}
    >
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

/**
 * NotificationPanel Component
 * Shows list of all notifications
 */
export const NotificationPanel = ({ notifications, onClose, onMarkAsRead, onMarkAllAsRead, onClearAll }) => {
  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-end z-10000 p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex items-center justify-between rounded-t-3xl">
          <div>
            <h3 className="text-white font-bold text-xl">Notifications</h3>
            <p className="text-blue-100 text-sm mt-0.5">
              {notifications.filter(n => !n.read).length} unread
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">📭</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      notification.read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-500 animate-pulse'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notification.critical && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded">
                            CRITICAL
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(notification.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                        {notification.log.username || 'Unknown User'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {notification.log.details || notification.log.purpose || 'New activity'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  )
}

