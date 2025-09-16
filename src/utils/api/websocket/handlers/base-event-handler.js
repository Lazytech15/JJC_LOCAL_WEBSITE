// ============================================================================
// websocket/handlers/base-event-handler.js
// ============================================================================
export class BaseEventHandler {
  constructor(socketManager) {
    this.socketManager = socketManager
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
    this.socketManager.notifyListeners(event, data)
  }
}