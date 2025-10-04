// ============================================================================
// websocket/polling-manager.js
// Polling-based real-time system compatible with PHP file-based events
// ============================================================================
import { getStoredToken } from '../../auth.js'
import { API_ENDPOINTS } from '../config/api-config.js'
import { SOCKET_EVENTS } from './constants/events.js'
import { ListenerManager } from './managers/listener-manager.js'
import { ConnectionEventHandler } from './handlers/connection-handler.js'
import { EmployeeEventHandler } from './handlers/employee-handler.js'
import { DepartmentEventHandler } from './handlers/department-handler.js'
import { AuthEventHandler } from './handlers/auth-handler.js'
import { AttendanceEventHandler } from './handlers/attendance-handler.js'
import { DailySummaryEventHandler } from './handlers/daily-summary-handler.js'
import { RecruitmentEventHandler } from './handlers/recruitment-handler.js'

export class PollingManager {
  constructor() {
    this.listenerManager = new ListenerManager()
    this.eventHandlers = []
    this.pollingInterval = null
    this.lastTimestamp = 0
    this.isPolling = false
    this.pollingRate = 2000 // 2 seconds
    this.rooms = new Set()
    this.connectionState = 'disconnected' // disconnected, connecting, connected
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
    // Initialize all event handlers with a mock socket-like interface
    const mockSocket = this.createMockSocketInterface()
    
    this.eventHandlers = [
      new ConnectionEventHandler(this),
      new EmployeeEventHandler(this),
      new DepartmentEventHandler(this),
      new AuthEventHandler(this),
      new AttendanceEventHandler(this),
      new DailySummaryEventHandler(this),
      new RecruitmentEventHandler(this)
    ]

    // Setup handlers for each module
    this.eventHandlers.forEach(handler => {
      handler.setupHandlers(mockSocket)
    })
  }

  // Create a mock socket interface that handlers expect
  createMockSocketInterface() {
    return {
      on: (event, callback) => {
        // Store the callback in listener manager
        this.subscribeToUpdates(event, callback)
      },
      emit: (event, data) => {
        // Handle outgoing events if needed
        console.log('Emit:', event, data)
      },
      connected: true
    }
  }

  async startPolling() {
    if (this.pollingInterval) {
      return // Already polling
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
      // Build URL with rooms filter if any rooms are joined
      const room = this.rooms.size > 0 ? Array.from(this.rooms)[0] : null
      const url = new URL(`${API_ENDPOINTS.public}/events/poll`)
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
          this.handleIncomingEvent(event)
        })
        
        // Update last timestamp
        this.lastTimestamp = data.timestamp
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
    
    // Notify all listeners for this event type
    this.notifyListeners(event.event, event.data)
    
    // Also notify a generic 'event' listener with full event object
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

  // Room management (simulated for compatibility)
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

  // Listener management
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
    // Trigger an immediate poll
    this.poll()
  }

  disconnect() {
    this.stopPolling()
    this.listenerManager.clear()
    this.eventHandlers = []
    this.rooms.clear()
    this.lastTimestamp = 0
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
    
    // Restart polling with new rate if currently polling
    if (this.isPolling) {
      this.stopPolling()
      this.startPolling()
    }
  }
}

// Export singleton instance
export const pollingManager = new PollingManager()