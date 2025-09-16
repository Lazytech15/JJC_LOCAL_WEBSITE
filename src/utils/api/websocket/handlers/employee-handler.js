// ============================================================================
// websocket/handlers/employee-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class EmployeeEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.EMPLOYEE.CREATED, (data) => {
      this.log('Employee created', data)
      this.notifyListeners('employee_created', data)
    })

    socket.on(SOCKET_EVENTS.EMPLOYEE.UPDATED, (data) => {
      this.log('Employee updated', data)
      this.notifyListeners('employee_updated', data)
    })

    socket.on(SOCKET_EVENTS.EMPLOYEE.DELETED, (data) => {
      this.log('Employee deleted', data)
      this.notifyListeners('employee_deleted', data)
    })
  }
}