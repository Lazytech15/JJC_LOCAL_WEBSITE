// ============================================================================
// websocket/handlers/attendance-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class AttendanceEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.ATTENDANCE.CREATED, (data) => {
      this.log('Attendance created', data)
      this.notifyListeners('attendance_created', data)
    })

    socket.on(SOCKET_EVENTS.ATTENDANCE.UPDATED, (data) => {
      this.log('Attendance updated', data)
      this.notifyListeners('attendance_updated', data)
    })

    socket.on(SOCKET_EVENTS.ATTENDANCE.DELETED, (data) => {
      this.log('Attendance deleted', data)
      this.notifyListeners('attendance_deleted', data)
    })

    socket.on(SOCKET_EVENTS.ATTENDANCE.SYNCED, (data) => {
      this.log('Attendance synced', data)
      this.notifyListeners('attendance_synced', data)
    })
  }
}