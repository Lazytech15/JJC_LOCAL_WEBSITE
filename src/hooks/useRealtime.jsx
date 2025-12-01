// ============================================================================
// hooks/useRealtime.js
// React hooks for subscribing to real-time events
// ============================================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { pollingManager } from '../utils/api/websocket/polling-manager.jsx'

/**
 * Hook to subscribe to a single real-time event
 * @param {string} event - Event name to listen for
 * @param {function} callback - Callback function to handle event
 * @param {array} deps - Dependencies array (like useEffect)
 */
export function useRealtimeEvent(event, callback, deps = []) {
  useEffect(() => {
    if (!pollingManager.isConnected) {
      pollingManager.initialize()
    }

    const unsubscribe = pollingManager.subscribeToUpdates(event, callback)

    return () => {
      unsubscribe()
    }
  }, [event, ...deps])
}

/**
 * Hook to subscribe to multiple real-time events
 * @param {object} eventHandlers - Object mapping event names to handlers
 * @example
 * useRealtimeEvents({
 *   'daily_summary_synced': handleSynced,
 *   'daily_summary_created': handleCreated
 * })
 */
export function useRealtimeEvents(eventHandlers, deps = []) {
  useEffect(() => {
    if (!pollingManager.isConnected) {
      pollingManager.initialize()
    }

    const unsubscribers = Object.entries(eventHandlers).map(([event, handler]) => {
      return pollingManager.subscribeToUpdates(event, handler)
    })

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [eventHandlers, ...deps])
}

/**
 * Hook to get all events of a specific type as state
 * @param {string} event - Event name to collect
 * @param {number} maxEvents - Maximum number of events to keep (default: 50)
 */
export function useRealtimeEventHistory(event, maxEvents = 50) {
  const [events, setEvents] = useState([])

  useRealtimeEvent(event, (data) => {
    setEvents(prev => {
      const newEvents = [{ event, data, timestamp: Date.now() }, ...prev]
      return newEvents.slice(0, maxEvents)
    })
  })

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return { events, clearEvents }
}

/**
 * Hook to track connection status
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState({
    connected: false,
    error: null
  })

  useRealtimeEvent('connection', (data) => {
    setStatus({
      connected: data.status === 'connected',
      error: data.error || null
    })
  })

  useEffect(() => {
    if (!pollingManager.isConnected) {
      pollingManager.initialize()
    }
    
    setStatus({
      connected: pollingManager.isConnected,
      error: null
    })
  }, [])

  return status
}

/**
 * Hook for Daily Summary real-time updates
 * Automatically refreshes data when updates occur
 */
export function useDailySummaryRealtime(onUpdate) {
  const [lastUpdate, setLastUpdate] = useState(null)

  useRealtimeEvents({
    'daily_summary_synced': (data) => {
      console.log('Daily summary synced:', data.synced_count)
      setLastUpdate({ type: 'synced', data, timestamp: Date.now() })
      onUpdate?.({ type: 'synced', data })
    },
    'daily_summary_created': (data) => {
      console.log('Daily summary created:', data.id)
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'daily_summary_updated': (data) => {
      console.log('Daily summary updated:', data.id)
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    },
    'daily_summary_deleted': (data) => {
      console.log('Daily summary deleted:', data.id)
      setLastUpdate({ type: 'deleted', data, timestamp: Date.now() })
      onUpdate?.({ type: 'deleted', data })
    },
    'daily_summary_rebuilt': (data) => {
      console.log('Daily summary rebuilt:', data.processed_count)
      setLastUpdate({ type: 'rebuilt', data, timestamp: Date.now() })
      onUpdate?.({ type: 'rebuilt', data })
    }
  }, [onUpdate])

  return lastUpdate
}

/**
 * Hook for Attendance real-time updates
 */
export function useAttendanceRealtime(onUpdate) {
  const [lastUpdate, setLastUpdate] = useState(null)

  useRealtimeEvents({
    'attendance_created': (data) => {
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'attendance_updated': (data) => {
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    },
    'attendance_deleted': (data) => {
      setLastUpdate({ type: 'deleted', data, timestamp: Date.now() })
      onUpdate?.({ type: 'deleted', data })
    },
    'attendance_synced': (data) => {
      setLastUpdate({ type: 'synced', data, timestamp: Date.now() })
      onUpdate?.({ type: 'synced', data })
    }
  }, [onUpdate])

  return lastUpdate
}

/**
 * Hook for Employee real-time updates
 */
export function useEmployeeRealtime(onUpdate) {
  const [lastUpdate, setLastUpdate] = useState(null)

  useRealtimeEvents({
    'employee:created': (data) => {
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'employee:updated': (data) => {
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    },
    'employee:deleted': (data) => {
      setLastUpdate({ type: 'deleted', data, timestamp: Date.now() })
      onUpdate?.({ type: 'deleted', data })
    }
  }, [onUpdate])

  return lastUpdate
}

/**
 * Hook for Department real-time updates
 */
export function useDepartmentRealtime(onUpdate) {
  const [lastUpdate, setLastUpdate] = useState(null)

  useRealtimeEvents({
    'department:created': (data) => {
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'department:updated': (data) => {
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    },
    'department:deleted': (data) => {
      setLastUpdate({ type: 'deleted', data, timestamp: Date.now() })
      onUpdate?.({ type: 'deleted', data })
    }
  }, [onUpdate])

  return lastUpdate
}

/**
 * Hook to auto-refresh data when specific events occur
 * @param {array} events - Array of event names that should trigger refresh
 * @param {function} refreshFn - Function to call when refresh is needed
 * @param {object} options - Options for debouncing, etc.
 */
export function useAutoRefresh(events, refreshFn, options = {}) {
  const { debounce = 500, enabled = true } = options
  const timeoutRef = useRef(null)

  const debouncedRefresh = useCallback(() => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      refreshFn()
    }, debounce)
  }, [refreshFn, debounce, enabled])

  useEffect(() => {
    if (!enabled || !pollingManager.isConnected) {
      return
    }

    const unsubscribers = events.map(event => {
      return pollingManager.subscribeToUpdates(event, debouncedRefresh)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [events, debouncedRefresh, enabled])
}

/**
 * Hook to join a specific room for filtered events
 * @param {string} room - Room name to join
 */
export function useRealtimeRoom(room) {
  useEffect(() => {
    if (!pollingManager.isConnected) {
      pollingManager.initialize()
    }

    pollingManager.joinRoom(room)

    return () => {
      pollingManager.leaveRoom(room)
    }
  }, [room])
}