// ============================================================================
// hooks/useInventorySync.ts
// Real-time inventory synchronization hook for Toolbox
// ============================================================================
import { useEffect, useCallback, useRef } from 'react'
import { pollingManager } from '../../src/utils/api/websocket/polling-manager.jsx'
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../src/utils/api/websocket/constants/events.js'
import { InventoryEventHandler } from '../../src/utils/api/websocket/handlers/inventory-handler.js'
import { ProcurementEventHandler } from '../../src/utils/api/websocket/handlers/procurement-handler.js'

interface InventoryChangeEvent {
  type: 'update' | 'insert' | 'remove' | 'create' | 'delete' | 'checkout' | 'po_received'
  itemNo?: string
  quantity?: number
  poId?: string
}

interface UseInventorySyncOptions {
  onInventoryChange?: (event: InventoryChangeEvent) => void
  onItemChange?: (data: any) => void
  onCheckout?: (data: any) => void
  onLogCreated?: (data: any) => void
  onPOChange?: (event: any) => void
  enabled?: boolean
}

export function useInventorySync(options: UseInventorySyncOptions = {}) {
  const {
    onInventoryChange,
    onItemChange,
    onCheckout,
    onLogCreated,
    onPOChange,
    enabled = true
  } = options

  const handlersRegistered = useRef(false)
  const unsubscribers = useRef<(() => void)[]>([])

  // Initialize polling manager and register handlers
  useEffect(() => {
    if (!enabled) return

    // Register event handlers only once
    if (!handlersRegistered.current) {
      // Create handlers (they register themselves with the manager)
      new InventoryEventHandler(pollingManager)
      new ProcurementEventHandler(pollingManager)
      
      // Initialize polling
      pollingManager.initialize()
      
      // Join inventory and procurement rooms
      pollingManager.joinRoom(SOCKET_ROOMS.INVENTORY)
      pollingManager.joinRoom(SOCKET_ROOMS.PROCUREMENT)
      
      handlersRegistered.current = true
      console.log('📦 Inventory sync initialized')
    }

    return () => {
      // Cleanup is handled separately
    }
  }, [enabled])

  // Subscribe to inventory refresh events
  useEffect(() => {
    if (!enabled) return

    const unsubInventoryRefresh = pollingManager.subscribeToUpdates(
      'inventory:refresh',
      (event: InventoryChangeEvent) => {
        console.log('📦 Inventory refresh event:', event)
        onInventoryChange?.(event)
      }
    )

    unsubscribers.current.push(unsubInventoryRefresh)

    return () => {
      unsubInventoryRefresh()
    }
  }, [enabled, onInventoryChange])

  // Subscribe to specific inventory events
  useEffect(() => {
    if (!enabled || !onItemChange) return

    const events = [
      SOCKET_EVENTS.INVENTORY.UPDATED,
      SOCKET_EVENTS.INVENTORY.INSERTED,
      SOCKET_EVENTS.INVENTORY.REMOVED,
      SOCKET_EVENTS.INVENTORY.ITEM_CREATED,
      SOCKET_EVENTS.INVENTORY.ITEM_UPDATED,
      SOCKET_EVENTS.INVENTORY.ITEM_DELETED
    ]

    const unsubs = events.map(event =>
      pollingManager.subscribeToUpdates(event, onItemChange)
    )

    unsubscribers.current.push(...unsubs)

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [enabled, onItemChange])

  // Subscribe to checkout events
  useEffect(() => {
    if (!enabled || !onCheckout) return

    const unsub = pollingManager.subscribeToUpdates(
      SOCKET_EVENTS.INVENTORY.CHECKOUT_COMPLETED,
      onCheckout
    )

    unsubscribers.current.push(unsub)

    return () => {
      unsub()
    }
  }, [enabled, onCheckout])

  // Subscribe to employee log events
  useEffect(() => {
    if (!enabled || !onLogCreated) return

    const unsub = pollingManager.subscribeToUpdates(
      SOCKET_EVENTS.INVENTORY.LOG_CREATED,
      onLogCreated
    )

    unsubscribers.current.push(unsub)

    return () => {
      unsub()
    }
  }, [enabled, onLogCreated])

  // Subscribe to procurement events
  useEffect(() => {
    if (!enabled || !onPOChange) return

    const unsubPORefresh = pollingManager.subscribeToUpdates(
      'procurement:refresh',
      onPOChange
    )

    const events = [
      SOCKET_EVENTS.PROCUREMENT.PO_CREATED,
      SOCKET_EVENTS.PROCUREMENT.PO_UPDATED,
      SOCKET_EVENTS.PROCUREMENT.PO_DELETED,
      SOCKET_EVENTS.PROCUREMENT.PO_STATUS_CHANGED,
      SOCKET_EVENTS.PROCUREMENT.PO_APPROVED,
      SOCKET_EVENTS.PROCUREMENT.PO_REJECTED,
      SOCKET_EVENTS.PROCUREMENT.PO_RECEIVED
    ]

    const unsubs = events.map(event =>
      pollingManager.subscribeToUpdates(event, onPOChange)
    )

    unsubscribers.current.push(unsubPORefresh, ...unsubs)

    return () => {
      unsubPORefresh()
      unsubs.forEach(unsub => unsub())
    }
  }, [enabled, onPOChange])

  // Manual refresh trigger
  const triggerRefresh = useCallback(() => {
    pollingManager.ping()
  }, [])

  // Get connection status
  const isConnected = pollingManager.isConnected

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribers.current.forEach(unsub => unsub())
      unsubscribers.current = []
    }
  }, [])

  return {
    isConnected,
    triggerRefresh
  }
}
