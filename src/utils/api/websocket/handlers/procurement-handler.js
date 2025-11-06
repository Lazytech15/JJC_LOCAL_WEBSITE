// ============================================================================
// websocket/handlers/procurement-handler.js
// Real-time purchase order event handler for Procurement
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class ProcurementEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    // Purchase Order events
    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_CREATED, (data) => {
      this.handlePOCreated(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_UPDATED, (data) => {
      this.handlePOUpdated(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_DELETED, (data) => {
      this.handlePODeleted(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_STATUS_CHANGED, (data) => {
      this.handlePOStatusChanged(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_APPROVED, (data) => {
      this.handlePOApproved(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_REJECTED, (data) => {
      this.handlePORejected(data)
    })

    socket.on(SOCKET_EVENTS.PROCUREMENT.PO_RECEIVED, (data) => {
      this.handlePOReceived(data)
    })

    this.log('Procurement event handlers registered')
  }

  handlePOCreated(data) {
    this.log('Purchase Order created', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_CREATED, data)
    
    // Trigger PO list refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'create', 
      poId: data.id,
      poNumber: data.po_number 
    })
  }

  handlePOUpdated(data) {
    this.log('Purchase Order updated', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_UPDATED, data)
    
    // Trigger PO refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'update', 
      poId: data.id,
      poNumber: data.po_number 
    })
  }

  handlePODeleted(data) {
    this.log('Purchase Order deleted', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_DELETED, data)
    
    // Trigger PO list refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'delete', 
      poId: data.id 
    })
  }

  handlePOStatusChanged(data) {
    this.log('Purchase Order status changed', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_STATUS_CHANGED, data)
    
    // Trigger PO refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'status_change', 
      poId: data.id,
      oldStatus: data.old_status,
      newStatus: data.new_status 
    })
  }

  handlePOApproved(data) {
    this.log('Purchase Order approved', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_APPROVED, data)
    
    // Trigger PO refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'approved', 
      poId: data.id 
    })
  }

  handlePORejected(data) {
    this.log('Purchase Order rejected', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_REJECTED, data)
    
    // Trigger PO refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'rejected', 
      poId: data.id 
    })
  }

  handlePOReceived(data) {
    this.log('Purchase Order received', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.PROCUREMENT.PO_RECEIVED, data)
    
    // Trigger PO refresh
    this.notifyListeners('procurement:refresh', { 
      type: 'received', 
      poId: data.id 
    })
    
    // Also trigger inventory refresh since stock was updated
    this.notifyListeners('inventory:refresh', { 
      type: 'po_received', 
      poId: data.id 
    })
  }
}
