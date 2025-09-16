// ============================================================================
// websocket/socket-manager.js (Refactored)
// ============================================================================
import { io } from 'socket.io-client'
import { getStoredToken } from '../../auth.js'
import { API_ENDPOINTS } from '../config/api-config.js'
import { SOCKET_EVENTS } from './constants/events.js'
import { RoomManager } from './managers/room-manager.js'
import { ListenerManager } from './managers/listener-manager.js'
import { ConnectionEventHandler } from './handlers/connection-handler.js'
import { EmployeeEventHandler } from './handlers/employee-handler.js'
import { DepartmentEventHandler } from './handlers/department-handler.js'
import { AuthEventHandler } from './handlers/auth-handler.js'
import { AttendanceEventHandler } from './handlers/attendance-handler.js'
import { DailySummaryEventHandler } from './handlers/daily-summary-handler.js'
import { RecruitmentEventHandler } from './handlers/recruitment-handler.js'

export class SocketManager {
  constructor() {
    this.socket = null
    this.listenerManager = new ListenerManager()
    this.roomManager = null
    this.eventHandlers = []
  }

  initialize() {
    if (!this.socket) {
      this.socket = io(API_ENDPOINTS.public, {
        auth: {
          token: getStoredToken(),
        },
        transports: ['websocket', 'polling'],
      })

      this.roomManager = new RoomManager(this.socket)
      this.setupEventHandlers()
      this.joinRooms()
    }
    return this.socket
  }

  setupEventHandlers() {
    // Initialize all event handlers
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
      handler.setupHandlers(this.socket)
    })
  }

  joinRooms() {
    if (this.roomManager) {
      this.roomManager.joinAllRooms()
    }
  }

  subscribeToUpdates(event, callback) {
    return this.listenerManager.subscribe(event, callback)
  }

  notifyListeners(event, data) {
    this.listenerManager.notify(event, data)
  }

  ping() {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.PING)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listenerManager.clear()
      this.roomManager = null
      this.eventHandlers = []
    }
  }

  get isConnected() {
    return this.socket && this.socket.connected
  }

  // Additional utility methods
  getListenerCount(event) {
    return this.listenerManager.getListenerCount(event)
  }

  getAllSubscribedEvents() {
    return this.listenerManager.getAllEvents()
  }

  joinSpecificRoom(room) {
    if (this.roomManager) {
      this.roomManager.joinRoom(room)
    }
  }
}