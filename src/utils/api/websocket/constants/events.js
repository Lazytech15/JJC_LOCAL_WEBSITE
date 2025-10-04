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

  // Recruitment events (if you have them)
  RECRUITMENT: {
    CREATED: 'recruitment:created',
    UPDATED: 'recruitment:updated',
    DELETED: 'recruitment:deleted',
  },

  // Generic data change
  DATA_CHANGED: 'data:changed',
}

// Room names
export const SOCKET_ROOMS = {
  EMPLOYEES: 'employees',
  DEPARTMENTS: 'departments',
  AUTH: 'auth',
  ATTENDANCE: 'attendance',
  DAILY_SUMMARY: 'daily-summary',
  RECRUITMENT: 'recruitment',
}

// Event categories for bulk operations
export const EVENT_CATEGORIES = {
  EMPLOYEE: Object.values(SOCKET_EVENTS.EMPLOYEE),
  DEPARTMENT: Object.values(SOCKET_EVENTS.DEPARTMENT),
  ATTENDANCE: Object.values(SOCKET_EVENTS.ATTENDANCE),
  DAILY_SUMMARY: Object.values(SOCKET_EVENTS.DAILY_SUMMARY),
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