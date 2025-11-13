/**
 * Custom hooks for Employee Logs functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import apiService from '../api/api-service'
import { pollingManager } from '../api/websocket/polling-manager'
import { SOCKET_EVENTS } from '../api/websocket/constants/events'

/**
 * Custom hook for managing employee logs with filtering and pagination
 * @param {Object} options - Configuration options
 * @returns {Object} - State and methods for managing logs
 */
export const useEmployeeLogs = (options = {}) => {
  const {
    initialPage = 1,
    logsPerPage = 10,
    enableRealtime = true,
    onNewLog = null
  } = options

  const [state, setState] = useState({
    logs: [],
    loading: true,
    initialLoading: true,
    error: null,
    currentPage: initialPage,
    totalLogs: 0,
    visibleCount: 50,
  })

  // Use ref to track the latest request to prevent race conditions
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef(null)

  /**
   * Fetch logs from API with proper cancellation
   */
  const fetchLogs = useCallback(async (filters = {}, page = state.currentPage) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Increment request ID
    const currentRequestId = ++requestIdRef.current

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const params = {
        offset: (page - 1) * logsPerPage,
        limit: logsPerPage,
        sort_by: "created_at",
        sort_order: "DESC",
        ...filters
      }

      const result = await apiService.employeeLogs.getEmployeeLogs(params)

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current && !abortController.signal.aborted) {
        if (result.success) {
          setState(prev => ({
            ...prev,
            logs: result.data || [],
            totalLogs: result.total || 0,
            loading: false,
            initialLoading: false,
            currentPage: page
          }))
        } else {
          throw new Error(result.message || "Failed to fetch employee logs")
        }
      }
    } catch (err) {
      // Only update error state if request wasn't aborted
      if (currentRequestId === requestIdRef.current && !abortController.signal.aborted) {
        setState(prev => ({
          ...prev,
          error: err.name === 'AbortError' ? null : err.message,
          loading: false,
          initialLoading: false
        }))
        console.error("Employee logs fetch error:", err)
      }
    }
  }, [state.currentPage, logsPerPage])

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    fetchLogs()
  }, [fetchLogs])

  /**
   * Go to specific page
   */
  const goToPage = useCallback((page) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])

  /**
   * Load more logs (for infinite scroll)
   */
  const loadMore = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      visibleCount: Math.min(prev.visibleCount + 20, prev.logs.length) 
    }))
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState({
      logs: [],
      loading: true,
      initialLoading: true,
      error: null,
      currentPage: initialPage,
      totalLogs: 0,
      visibleCount: 50,
    })
  }, [initialPage])

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealtime) return

    try {
      pollingManager.initialize()
    } catch (e) {
      console.warn('[useEmployeeLogs] Failed to initialize polling manager:', e)
    }

    const unsubCreated = pollingManager.subscribeToUpdates(
      SOCKET_EVENTS.INVENTORY.LOG_CREATED,
      (data) => {
        console.log('[useEmployeeLogs] New log created:', data)
        
        // Notify parent component
        if (onNewLog) {
          onNewLog(data)
        }

        // If on first page, refresh to get server-authoritative sort
        if (state.currentPage === 1) {
          refresh()
        } else {
          // Optimistically prepend if not on first page
          setState(prev => {
            // Basic duplicate guard
            if (prev.logs.some(l => String(l.id) === String(data.id))) return prev
            
            const newEntry = {
              id: data.id,
              username: data.username || 'N/A',
              details: data.details || data.purpose || 'New activity',
              log_date: data.log_date,
              log_time: data.log_time,
              purpose: data.purpose || '',
              created_at: new Date().toISOString(),
            }
            
            return { 
              ...prev, 
              logs: [newEntry, ...prev.logs],
              totalLogs: prev.totalLogs + 1
            }
          })
        }
      }
    )

    const unsubRefresh = pollingManager.subscribeToUpdates(
      'inventory:logs:refresh',
      () => {
        console.log('[useEmployeeLogs] Refresh signal received')
        if (state.currentPage === 1) {
          refresh()
        }
      }
    )

    return () => {
      if (typeof unsubCreated === 'function') unsubCreated()
      if (typeof unsubRefresh === 'function') unsubRefresh()
    }
  }, [enableRealtime, state.currentPage, refresh, onNewLog])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    logs: state.logs,
    loading: state.loading,
    initialLoading: state.initialLoading,
    error: state.error,
    currentPage: state.currentPage,
    totalLogs: state.totalLogs,
    visibleCount: state.visibleCount,
    totalPages: Math.ceil(state.totalLogs / logsPerPage),
    
    // Methods
    fetchLogs,
    refresh,
    goToPage,
    loadMore,
    reset,
  }
}

/**
 * Custom hook for managing log filters
 * @param {Function} onFilterChange - Callback when filters change
 * @returns {Object} - Filter state and methods
 */
export const useLogFilters = (onFilterChange) => {
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateFrom: "",
    dateTo: "",
    hasDetails: false,
    username: "",
    purpose: "",
  })

  // Debounce filter changes
  const timeoutRef = useRef(null)

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounce for search term (300ms), immediate for others
      if (key === 'searchTerm') {
        timeoutRef.current = setTimeout(() => {
          if (onFilterChange) {
            onFilterChange(buildApiFilters(newFilters))
          }
        }, 300)
      } else {
        if (onFilterChange) {
          onFilterChange(buildApiFilters(newFilters))
        }
      }

      return newFilters
    })
  }, [onFilterChange])

  const setTimeRange = useCallback((range) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const ranges = {
      today: { dateFrom: today, dateTo: today },
      week: { 
        dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dateTo: today 
      },
      month: { 
        dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dateTo: today 
      },
      clear: { dateFrom: "", dateTo: "" }
    }

    const newRange = ranges[range] || ranges.clear
    setFilters(prev => ({
      ...prev,
      dateFrom: newRange.dateFrom,
      dateTo: newRange.dateTo
    }))

    if (onFilterChange) {
      onFilterChange(buildApiFilters({ ...filters, ...newRange }))
    }
  }, [filters, onFilterChange])

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      searchTerm: "",
      dateFrom: "",
      dateTo: "",
      hasDetails: false,
      username: "",
      purpose: "",
    }
    setFilters(clearedFilters)
    
    if (onFilterChange) {
      onFilterChange(buildApiFilters(clearedFilters))
    }
  }, [onFilterChange])

  const buildApiFilters = (filterState) => {
    const apiFilters = {}
    
    if (filterState.searchTerm?.trim()) {
      apiFilters.search = filterState.searchTerm.trim()
    }
    if (filterState.dateFrom) {
      apiFilters.date_from = filterState.dateFrom
    }
    if (filterState.dateTo) {
      apiFilters.date_to = filterState.dateTo
    }
    if (filterState.hasDetails) {
      apiFilters.has_details = true
    }
    if (filterState.username?.trim()) {
      apiFilters.username = filterState.username.trim()
    }
    if (filterState.purpose?.trim()) {
      apiFilters.purpose = filterState.purpose.trim()
    }

    return apiFilters
  }

  const hasActiveFilters = Object.values(filters).some(v => 
    typeof v === 'boolean' ? v : Boolean(v)
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    filters,
    updateFilter,
    setTimeRange,
    clearFilters,
    hasActiveFilters,
    apiFilters: buildApiFilters(filters)
  }
}

/**
 * Custom hook for real-time notifications
 * @param {Object} options - Configuration options
 * @returns {Object} - Notification state and methods
 */
export const useLogNotifications = (options = {}) => {
  const {
    enableToast = true,
    enableBadge = true,
    enableSound = true,
    soundUrl = '/sounds/notification.mp3',
    criticalKeywords = ['urgent', 'critical', 'emergency', 'error']
  } = options

  const [state, setState] = useState({
    unreadCount: 0,
    notifications: [],
    latestNotification: null
  })

  const audioRef = useRef(null)

  // Initialize audio
  useEffect(() => {
    if (enableSound) {
      audioRef.current = new Audio(soundUrl)
      audioRef.current.volume = 0.5
    }
  }, [enableSound, soundUrl])

  /**
   * Check if log is critical based on details/purpose
   */
  const isCritical = useCallback((log) => {
    const text = `${log.details || ''} ${log.purpose || ''}`.toLowerCase()
    return criticalKeywords.some(keyword => text.includes(keyword))
  }, [criticalKeywords])

  /**
   * Add a new notification
   */
  const addNotification = useCallback((log) => {
    const notification = {
      id: log.id,
      log,
      critical: isCritical(log),
      timestamp: new Date(),
      read: false
    }

    setState(prev => ({
      unreadCount: prev.unreadCount + 1,
      notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
      latestNotification: notification
    }))

    // Play sound for critical notifications
    if (enableSound && notification.critical && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn('[useLogNotifications] Failed to play sound:', err)
      })
    }

    return notification
  }, [enableSound, isCritical])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setState(prev => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      notifications: prev.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    }))
  }, [])

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      unreadCount: 0,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }))
  }, [])

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setState({
      unreadCount: 0,
      notifications: [],
      latestNotification: null
    })
  }, [])

  return {
    unreadCount: state.unreadCount,
    notifications: state.notifications,
    latestNotification: state.latestNotification,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    isCritical
  }
}
