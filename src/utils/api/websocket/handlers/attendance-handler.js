// ============================================================================
// websocket/handlers/attendance-handler.js
// Fixed version - NO circular loops
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class AttendanceEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    const events = SOCKET_EVENTS.ATTENDANCE
    
    // IMPORTANT: In polling mode, DO NOT call notifyListeners()!
    // PollingManager already notifies listeners when it receives the event
    
    socket.on(events.CREATED, (data) => {
      this.log('Attendance created', data)
      this.handleCreated(data)
    })

    socket.on(events.UPDATED, (data) => {
      this.log('Attendance updated', data)
      this.handleUpdated(data)
    })

    socket.on(events.DELETED, (data) => {
      this.log('Attendance deleted', data)
      this.handleDeleted(data)
    })

    socket.on(events.SYNCED, (data) => {
      this.log('Attendance synced', data)
      this.handleSynced(data)
    })
  }

  handleCreated(data) {
    // Side effects only - no notifyListeners!
    // Example: cache invalidation, UI notifications, etc.
  }

  handleUpdated(data) {
    // Side effects only
  }

  handleDeleted(data) {
    // Side effects only
  }

  handleSynced(data) {
    // Side effects only
    const count = data.synced_count || data.processed_count || 0
    console.log(`✅ ${count} attendance records synced successfully`)
  }
}