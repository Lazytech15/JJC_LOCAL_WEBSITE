// ============================================================================
// websocket/handlers/department-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class DepartmentEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.DEPARTMENT.CREATED, (data) => {
      this.log('Department created', data)
      this.notifyListeners('department_created', data)
    })

    socket.on(SOCKET_EVENTS.DEPARTMENT.UPDATED, (data) => {
      this.log('Department updated', data)
      this.notifyListeners('department_updated', data)
    })

    socket.on(SOCKET_EVENTS.DEPARTMENT.DELETED, (data) => {
      this.log('Department deleted', data)
      this.notifyListeners('department_deleted', data)
    })
  }
}