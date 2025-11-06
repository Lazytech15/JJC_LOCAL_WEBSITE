// ============================================================================
// websocket/handlers/inventory-handler.js
// Real-time inventory/stock event handler for Toolbox
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class InventoryEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    // Stock update events
    socket.on(SOCKET_EVENTS.INVENTORY.UPDATED, (data) => {
      this.handleStockUpdated(data)
    })

    socket.on(SOCKET_EVENTS.INVENTORY.INSERTED, (data) => {
      this.handleStockInserted(data)
    })

    socket.on(SOCKET_EVENTS.INVENTORY.REMOVED, (data) => {
      this.handleStockRemoved(data)
    })

    // Item CRUD events
    socket.on(SOCKET_EVENTS.INVENTORY.ITEM_CREATED, (data) => {
      this.handleItemCreated(data)
    })

    socket.on(SOCKET_EVENTS.INVENTORY.ITEM_UPDATED, (data) => {
      this.handleItemUpdated(data)
    })

    socket.on(SOCKET_EVENTS.INVENTORY.ITEM_DELETED, (data) => {
      this.handleItemDeleted(data)
    })

    // Checkout events
    socket.on(SOCKET_EVENTS.INVENTORY.CHECKOUT_COMPLETED, (data) => {
      this.handleCheckoutCompleted(data)
    })

    // Employee log events
    socket.on(SOCKET_EVENTS.INVENTORY.LOG_CREATED, (data) => {
      this.handleLogCreated(data)
    })

    this.log('Inventory event handlers registered')
  }

  handleStockUpdated(data) {
    this.log('Stock updated', data)
    
    // Notify UI to refresh inventory
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.UPDATED, data)
    
    // Also trigger generic inventory refresh
    this.notifyListeners('inventory:refresh', { 
      type: 'update', 
      itemNo: data.item_no 
    })
  }

  handleStockInserted(data) {
    this.log('Stock inserted', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.INSERTED, data)
    
    // Trigger refresh
    this.notifyListeners('inventory:refresh', { 
      type: 'insert', 
      itemNo: data.item_no,
      quantityAdded: data.quantity_added 
    })
  }

  handleStockRemoved(data) {
    this.log('Stock removed', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.REMOVED, data)
    
    // Trigger refresh
    this.notifyListeners('inventory:refresh', { 
      type: 'remove', 
      itemNo: data.item_no,
      quantityRemoved: data.quantity_removed 
    })
  }

  handleItemCreated(data) {
    this.log('Item created', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.ITEM_CREATED, data)
    
    // Trigger full refresh (new item added)
    this.notifyListeners('inventory:refresh', { 
      type: 'create', 
      itemNo: data.item_no 
    })
  }

  handleItemUpdated(data) {
    this.log('Item updated', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.ITEM_UPDATED, data)
    
    // Trigger refresh
    this.notifyListeners('inventory:refresh', { 
      type: 'update', 
      itemNo: data.item_no 
    })
  }

  handleItemDeleted(data) {
    this.log('Item deleted', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.ITEM_DELETED, data)
    
    // Trigger refresh
    this.notifyListeners('inventory:refresh', { 
      type: 'delete', 
      itemNo: data.item_no 
    })
  }

  handleCheckoutCompleted(data) {
    this.log('Checkout completed', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.CHECKOUT_COMPLETED, data)
    
    // Trigger refresh for all affected items
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(item => {
        this.notifyListeners('inventory:refresh', { 
          type: 'checkout', 
          itemNo: item.item_no,
          quantity: item.quantity_checked_out 
        })
      })
    }
  }

  handleLogCreated(data) {
    this.log('Employee log created', data)
    
    // Notify UI
    this.notifyListeners(SOCKET_EVENTS.INVENTORY.LOG_CREATED, data)
    
    // Trigger transactions/logs refresh
    this.notifyListeners('inventory:logs:refresh', { 
      logId: data.id 
    })
  }
}
