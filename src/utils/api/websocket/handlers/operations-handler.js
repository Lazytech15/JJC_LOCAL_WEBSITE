// ============================================================================
// websocket/handlers/operations-handler.js - NEW FILE
// ============================================================================
import { HandlerAdapter } from '../adapters/handler-adapter.js'
import apiService from '../../api-service.js'

export class OperationsEventHandler extends HandlerAdapter {
  setupHandlers(socket) {
    // Item events
    socket.on('operations:item_created', (data) => {
      console.log('✨ Operations Item Created:', data.part_number)
      this.handleItemCreated(data)
    })

    socket.on('operations:item_updated', (data) => {
      console.log('🔄 Operations Item Updated:', data.part_number)
      this.handleItemUpdated(data)
    })

    socket.on('operations:item_deleted', (data) => {
      console.log('🗑️ Operations Item Deleted:', data.part_number)
      this.handleItemDeleted(data)
    })

    // Phase events
    socket.on('operations:phase_created', (data) => {
      console.log('✨ Operations Phase Created:', data.phase_id)
      this.handlePhaseCreated(data)
    })

    socket.on('operations:phase_updated', (data) => {
      console.log('🔄 Operations Phase Updated:', data.phase_id)
      this.handlePhaseUpdated(data)
    })

    socket.on('operations:phase_started', (data) => {
      console.log('▶️ Operations Phase Started:', data.phase_id)
      this.handlePhaseStatusChange(data)
    })

    socket.on('operations:phase_stopped', (data) => {
      console.log('⏹️ Operations Phase Stopped:', data.phase_id)
      this.handlePhaseStatusChange(data)
    })

    socket.on('operations:phase_paused', (data) => {
      console.log('⏸️ Operations Phase Paused:', data.phase_id)
      this.handlePhaseStatusChange(data)
    })

    socket.on('operations:phase_resumed', (data) => {
      console.log('▶️ Operations Phase Resumed:', data.phase_id)
      this.handlePhaseStatusChange(data)
    })

    // Subphase events
    socket.on('operations:subphase_completed', (data) => {
      console.log('✅ Operations Subphase Completed:', data.subphase_id)
      this.handleSubphaseCompleted(data)
    })

    socket.on('operations:employee_assigned', (data) => {
      console.log('👤 Employee Assigned:', data.employee_name)
      this.handleEmployeeAssigned(data)
    })

    socket.on('operations:google_sheets_import', (data) => {
      console.log('📊 Google Sheets Import:', data.part_number)
      this.handleGoogleSheetsImport(data)
    })
  }

  async handleItemCreated(data) {
    
    // Notify UI listeners
    this.manager.notifyListeners('operations:item_created', data)
    this.manager.notifyListeners('operations:refresh', { type: 'item_created', data })
  }

  async handleItemUpdated(data) {
    
    // Notify UI listeners
    this.manager.notifyListeners('operations:item_updated', data)
    this.manager.notifyListeners('operations:refresh', { type: 'item_updated', data })
  }

  async handleItemDeleted(data) {
    
    // Notify UI listeners
    this.manager.notifyListeners('operations:item_deleted', data)
    this.manager.notifyListeners('operations:refresh', { type: 'item_deleted', data })
  }

  async handlePhaseCreated(data) {
    // Notify UI listeners
    this.manager.notifyListeners('operations:phase_created', data)
    this.manager.notifyListeners('operations:refresh', { type: 'phase_created', data })
  }

  async handlePhaseUpdated(data) {
    // Notify UI listeners
    this.manager.notifyListeners('operations:phase_updated', data)
    this.manager.notifyListeners('operations:refresh', { type: 'phase_updated', data })
  }

  async handlePhaseStatusChange(data) {
    // Notify UI listeners with specific event
    this.manager.notifyListeners('operations:phase_status_changed', data)
    this.manager.notifyListeners('operations:refresh', { type: 'phase_status', data })
  }

  async handleSubphaseCompleted(data) {
    // Notify UI listeners
    this.manager.notifyListeners('operations:subphase_completed', data)
    this.manager.notifyListeners('operations:refresh', { type: 'subphase_completed', data })
  }

  async handleEmployeeAssigned(data) {
    // Notify UI listeners
    this.manager.notifyListeners('operations:employee_assigned', data)
    this.manager.notifyListeners('operations:refresh', { type: 'employee_assigned', data })
  }

  async handleGoogleSheetsImport(data) {
    // Notify UI listeners
    this.manager.notifyListeners('operations:google_sheets_import', data)
    this.manager.notifyListeners('operations:refresh', { type: 'google_sheets_import', data })
  }
}