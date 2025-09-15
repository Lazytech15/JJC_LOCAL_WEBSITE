// ============================================================================
// websocket/socket-manager.js
// ============================================================================
import { io } from "socket.io-client"
import { getStoredToken } from "../../auth.js"
import { API_ENDPOINTS } from "../config/api-config.js"

export class SocketManager {
  constructor() {
    this.socket = null
    this.socketListeners = new Map()
  }

  initialize() {
    if (!this.socket) {
      this.socket = io(API_ENDPOINTS.public, {
        auth: {
          token: getStoredToken(),
        },
        transports: ["websocket", "polling"],
      })

      this.setupEventHandlers()
    }
    return this.socket
  }

  setupEventHandlers() {
    this.socket.on("connect", () => {
      console.log("[API] Socket connected:", this.socket.id)
    })

    this.socket.on("disconnect", () => {
      console.log("[API] Socket disconnected")
    })

    this.socket.on("error", (error) => {
      console.error("[API] Socket error:", error)
    })

    // Real-time update handlers
    const events = [
      "employee_updated", "employee_created", "employee_deleted",
      "recruitment_updated", "attendance_created", "attendance_updated",
      "attendance_deleted", "attendance_synced"
    ]

    events.forEach(event => {
      this.socket.on(event, (data) => {
        this.notifyListeners(event, data)
      })
    })
  }

  subscribeToUpdates(event, callback) {
    if (!this.socketListeners.has(event)) {
      this.socketListeners.set(event, new Set())
    }
    this.socketListeners.get(event).add(callback)

    return () => {
      const listeners = this.socketListeners.get(event)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  notifyListeners(event, data) {
    const listeners = this.socketListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.socketListeners.clear()
    }
  }
}