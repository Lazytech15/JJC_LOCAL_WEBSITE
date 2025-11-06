import { useEffect, useState, useCallback, useRef } from 'react'
// Switch from socket.io to the shared polling manager used across apps
import { pollingManager } from '../../src/utils/api/websocket/polling-manager.jsx'
import { SOCKET_ROOMS } from '../../src/utils/api/websocket/constants/events.js'

interface RealtimeEventData {
  [key: string]: any
}

interface RealtimeEvent {
  event: string
  data: RealtimeEventData
  timestamp: number
}

// Simple polling manager for Toolbox
class ToolboxPollingManager {
  private isReady = false
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map()

  constructor(_apiUrl: string) { /* apiUrl unused with polling manager */ }

  initialize() {
    if (this.isReady) return
    // Initialize shared polling manager once
    pollingManager.initialize()
    // Join rooms relevant to Toolbox
    pollingManager.joinRoom(SOCKET_ROOMS.INVENTORY)
    pollingManager.joinRoom(SOCKET_ROOMS.PROCUREMENT)

    // Bridge events from polling manager to local listeners map
    const forward = (evt: string) =>
      pollingManager.subscribeToUpdates(evt, (data: any) => this.notifyListeners(evt, data))

    // Inventory and item events commonly used in Toolbox
    const defaultEvents = [
      'stock_updated',
      'stock_inserted',
      'stock_removed',
      'item_created',
      'item_updated',
      'item_deleted',
      'checkout_completed',
      // Some legacy names used in UI (ensure they get updates too)
      'inventory:refresh'
    ]
    defaultEvents.forEach(forward)

    this.isReady = true
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`[Toolbox] Error in event listener for ${event}:`, error)
      }
    })
  }

  // No reconnect logic needed; polling manager handles retry

  subscribeToUpdates(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)

    return () => {
      const listeners = this.eventListeners.get(event) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  disconnect() {/* keep polling manager alive to serve other listeners */}

  get isSocketConnected() {
    return pollingManager.isConnected
  }
}

// Create a singleton instance
let toolboxPollingManager: ToolboxPollingManager | null = null

export function getToolboxPollingManager(apiUrl: string) {
  if (!toolboxPollingManager) {
    toolboxPollingManager = new ToolboxPollingManager(apiUrl)
  }
  return toolboxPollingManager
}

/**
 * Hook to subscribe to a single real-time event
 * @param event - Event name to listen for
 * @param callback - Callback function to handle event
 * @param deps - Dependencies array (like useEffect)
 */
export function useRealtimeEvent(
  event: string,
  callback: (data: RealtimeEventData) => void,
  deps: any[] = [],
  apiUrl?: string
) {
  useEffect(() => {
    const manager = getToolboxPollingManager(apiUrl || 'http://localhost:3000')

    if (!manager.isSocketConnected) {
      manager.initialize()
    }

    const unsubscribe = manager.subscribeToUpdates(event, callback)

    return () => {
      unsubscribe()
    }
  }, [event, apiUrl, ...deps])
}

/**
 * Hook to subscribe to multiple real-time events
 * @param eventHandlers - Object mapping event names to handlers
 */
export function useRealtimeEvents(
  eventHandlers: Record<string, (data: RealtimeEventData) => void>,
  deps: any[] = [],
  apiUrl?: string
) {
  useEffect(() => {
    const manager = getToolboxPollingManager(apiUrl || 'http://localhost:3000')

    if (!manager.isSocketConnected) {
      manager.initialize()
    }

    const unsubscribers = Object.entries(eventHandlers).map(([event, handler]) => {
      return manager.subscribeToUpdates(event, handler)
    })

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [eventHandlers, apiUrl, ...deps])
}

/**
 * Hook to get all events of a specific type as state
 * @param event - Event name to collect
 * @param maxEvents - Maximum number of events to keep (default: 50)
 */
export function useRealtimeEventHistory(
  event: string,
  maxEvents = 50,
  apiUrl?: string
) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])

  useRealtimeEvent(event, (data) => {
    setEvents(prev => {
      const newEvents = [{ event, data, timestamp: Date.now() }, ...prev]
      return newEvents.slice(0, maxEvents)
    })
  }, [], apiUrl)

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return { events, clearEvents }
}

/**
 * Hook to track connection status
 */
export function useConnectionStatus(apiUrl?: string) {
  const [status, setStatus] = useState({
    connected: false,
    error: null as string | null
  })

  useRealtimeEvent('connect', () => {
    setStatus({ connected: true, error: null })
  }, [], apiUrl)

  useRealtimeEvent('disconnect', () => {
    setStatus({ connected: false, error: null })
  }, [], apiUrl)

  useRealtimeEvent('connect_error', (error) => {
    setStatus({ connected: false, error: error?.message || 'Connection failed' })
  }, [], apiUrl)

  useEffect(() => {
    const manager = getToolboxPollingManager(apiUrl || 'http://localhost:3000')
    setStatus({
      connected: manager.isSocketConnected,
      error: null
    })
  }, [apiUrl])

  return status
}

/**
 * Hook for Item real-time updates
 * Automatically refreshes data when updates occur
 */
export function useItemRealtime(
  onUpdate?: (update: { type: string; data: any }) => void,
  apiUrl?: string
) {
  const [lastUpdate, setLastUpdate] = useState<any>(null)

  useRealtimeEvents({
    'item_updated': (data) => {
      console.log('[Toolbox] Item updated:', data)
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    },
    'item_created': (data) => {
      console.log('[Toolbox] Item created:', data)
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'item_deleted': (data) => {
      console.log('[Toolbox] Item deleted:', data)
      setLastUpdate({ type: 'deleted', data, timestamp: Date.now() })
      onUpdate?.({ type: 'deleted', data })
    },
    'inventory_updated': (data) => {
      console.log('[Toolbox] Inventory updated:', data)
      setLastUpdate({ type: 'inventory_updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'inventory_updated', data })
    }
  }, [onUpdate], apiUrl)

  return lastUpdate
}

/**
 * Hook for Transaction real-time updates
 */
export function useTransactionRealtime(
  onUpdate?: (update: { type: string; data: any }) => void,
  apiUrl?: string
) {
  const [lastUpdate, setLastUpdate] = useState<any>(null)

  useRealtimeEvents({
    'transaction_created': (data) => {
      console.log('[Toolbox] Transaction created:', data)
      setLastUpdate({ type: 'created', data, timestamp: Date.now() })
      onUpdate?.({ type: 'created', data })
    },
    'transaction_updated': (data) => {
      console.log('[Toolbox] Transaction updated:', data)
      setLastUpdate({ type: 'updated', data, timestamp: Date.now() })
      onUpdate?.({ type: 'updated', data })
    }
  }, [onUpdate], apiUrl)

  return lastUpdate
}

/**
 * Hook to auto-refresh data when specific events occur
 * @param events - Array of event names that should trigger refresh
 * @param refreshFn - Function to call when refresh is needed
 * @param options - Options for debouncing, etc.
 */
export function useAutoRefresh(
  events: string[],
  refreshFn: () => void,
  options: { debounce?: number; enabled?: boolean } = {},
  apiUrl?: string
) {
  const { debounce = 500, enabled = true } = options
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!enabled) return

    const manager = getToolboxPollingManager(apiUrl || 'http://localhost:3000')
    if (!manager.isSocketConnected) {
      manager.initialize()
    }

    const unsubscribers = events.map(event => {
      return manager.subscribeToUpdates(event, debouncedRefresh)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [events, debouncedRefresh, enabled, apiUrl])
}