/**
 * WebSocket service for real-time updates
 */

class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.messageQueue = []
    this.listeners = {}
    this.isConnecting = false
    this.heartbeatInterval = null
  }

  /**
   * Connect to WebSocket server
   */
  connect(url, token) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    const wsUrl = `${url}?token=${token}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log("[WebSocket] Connected")
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.flushMessageQueue()
        this.emit("connected")
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error)
        this.emit("error", error)
      }

      this.ws.onclose = () => {
        console.log("[WebSocket] Disconnected")
        this.isConnecting = false
        this.stopHeartbeat()
        this.emit("disconnected")
        this.attemptReconnect(url, token)
      }
    } catch (error) {
      console.error("[WebSocket] Connection error:", error)
      this.isConnecting = false
      this.attemptReconnect(url, token)
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts
  }

  /**
   * Send message to server
   */
  send(type, data) {
    const message = { type, data, timestamp: Date.now() }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  /**
   * Subscribe to event
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  /**
   * Unsubscribe from event
   */
  off(event, callback) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach((callback) => callback(data))
  }

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, data } = message

    switch (type) {
      case "announcement.new":
        this.emit("announcement", data)
        break
      case "attendance.update":
        this.emit("attendance", data)
        break
      case "task.assigned":
      case "task.updated":
        this.emit("task", data)
        break
      case "metrics.refresh":
        this.emit("metrics", data)
        break
      case "system.broadcast":
        this.emit("broadcast", data)
        break
      case "pong":
        // Heartbeat response
        break
      default:
        console.log("[WebSocket] Unknown message type:", type)
    }
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect(url, token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebSocket] Max reconnection attempts reached")
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect(url, token)
    }, delay)
  }

  /**
   * Flush queued messages
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("ping", {})
      }
    }, 30000) // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.ws) return "disconnected"

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting"
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CLOSING:
        return "closing"
      case WebSocket.CLOSED:
        return "disconnected"
      default:
        return "unknown"
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService()
export default wsService
