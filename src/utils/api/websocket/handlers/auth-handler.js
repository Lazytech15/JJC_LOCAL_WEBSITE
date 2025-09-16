// ============================================================================
// websocket/handlers/auth-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class AuthEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.AUTH.USER_LOGGED_IN, (data) => {
      this.log('User logged in', data)
      this.notifyListeners('user_logged_in', data)
    })

    socket.on(SOCKET_EVENTS.DATA_CHANGED, (data) => {
      this.log('Data changed', data)
      this.notifyListeners('data_changed', data)
    })
  }
}