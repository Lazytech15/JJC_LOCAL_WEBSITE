
// ============================================================================
// websocket/managers/listener-manager.js
// ============================================================================
export class ListenerManager {
  constructor() {
    this.listeners = new Map()
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(callback)
      }
    }
  }

  notify(event, data) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  clear() {
    this.listeners.clear()
  }

  getListenerCount(event) {
    const eventListeners = this.listeners.get(event)
    return eventListeners ? eventListeners.size : 0
  }

  getAllEvents() {
    return Array.from(this.listeners.keys())
  }
}