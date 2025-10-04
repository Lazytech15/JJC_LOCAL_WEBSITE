// ============================================================================
// websocket/handlers/daily-summary-handler.js
// Works with both Socket.IO and Polling systems - NO CHANGES NEEDED!
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

// ============================================================================
// Optional: Add type-specific handling methods
// ============================================================================

export class DailySummaryEventHandlerEnhanced extends BaseEventHandler {
  setupHandlers(socket) {
    const events = SOCKET_EVENTS.DAILY_SUMMARY
    
    socket.on(events.CREATED, (data) => this.handleCreated(data))
    socket.on(events.UPDATED, (data) => this.handleUpdated(data))
    socket.on(events.DELETED, (data) => this.handleDeleted(data))
    socket.on(events.SYNCED, (data) => this.handleSynced(data))
    socket.on(events.REBUILT, (data) => this.handleRebuilt(data))
  }

  handleCreated(data) {
    this.log('Daily summary created', data)
    this.notifyListeners('daily_summary_created', data)
    
    // Optional: Add additional business logic
    this.notifyListeners('dailySummary:action', {
      type: 'created',
      data,
      message: `New summary created for ${data.employee_name || 'employee'}`
    })
  }

  handleUpdated(data) {
    this.log('Daily summary updated', data)
    this.notifyListeners('daily_summary_updated', data)
    
    this.notifyListeners('dailySummary:action', {
      type: 'updated',
      data,
      message: 'Summary updated'
    })
  }

  handleDeleted(data) {
    this.log('Daily summary deleted', data)
    this.notifyListeners('daily_summary_deleted', data)
    
    this.notifyListeners('dailySummary:action', {
      type: 'deleted',
      data,
      message: 'Summary deleted'
    })
  }

  handleSynced(data) {
    this.log('Daily summary synced', data)
    this.notifyListeners('daily_summary_synced', data)
    
    const count = data.synced_count || data.processed_count || 0
    this.notifyListeners('dailySummary:action', {
      type: 'synced',
      data,
      message: `${count} summaries synced`
    })
  }

  handleRebuilt(data) {
    this.log('Daily summary rebuilt', data)
    this.notifyListeners('daily_summary_rebuilt', data)
    
    const { processed_count, success_count, fail_count } = data
    this.notifyListeners('dailySummary:action', {
      type: 'rebuilt',
      data,
      message: `Rebuilt ${processed_count} summaries (${success_count} success, ${fail_count} failed)`
    })
  }
}