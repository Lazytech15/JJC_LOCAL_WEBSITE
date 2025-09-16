// ============================================================================
// websocket/constants/events.js
// ============================================================================
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  
  // Employee events
  EMPLOYEE: {
    CREATED: 'employee:created',
    UPDATED: 'employee:updated',
    DELETED: 'employee:deleted'
  },
  
  // Department events
  DEPARTMENT: {
    CREATED: 'department:created',
    UPDATED: 'department:updated',
    DELETED: 'department:deleted'
  },
  
  // Auth events
  AUTH: {
    USER_LOGGED_IN: 'user:logged-in'
  },
  
  // Generic events
  DATA_CHANGED: 'data:changed',
  
  // Attendance events
  ATTENDANCE: {
    CREATED: 'attendance_created',
    UPDATED: 'attendance_updated',
    DELETED: 'attendance_deleted',
    SYNCED: 'attendance_synced'
  },
  
  // Daily Summary events
  DAILY_SUMMARY: {
    CREATED: 'daily_summary_created',
    UPDATED: 'daily_summary_updated',
    DELETED: 'daily_summary_deleted',
    SYNCED: 'daily_summary_synced',
    REBUILT: 'daily_summary_rebuilt'
  },
  
  // Recruitment events
  RECRUITMENT: {
    UPDATED: 'recruitment_updated'
  }
}

export const ROOM_EVENTS = {
  JOIN_EMPLOYEES: 'join-employees',
  JOIN_DEPARTMENTS: 'join-departments',
  JOIN_AUTH: 'join-auth',
  JOIN_DAILY_SUMMARY: 'join-daily-summary'
}