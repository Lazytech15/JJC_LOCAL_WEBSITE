// ============================================================================
// websocket/handlers/daily-summary-handler.js
// Fixed version - NO circular loops
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class DailySummaryEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    const events = SOCKET_EVENTS.DAILY_SUMMARY
    
    // IMPORTANT: In polling mode, these handlers are ONLY for:
    // 1. Logging (console output)
    // 2. Side effects (UI updates, cache invalidation, etc.)
    // 
    // DO NOT call notifyListeners() with the same event name!
    // PollingManager already notifies listeners when it receives the event
    
    socket.on(events.CREATED, (data) => {
      this.log('Daily summary created', data)
      this.handleCreated(data)
    })

    socket.on(events.UPDATED, (data) => {
      this.log('Daily summary updated', data)
      this.handleUpdated(data)
    })

    socket.on(events.DELETED, (data) => {
      this.log('Daily summary deleted', data)
      this.handleDeleted(data)
    })

    socket.on(events.SYNCED, (data) => {
      this.log('Daily summary synced', data)
      this.handleSynced(data)
    })

    socket.on(events.REBUILT, (data) => {
      this.log('Daily summary rebuilt', data)
      this.handleRebuilt(data)
    })
  }

  handleCreated(data) {
    // Side effects only - no notifyListeners!
    // Example: invalidate cache, update local state, etc.
    
    // If you need to notify about a DERIVED event (different from original):
    // this.notifyListeners('ui:notification', {
    //   type: 'success',
    //   message: `Summary created for ${data.employee_name || 'employee'}`
    // })
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
    console.log(`✅ ${count} summaries synced successfully`)
  }

  handleRebuilt(data) {
    // Side effects only
    const { processed_count, success_count, fail_count } = data
    console.log(`✅ Rebuilt ${processed_count} summaries (${success_count} success, ${fail_count} failed)`)
  }
}

// ============================================================================
// Alternative: Handler with UI notifications (but still no circular loops!)
// ============================================================================

export class DailySummaryEventHandlerWithNotifications extends BaseEventHandler {
  setupHandlers(socket) {
    const events = SOCKET_EVENTS.DAILY_SUMMARY
    
    socket.on(events.CREATED, (data) => {
      this.log('Daily summary created', data)
      
      // Notify UI with a DIFFERENT event name
      this.notifyListeners('ui:toast', {
        type: 'success',
        title: 'Summary Created',
        message: `New summary for ${data.employee_name || 'employee'}`,
        data: data
      })
    })

    socket.on(events.UPDATED, (data) => {
      this.log('Daily summary updated', data)
      
      this.notifyListeners('ui:toast', {
        type: 'info',
        title: 'Summary Updated',
        message: 'Daily summary has been updated',
        data: data
      })
    })

    socket.on(events.DELETED, (data) => {
      this.log('Daily summary deleted', data)
      
      this.notifyListeners('ui:toast', {
        type: 'warning',
        title: 'Summary Deleted',
        message: 'Daily summary has been removed',
        data: data
      })
    })

    socket.on(events.SYNCED, (data) => {
      this.log('Daily summary synced', data)
      
      const count = data.synced_count || data.processed_count || 0
      this.notifyListeners('ui:toast', {
        type: 'success',
        title: 'Sync Complete',
        message: `${count} summaries synchronized`,
        data: data
      })
    })

    socket.on(events.REBUILT, (data) => {
      this.log('Daily summary rebuilt', data)
      
      const { processed_count, success_count, fail_count } = data
      this.notifyListeners('ui:toast', {
        type: 'success',
        title: 'Rebuild Complete',
        message: `Processed ${processed_count} summaries`,
        details: { success: success_count, failed: fail_count },
        data: data
      })
    })
  }
}