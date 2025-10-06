// ============================================================================
// websocket/polling-manager.js
// Fixed version - prevents circular loops and properly handles events
// ============================================================================
import { getStoredToken } from '../../auth.js'
import { API_ENDPOINTS } from '../config/api-config.js'
import { SOCKET_EVENTS } from './constants/events.js'
import { ListenerManager } from './managers/listener-manager.js'

export class PollingManager {
  constructor() {
    this.listenerManager = new ListenerManager()
    this.eventHandlers = []
    this.pollingInterval = null
    this.lastTimestamp = 0
    this.isPolling = false
    this.pollingRate = 2000 // 2 seconds
    this.rooms = new Set()
    this.connectionState = 'disconnected'
    this.processedEventIds = new Set() // Prevent duplicate processing
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
    
    // Import and initialize handlers dynamically
    this.eventHandlers = []
    
    // Initialize each handler type if you have them
    // Note: Import them at the top of this file
    // Example:
    // import { DailySummaryEventHandler } from './handlers/daily-summary-handler.js'
    // this.eventHandlers.push(new DailySummaryEventHandler(this))
    
    // Setup all handlers
    this.eventHandlers.forEach(handler => {
      handler.setupHandlers(mockSocket)
    })
  }

  createMockSocketInterface() {
    const internalHandlers = new Map()
    
    return {
      on: (event, callback) => {
        // Store handler internally - DO NOT trigger listeners here
        if (!internalHandlers.has(event)) {
          internalHandlers.set(event, [])
        }
        internalHandlers.get(event).push(callback)
        
        // Store reference so we can call these handlers when events arrive
        this._internalHandlers = internalHandlers
      },
      emit: (event, data) => {
        console.log('[Socket Mock] Emit:', event, data)
      },
      connected: true,
      id: 'polling-' + Date.now()
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

    console.log(`📡 Polling started (every ${this.pollingRate}ms)`)
  }

  async poll() {
    try {
      const room = this.rooms.size > 0 ? Array.from(this.rooms)[0] : null
      const url = new URL(`${API_ENDPOINTS.public}/api/events/poll`)
      url.searchParams.append('since', this.lastTimestamp)
      if (room) {
        url.searchParams.append('room', room)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.events && data.events.length > 0) {
        // Process each event
        data.events.forEach(event => {
          // Skip if already processed (prevent duplicates)
          if (!this.processedEventIds.has(event.id)) {
            this.processedEventIds.add(event.id)
            this.handleIncomingEvent(event)
          }
        })
        
        // Update last timestamp
        this.lastTimestamp = data.timestamp
        
        // Clean up old processed IDs (keep last 200)
        if (this.processedEventIds.size > 200) {
          const idsArray = Array.from(this.processedEventIds)
          this.processedEventIds = new Set(idsArray.slice(-200))
        }
      }

      // Update connection state
      if (this.connectionState !== 'connected') {
        this.connectionState = 'connected'
        this.notifyListeners('connection', { status: 'connected' })
      }
      
    } catch (error) {
      console.error('Polling error:', error)
      
      if (this.connectionState !== 'error') {
        this.connectionState = 'error'
        this.notifyListeners('connection', { status: 'error', error })
      }
    }
  }

  handleIncomingEvent(event) {
    console.log('📨 Received event:', event.event, event.data)
    
    // Step 1: Call internal handlers (from setupHandlers)
    // These are for logging and side effects ONLY
    if (this._internalHandlers && this._internalHandlers.has(event.event)) {
      const handlers = this._internalHandlers.get(event.event)
      handlers.forEach(handler => {
        try {
          handler(event.data)
        } catch (error) {
          console.error(`Error in handler for ${event.event}:`, error)
        }
      })
    }
    
    // Step 2: Notify external listeners (UI components)
    // This is what your UI subscribes to
    this.notifyListeners(event.event, event.data)
    
    // Step 3: Also notify a generic 'event' listener
    this.notifyListeners('event', event)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      this.isPolling = false
      this.connectionState = 'disconnected'
      this.notifyListeners('connection', { status: 'disconnected' })
      console.log('📡 Polling stopped')
    }
  }

  // Room management
  joinRoom(room) {
    this.rooms.add(room)
    console.log(`📌 Joined room: ${room}`)
  }

  joinAllRooms() {
    const defaultRooms = ['employees', 'departments', 'auth', 'daily-summary', 'attendance']
    defaultRooms.forEach(room => this.joinRoom(room))
  }

  leaveRoom(room) {
    this.rooms.delete(room)
    console.log(`📌 Left room: ${room}`)
  }

  // Listener management - for UI components
  subscribeToUpdates(event, callback) {
    return this.listenerManager.subscribe(event, callback)
  }

  notifyListeners(event, data) {
    this.listenerManager.notify(event, data)
  }

  unsubscribe(unsubscribeFn) {
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

  getListenerCount(event) {
    return this.listenerManager.getListenerCount(event)
  }

  getAllSubscribedEvents() {
    return this.listenerManager.getAllEvents()
  }

  setPollingRate(milliseconds) {
    this.pollingRate = milliseconds
    
    if (this.isPolling) {
      this.stopPolling()
      this.startPolling()
    }
  }
}

// Export singleton instance
export const pollingManager = new PollingManager()