// ============================================================================
// websocket/handlers/base-event-handler.js
// Updated to work with both Socket.IO and Polling systems
// ============================================================================
export class BaseEventHandler {
  constructor(manager) {
    this.manager = manager
    this.logger = console
  }

  log(message, data = null) {
    if (data) {
      this.logger.log(`[API] ${message}:`, data)
    } else {
      this.logger.log(`[API] ${message}`)
    }
  }

  error(message, error) {
    this.logger.error(`[API] ${message}:`, error)
  }

  notifyListeners(event, data) {
    // Works with both SocketManager and PollingManager
    this.manager.notifyListeners(event, data)
  }

  // Helper to check if using polling or socket.io
  get isPolling() {
    return this.manager.constructor.name === 'PollingManager'
  }
}