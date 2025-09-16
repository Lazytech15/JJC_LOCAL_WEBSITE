// ============================================================================
// websocket/handlers/recruitment-handler.js
// ============================================================================
import { BaseEventHandler } from './base-event-handler.js'
import { SOCKET_EVENTS } from '../constants/events.js'

export class RecruitmentEventHandler extends BaseEventHandler {
  setupHandlers(socket) {
    socket.on(SOCKET_EVENTS.RECRUITMENT.UPDATED, (data) => {
      this.log('Recruitment updated', data)
      this.notifyListeners('recruitment_updated', data)
    })
  }
}