// ============================================================================
// websocket/handlers/connection-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class ConnectionEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.log(`Socket connected: ${socket.id}`)
      this.socketManager.joinRooms()
    })

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.log('Socket disconnected')
    })

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      this.error('Socket error', error)
    })

    socket.on(SOCKET_EVENTS.PONG, () => {
      this.log('Pong received')
    })
  }
}