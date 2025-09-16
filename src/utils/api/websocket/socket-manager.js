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
      this.joinRooms()
    }
    return this.socket
  }

  setupEventHandlers() {
    this.socket.on("connect", () => {
      console.log("[API] Socket connected:", this.socket.id)
      // Rejoin rooms on reconnect
      this.joinRooms()
    })

    this.socket.on("disconnect", () => {
      console.log("[API] Socket disconnected")
    })

    this.socket.on("error", (error) => {
      console.error("[API] Socket error:", error)
    })

    this.socket.on("pong", () => {
      console.log("[API] Pong received")
    })

    // Employee events
    this.socket.on("employee:created", (data) => {
      console.log("[API] Employee created:", data)
      this.notifyListeners("employee_created", data)
    })

    this.socket.on("employee:updated", (data) => {
      console.log("[API] Employee updated:", data)
      this.notifyListeners("employee_updated", data)
    })

    this.socket.on("employee:deleted", (data) => {
      console.log("[API] Employee deleted:", data)
      this.notifyListeners("employee_deleted", data)
    })

    // Department events
    this.socket.on("department:created", (data) => {
      console.log("[API] Department created:", data)
      this.notifyListeners("department_created", data)
    })

    this.socket.on("department:updated", (data) => {
      console.log("[API] Department updated:", data)
      this.notifyListeners("department_updated", data)
    })

    this.socket.on("department:deleted", (data) => {
      console.log("[API] Department deleted:", data)
      this.notifyListeners("department_deleted", data)
    })

    // Auth events
    this.socket.on("user:logged-in", (data) => {
      console.log("[API] User logged in:", data)
      this.notifyListeners("user_logged_in", data)
    })

    // Generic data change event
    this.socket.on("data:changed", (data) => {
      console.log("[API] Data changed:", data)
      this.notifyListeners("data_changed", data)
    })

    // Attendance events
    this.socket.on("attendance_created", (data) => {
      console.log("[API] Attendance created:", data)
      this.notifyListeners("attendance_created", data)
    })

    this.socket.on("attendance_updated", (data) => {
      console.log("[API] Attendance updated:", data)
      this.notifyListeners("attendance_updated", data)
    })

    this.socket.on("attendance_deleted", (data) => {
      console.log("[API] Attendance deleted:", data)
      this.notifyListeners("attendance_deleted", data)
    })

    this.socket.on("attendance_synced", (data) => {
      console.log("[API] Attendance synced:", data)
      this.notifyListeners("attendance_synced", data)
    })

    // Daily Summary events
    this.socket.on("daily_summary_synced", (data) => {
      console.log("[API] Daily summary synced:", data)
      this.notifyListeners("daily_summary_synced", data)
    })

    this.socket.on("daily_summary_deleted", (data) => {
      console.log("[API] Daily summary deleted:", data)
      this.notifyListeners("daily_summary_deleted", data)
    })

    this.socket.on("daily_summary_rebuilt", (data) => {
      console.log("[API] Daily summary rebuilt:", data)
      this.notifyListeners("daily_summary_rebuilt", data)
    })

    this.socket.on("daily_summary_created", (data) => {
      console.log("[API] Daily summary created:", data)
      this.notifyListeners("daily_summary_created", data)
    })

    this.socket.on("daily_summary_updated", (data) => {
      console.log("[API] Daily summary updated:", data)
      this.notifyListeners("daily_summary_updated", data)
    })

    // Recruitment events (keeping the existing one)
    this.socket.on("recruitment_updated", (data) => {
      console.log("[API] Recruitment updated:", data)
      this.notifyListeners("recruitment_updated", data)
    })
  }

  joinRooms() {
    if (this.socket && this.socket.connected) {
      // Join all relevant rooms
      this.socket.emit("join-employees")
      this.socket.emit("join-departments")
      this.socket.emit("join-auth")
      this.socket.emit("join-daily-summary")
      console.log("[API] Joined all socket rooms")
    }
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

  // Utility method to send ping
  ping() {
    if (this.socket) {
      this.socket.emit("ping")
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.socketListeners.clear()
    }
  }

  // Getter for socket connection status
  get isConnected() {
    return this.socket && this.socket.connected
  }
}