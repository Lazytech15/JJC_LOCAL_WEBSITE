// ============================================================================
// websocket/managers/room-manager.js
// ============================================================================
import { ROOM_EVENTS } from '../constants/events.js'

export class RoomManager {
  constructor(socket) {
    this.socket = socket
  }

  joinAllRooms() {
    if (this.socket && this.socket.connected) {
      const rooms = [
        ROOM_EVENTS.JOIN_EMPLOYEES,
        ROOM_EVENTS.JOIN_DEPARTMENTS,
        ROOM_EVENTS.JOIN_AUTH,
        ROOM_EVENTS.JOIN_DAILY_SUMMARY
      ]

      rooms.forEach(room => {
        this.socket.emit(room)
      })

      console.log('[API] Joined all socket rooms')
    }
  }

  joinRoom(room) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(room)
      console.log(`[API] Joined room: ${room}`)
    }
  }
}