// ============================================================================
// websocket/handlers/daily-summary-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class DailySummaryEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    const events = SOCKET_EVENTS.DAILY_SUMMARY
    
    socket.on(events.CREATED, (data) => {
      this.log('Daily summary created', data)
      this.notifyListeners('daily_summary_created', data)
    })

    socket.on(events.UPDATED, (data) => {
      this.log('Daily summary updated', data)
      this.notifyListeners('daily_summary_updated', data)
    })

    socket.on(events.DELETED, (data) => {
      this.log('Daily summary deleted', data)
      this.notifyListeners('daily_summary_deleted', data)
    })

    socket.on(events.SYNCED, (data) => {
      this.log('Daily summary synced', data)
      this.notifyListeners('daily_summary_synced', data)
    })

    socket.on(events.REBUILT, (data) => {
      this.log('Daily summary rebuilt', data)
      this.notifyListeners('daily_summary_rebuilt', data)
    })
  }
}