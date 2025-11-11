// ============================================================================
// websocket/constants/events.js
// Event name constants for type safety and consistency
// ============================================================================

export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  PING: 'ping',
  PONG: 'pong',

  // Employee events
  EMPLOYEE: {
    CREATED: 'employee:created',
    UPDATED: 'employee:updated',
    DELETED: 'employee:deleted',
  },

  // Department events
  DEPARTMENT: {
    CREATED: 'department:created',
    UPDATED: 'department:updated',
    DELETED: 'department:deleted',
  },

  // Auth events
  AUTH: {
    LOGIN: 'user:logged-in',
    LOGOUT: 'user:logged-out',
  },

  // Attendance events
  ATTENDANCE: {
    CREATED: 'attendance_created',
    UPDATED: 'attendance_updated',
    DELETED: 'attendance_deleted',
    SYNCED: 'attendance_synced',
  },

  // Daily Summary events
  DAILY_SUMMARY: {
    CREATED: 'daily_summary_created',
    UPDATED: 'daily_summary_updated',
    DELETED: 'daily_summary_deleted',
    SYNCED: 'daily_summary_synced',
    REBUILT: 'daily_summary_rebuilt',
  },

  // Inventory/Stock events (Toolbox)
  INVENTORY: {
    UPDATED: 'stock_updated',
    INSERTED: 'stock_inserted',
    REMOVED: 'stock_removed',
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_DELETED: 'item_deleted',
    CHECKOUT_COMPLETED: 'checkout_completed',
    LOG_CREATED: 'employee_log_created',
  },

  // Procurement events (Purchase Orders)
  PROCUREMENT: {
    PO_CREATED: 'po_created',
    PO_UPDATED: 'po_updated',
    PO_DELETED: 'po_deleted',
    PO_STATUS_CHANGED: 'po_status_changed',
    PO_APPROVED: 'po_approved',
    PO_REJECTED: 'po_rejected',
    PO_RECEIVED: 'po_received',
  },

  // Recruitment events (if you have them)
  RECRUITMENT: {
    CREATED: 'recruitment:created',
    UPDATED: 'recruitment:updated',
    DELETED: 'recruitment:deleted',
  },

  // Generic data change
  DATA_CHANGED: 'data:changed',

  // Operations events (ADD THIS)
  OPERATIONS: {
    ITEM_CREATED: 'operations:item_created',
    ITEM_UPDATED: 'operations:item_updated',
    ITEM_DELETED: 'operations:item_deleted',
    PHASE_CREATED: 'operations:phase_created',
    PHASE_UPDATED: 'operations:phase_updated',
    PHASE_DELETED: 'operations:phase_deleted',
    PHASE_STARTED: 'operations:phase_started',
    PHASE_STOPPED: 'operations:phase_stopped',
    PHASE_PAUSED: 'operations:phase_paused',
    PHASE_RESUMED: 'operations:phase_resumed',
    SUBPHASE_CREATED: 'operations:subphase_created',
    SUBPHASE_UPDATED: 'operations:subphase_updated',
    SUBPHASE_DELETED: 'operations:subphase_deleted',
    SUBPHASE_COMPLETED: 'operations:subphase_completed',
    EMPLOYEE_ASSIGNED: 'operations:employee_assigned',
    GOOGLE_SHEETS_IMPORT: 'operations:google_sheets_import',
  },
}

// Room names
export const SOCKET_ROOMS = {
  EMPLOYEES: 'employees',
  DEPARTMENTS: 'departments',
  AUTH: 'auth',
  ATTENDANCE: 'attendance',
  DAILY_SUMMARY: 'daily-summary',
  INVENTORY: 'inventory',
  PROCUREMENT: 'procurement',
  RECRUITMENT: 'recruitment',
  OPERATIONS: 'operations',
}

// Event categories for bulk operations
export const EVENT_CATEGORIES = {
  EMPLOYEE: Object.values(SOCKET_EVENTS.EMPLOYEE),
  DEPARTMENT: Object.values(SOCKET_EVENTS.DEPARTMENT),
  ATTENDANCE: Object.values(SOCKET_EVENTS.ATTENDANCE),
  DAILY_SUMMARY: Object.values(SOCKET_EVENTS.DAILY_SUMMARY),
  INVENTORY: Object.values(SOCKET_EVENTS.INVENTORY),
  PROCUREMENT: Object.values(SOCKET_EVENTS.PROCUREMENT),
  OPERATIONS: Object.values(SOCKET_EVENTS.OPERATIONS),
}

// Helper function to get all event names
export function getAllEventNames() {
  const events = []
  
  function extractEvents(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        events.push(obj[key])
      } else if (typeof obj[key] === 'object') {
        extractEvents(obj[key])
      }
    }
  }
  
  extractEvents(SOCKET_EVENTS)
  return events
}

// Helper function to check if event is valid
export function isValidEvent(eventName) {
  return getAllEventNames().includes(eventName)
}