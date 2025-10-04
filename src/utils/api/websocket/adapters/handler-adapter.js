// ============================================================================
// websocket/adapters/handler-adapter.js
// Adapter to make existing Socket.IO handlers work with polling system
// ============================================================================

/**
 * Base class for adapting Socket.IO event handlers to polling system
 * Your existing handlers can extend this or use the provided utilities
 */
export class HandlerAdapter {
  constructor(manager) {
    this.manager = manager
    this.handlers = new Map()
  }

  /**
   * Register an event handler
   * @param {string} event - Event name to listen for
   * @param {function} handler - Handler function
   */
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event).push(handler)
  }

  /**
   * Setup handlers - called by your existing event handler classes
   * @param {object} socket - Mock socket interface from PollingManager
   */
  setupHandlers(socket) {
    // Your existing handlers will call socket.on(event, callback)
    // The mock socket will automatically route these to the listener manager
  }

  /**
   * Emit an event (useful for testing or triggering actions)
   */
  emit(event, data) {
    this.manager.notifyListeners(event, data)
  }

  /**
   * Subscribe to updates (alternative API)
   */
  subscribe(event, callback) {
    return this.manager.subscribeToUpdates(event, callback)
  }
}

// ============================================================================
// Example: Adapted Daily Summary Handler
// ============================================================================

export class DailySummaryEventHandler extends HandlerAdapter {
  setupHandlers(socket) {
    // Listen for daily summary events
    socket.on('daily_summary_synced', (data) => {
      console.log('📊 Daily Summary Synced:', data.synced_count)
      this.handleSynced(data)
    })

    socket.on('daily_summary_created', (data) => {
      console.log('✨ Daily Summary Created:', data.id)
      this.handleCreated(data)
    })

    socket.on('daily_summary_updated', (data) => {
      console.log('🔄 Daily Summary Updated:', data.id)
      this.handleUpdated(data)
    })

    socket.on('daily_summary_deleted', (data) => {
      console.log('🗑️ Daily Summary Deleted:', data.id)
      this.handleDeleted(data)
    })

    socket.on('daily_summary_rebuilt', (data) => {
      console.log('🔨 Daily Summary Rebuilt:', data.processed_count)
      this.handleRebuilt(data)
    })
  }

  handleSynced(data) {
    // Notify any UI components listening for sync events
    this.manager.notifyListeners('dailySummary:synced', data)
  }

  handleCreated(data) {
    this.manager.notifyListeners('dailySummary:created', data)
  }

  handleUpdated(data) {
    this.manager.notifyListeners('dailySummary:updated', data)
  }

  handleDeleted(data) {
    this.manager.notifyListeners('dailySummary:deleted', data)
  }

  handleRebuilt(data) {
    this.manager.notifyListeners('dailySummary:rebuilt', data)
  }
}

// ============================================================================
// Example: Adapted Attendance Handler
// ============================================================================

export class AttendanceEventHandler extends HandlerAdapter {
  setupHandlers(socket) {
    socket.on('attendance_created', (data) => {
      console.log('✨ Attendance Created:', data.id)
      this.handleCreated(data)
    })

    socket.on('attendance_updated', (data) => {
      console.log('🔄 Attendance Updated:', data.id)
      this.handleUpdated(data)
    })

    socket.on('attendance_deleted', (data) => {
      console.log('🗑️ Attendance Deleted:', data.id)
      this.handleDeleted(data)
    })

    socket.on('attendance_synced', (data) => {
      console.log('📊 Attendance Synced:', data.synced_count)
      this.handleSynced(data)
    })
  }

  handleCreated(data) {
    this.manager.notifyListeners('attendance:created', data)
  }

  handleUpdated(data) {
    this.manager.notifyListeners('attendance:updated', data)
  }

  handleDeleted(data) {
    this.manager.notifyListeners('attendance:deleted', data)
  }

  handleSynced(data) {
    this.manager.notifyListeners('attendance:synced', data)
  }
}

// ============================================================================
// Example: Adapted Employee Handler
// ============================================================================

export class EmployeeEventHandler extends HandlerAdapter {
  setupHandlers(socket) {
    socket.on('employee:created', (data) => {
      console.log('✨ Employee Created:', data.id)
      this.handleCreated(data)
    })

    socket.on('employee:updated', (data) => {
      console.log('🔄 Employee Updated:', data.id)
      this.handleUpdated(data)
    })

    socket.on('employee:deleted', (data) => {
      console.log('🗑️ Employee Deleted:', data.id)
      this.handleDeleted(data)
    })
  }

  handleCreated(data) {
    this.manager.notifyListeners('employee:created', data)
  }

  handleUpdated(data) {
    this.manager.notifyListeners('employee:updated', data)
  }

  handleDeleted(data) {
    this.manager.notifyListeners('employee:deleted', data)
  }
}

// ============================================================================
// Example: Connection Handler
// ============================================================================

export class ConnectionEventHandler extends HandlerAdapter {
  setupHandlers(socket) {
    // Connection events are handled by PollingManager itself
    // But you can subscribe to them here
    this.manager.subscribeToUpdates('connection', (data) => {
      console.log('🔌 Connection status:', data.status)
      this.handleConnectionChange(data)
    })
  }

  handleConnectionChange(data) {
    this.manager.notifyListeners('connection:change', data)
  }
}

// ============================================================================
// Export all adapted handlers
// ============================================================================

export { HandlerAdapter as BaseHandler }