import { useEffect, useState, useCallback, useRef } from 'react'

interface RealtimeEventData {
  [key: string]: any
}

interface RealtimeEvent {
  event: string
  data: RealtimeEventData
  timestamp: number
}

// Toolbox-specific polling manager (adapted from JJC website polling system)
class ToolboxPollingManager {
  private listenerManager: Map<string, ((data: any) => void)[]> = new Map()
  private eventHandlers: any[] = []
  private pollingInterval: NodeJS.Timeout | null = null
  private lastTimestamp = 0
  private isPolling = false
  private pollingRate = 3000 // 3 seconds for Toolbox
  private rooms: Set<string> = new Set()
  private connectionState = 'disconnected'
  private processedEventIds: Set<string> = new Set()
  private apiUrl: string
  private _internalHandlers: Map<string, ((data: any) => void)[]> | undefined

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  initialize() {
    if (!this.isPolling) {
      this.setupEventHandlers()
      this.startPolling()
      this.connectionState = 'connected'
      this.notifyListeners('connection', { status: 'connected' })
    }
    return this
  }

  setupEventHandlers() {
    // Create mock socket interface for handlers
    const mockSocket = this.createMockSocketInterface()

    // Initialize event handlers for Toolbox
    this.eventHandlers = []

    // Setup all handlers
    this.eventHandlers.forEach(handler => {
      handler.setupHandlers(mockSocket)
    })
  }

  createMockSocketInterface() {
    const internalHandlers = new Map()

    return {
      on: (event: string, callback: (data: any) => void) => {
        if (!internalHandlers.has(event)) {
          internalHandlers.set(event, [])
        }
        internalHandlers.get(event).push(callback)
        this._internalHandlers = internalHandlers
      },
      emit: (event: string, data: any) => {
        console.log('[Toolbox Socket Mock] Emit:', event, data)
      },
      connected: true,
      id: 'toolbox-polling-' + Date.now()
    }
  }

  async startPolling() {
    if (this.pollingInterval) {
      return
    }

    this.isPolling = true

    // Initial poll
    await this.poll()

    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.poll()
    }, this.pollingRate)

    console.log(`📡 Toolbox polling started (every ${this.pollingRate}ms)`)
  }

  async poll() {
    try {
      // Try to poll for events from API
      await this.pollForEvents()

      // Update connection state
      if (this.connectionState !== 'connected') {
        this.connectionState = 'connected'
        this.notifyListeners('connection', { status: 'connected' })
      }

    } catch (error) {
      console.error('[Toolbox] Polling error:', error)

      if (this.connectionState !== 'error') {
        this.connectionState = 'error'
        this.notifyListeners('connection', { status: 'error', error })
      }
    }
  }

  async pollForEvents() {
    try {
      // Try the events endpoint first (if it exists)
      const eventsUrl = `${this.apiUrl}/api/events/poll?since=${this.lastTimestamp}`
      const response = await fetch(eventsUrl)

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.events && data.events.length > 0) {
          data.events.forEach((event: any) => {
            if (!this.processedEventIds.has(event.id)) {
              this.processedEventIds.add(event.id)
              this.handleIncomingEvent(event)
            }
          })

          this.lastTimestamp = data.timestamp || Date.now()

          // Clean up old processed IDs
          if (this.processedEventIds.size > 200) {
            const idsArray = Array.from(this.processedEventIds)
            this.processedEventIds = new Set(idsArray.slice(-200))
          }
        }
        return
      }
    } catch (error) {
      // Events endpoint doesn't exist, fall back to simple refresh polling
    }

    // Fallback: Simple periodic refresh (like the original implementation)
    this.triggerPeriodicRefresh()
  }

  triggerPeriodicRefresh() {
    // Trigger refresh events for all subscribed listeners (like original implementation)
    this.notifyListeners('data_refresh', { type: 'items', timestamp: Date.now() })
    this.notifyListeners('data_refresh', { type: 'transactions', timestamp: Date.now() })
    this.notifyListeners('data_refresh', { type: 'inventory', timestamp: Date.now() })

    // Also trigger specific events for backward compatibility
    this.notifyListeners('item_updated', { refresh: true, timestamp: Date.now() })
    this.notifyListeners('transaction_created', { refresh: true, timestamp: Date.now() })
    this.notifyListeners('inventory_updated', { refresh: true, timestamp: Date.now() })
  }

  handleIncomingEvent(event: any) {
    console.log('📨 [Toolbox] Received event:', event.event, event.data)

    // Call internal handlers first
    if (this._internalHandlers && this._internalHandlers.has(event.event)) {
      const handlers = this._internalHandlers.get(event.event)
      if (handlers) {
        handlers.forEach((handler: (data: any) => void) => {
          try {
            handler(event.data)
          } catch (error) {
            console.error(`[Toolbox] Error in handler for ${event.event}:`, error)
          }
        })
      }
    }

    // Notify external listeners
    this.notifyListeners(event.event, event.data)

    // Also notify generic 'event' listener
    this.notifyListeners('event', event)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      this.isPolling = false
      this.connectionState = 'disconnected'
      this.notifyListeners('connection', { status: 'disconnected' })
      console.log('📡 Toolbox polling stopped')
    }
  }

  // Room management
  joinRoom(room: string) {
    this.rooms.add(room)
    console.log(`📌 [Toolbox] Joined room: ${room}`)
  }

  joinAllRooms() {
    const defaultRooms = ['items', 'transactions', 'inventory']
    defaultRooms.forEach(room => this.joinRoom(room))
  }

  leaveRoom(room: string) {
    this.rooms.delete(room)
    console.log(`📌 [Toolbox] Left room: ${room}`)
  }

  // Listener management
  subscribeToUpdates(event: string, callback: (data: any) => void) {
    if (!this.listenerManager.has(event)) {
      this.listenerManager.set(event, [])
    }
    this.listenerManager.get(event)!.push(callback)

    return () => {
      const listeners = this.listenerManager.get(event) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  notifyListeners(event: string, data: any) {
    const listeners = this.listenerManager.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`[Toolbox] Error in event listener for ${event}:`, error)
      }
    })
  }

  unsubscribe(unsubscribeFn: (() => void) | undefined) {
    if (typeof unsubscribeFn === 'function') {
      unsubscribeFn()
    }
  }

  // Utility methods
  ping() {
    this.poll()
  }

  disconnect() {
    this.stopPolling()
    this.listenerManager.clear()
    this.eventHandlers = []
    this.rooms.clear()
    this.lastTimestamp = 0
    this.processedEventIds.clear()
  }

  get isConnected() {
    return this.connectionState === 'connected'
  }

  getListenerCount(event: string) {
    return this.listenerManager.get(event)?.length || 0
  }

  getAllSubscribedEvents() {
    return Array.from(this.listenerManager.keys())
  }

  setPollingRate(milliseconds: number) {
    this.pollingRate = milliseconds

    if (this.isPolling) {
      this.stopPolling()
      this.startPolling()
    }
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

    if (!manager.isConnected) {
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

    if (!manager.isConnected) {
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
 * Hook to track connection status (for polling, always connected)
 */
export function useConnectionStatus(apiUrl?: string) {
  const [status, setStatus] = useState({
    connected: true, // Polling is always "connected"
    error: null as string | null
  })

  useEffect(() => {
    const manager = getToolboxPollingManager(apiUrl || 'http://localhost:3000')
    setStatus({
      connected: manager.isConnected,
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    if (!manager.isConnected) {
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