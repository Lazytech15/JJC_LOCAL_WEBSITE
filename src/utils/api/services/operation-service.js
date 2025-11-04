// ============================================================================
// services/operations-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class OperationsService extends BaseAPIService {
  // ==================== ITEM METHODS ====================

  /**
   * Get all items with optional filtering
   * @param {Object} params - Query parameters (status, search)
   * @returns {Promise} Response with items array
   */
  async getItems(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/operations/items${queryParams ? `?${queryParams}` : ""}`)
  }

  /**
   * Get single item by ID with full details (phases and subphases)
   * @param {number|string} id - Item ID
   * @returns {Promise} Item data with phases and subphases
   */
  async getItem(id) {
    return this.request(`/api/operations/items?id=${id}`)
  }

  /**
   * Create new operations item
   * @param {Object} itemData - Item information (name, description)
   * @returns {Promise} Created item data
   */
  async createItem(itemData) {
    return this.request("/api/operations/items", {
      method: "POST",
      body: JSON.stringify(itemData),
    })
  }

  /**
   * Update item by ID
   * @param {number|string} id - Item ID
   * @param {Object} itemData - Updated item information (name, description, status, overall_progress)
   * @returns {Promise} Success confirmation
   */
  async updateItem(id, itemData) {
    return this.request(`/api/operations/items?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    })
  }

  /**
   * Delete item (cascades to phases and subphases)
   * @param {number|string} id - Item ID
   * @returns {Promise} Deletion confirmation
   */
  async deleteItem(id) {
    return this.request(`/api/operations/items?id=${id}`, {
      method: "DELETE",
    })
  }

  // ==================== PHASE METHODS ====================

  /**
   * Get phases for a specific item
   * @param {number|string} itemId - Item ID
   * @returns {Promise} Array of phases
   */
  async getPhases(itemId) {
    return this.request(`/api/operations/phases?item_id=${itemId}`)
  }

  /**
   * Get single phase by ID
   * @param {number|string} id - Phase ID
   * @returns {Promise} Phase data
   */
  async getPhase(id) {
    return this.request(`/api/operations/phases?id=${id}`)
  }

  /**
   * Create new phase
   * @param {Object} phaseData - Phase information (item_id, name)
   * @returns {Promise} Created phase data
   */
  async createPhase(phaseData) {
    return this.request("/api/operations/phases", {
      method: "POST",
      body: JSON.stringify(phaseData),
    })
  }

  /**
   * Update phase by ID
   * @param {number|string} id - Phase ID
   * @param {Object} phaseData - Updated phase information (name, phase_order, progress)
   * @returns {Promise} Success confirmation
   */
  async updatePhase(id, phaseData) {
    return this.request(`/api/operations/phases?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(phaseData),
    })
  }

  /**
   * Delete phase (cascades to subphases)
   * @param {number|string} id - Phase ID
   * @returns {Promise} Deletion confirmation
   */
  async deletePhase(id) {
    return this.request(`/api/operations/phases?id=${id}`, {
      method: "DELETE",
    })
  }

  // ==================== SUBPHASE METHODS ====================

  /**
   * Get subphases for a specific phase
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Array of subphases
   */
  async getSubphases(phaseId) {
    return this.request(`/api/operations/subphases?phase_id=${phaseId}`)
  }

  /**
   * Get single subphase by ID
   * @param {number|string} id - Subphase ID
   * @returns {Promise} Subphase data
   */
  async getSubphase(id) {
    return this.request(`/api/operations/subphases?id=${id}`)
  }

  /**
   * Create new subphase
   * @param {Object} subphaseData - Subphase information (item_id, phase_id, name, condition, expected_duration)
   * @returns {Promise} Created subphase data
   */
  async createSubphase(subphaseData) {
    return this.request("/api/operations/subphases", {
      method: "POST",
      body: JSON.stringify(subphaseData),
    })
  }

  /**
   * Update subphase by ID
   * @param {number|string} id - Subphase ID
   * @param {Object} subphaseData - Updated subphase information (name, condition, expected_duration, actual_hours, subphase_order)
   * @returns {Promise} Success confirmation
   */
  async updateSubphase(id, subphaseData) {
    return this.request(`/api/operations/subphases?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(subphaseData),
    })
  }

  /**
   * Delete subphase
   * @param {number|string} id - Subphase ID
   * @returns {Promise} Deletion confirmation
   */
  async deleteSubphase(id) {
    return this.request(`/api/operations/subphases?id=${id}`, {
      method: "DELETE",
    })
  }

  // ==================== ACTION METHODS ====================

  /**
   * Mark subphase as completed or uncompleted
   * @param {number|string} subphaseId - Subphase ID
   * @param {boolean} completed - Completion status (default: true)
   * @returns {Promise} Success confirmation
   */
  async completeSubphase(subphaseId, completed = true) {
    return this.request("/api/operations/complete-subphase", {
      method: "POST",
      body: JSON.stringify({ subphase_id: subphaseId, completed }),
    })
  }

  /**
   * Assign employee to subphase
   * @param {number|string} subphaseId - Subphase ID
   * @param {string} employeeBarcode - Employee barcode or ID number
   * @returns {Promise} Success confirmation with employee data
   */
  async assignEmployee(subphaseId, employeeBarcode) {
    return this.request("/api/operations/assign-employee", {
      method: "POST",
      body: JSON.stringify({ 
        subphase_id: subphaseId, 
        employee_barcode: employeeBarcode 
      }),
    })
  }

  // ==================== REPORTING METHODS ====================

  /**
   * Get operations statistics
   * @returns {Promise} Statistics including items by status, overall stats, top performers, time statistics
   */
  async getStatistics() {
    return this.request("/api/operations/statistics")
  }

  /**
   * Get audit log with optional filtering
   * @param {Object} params - Query parameters (item_id, limit, offset)
   * @returns {Promise} Audit log entries with pagination
   */
  async getAuditLog(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/operations/audit-log?${queryParams}`)
  }

  /**
   * Get employee performance metrics
   * @param {number|string|null} employeeUid - Optional employee UID for specific employee
   * @returns {Promise} Performance data for employee(s)
   */
  async getEmployeePerformance(employeeUid = null) {
    const url = employeeUid 
      ? `/api/operations/employee-performance?employee_uid=${employeeUid}`
      : "/api/operations/employee-performance"
    return this.request(url)
  }

  /**
   * Get progress report for items
   * @param {Object} params - Query parameters (item_id, format: 'json'|'summary'|'detailed')
   * @returns {Promise} Progress report data
   */
  async getProgressReport(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/operations/progress-report?${queryParams}`)
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Get item with full hierarchy (item -> phases -> subphases)
   * Alias for getItem() for clarity
   * @param {number|string} id - Item ID
   * @returns {Promise} Complete item hierarchy
   */
  async getItemHierarchy(id) {
    return this.getItem(id)
  }

  /**
   * Get all items by status
   * @param {string} status - Status filter ('not_started'|'in_progress'|'completed')
   * @returns {Promise} Filtered items
   */
  async getItemsByStatus(status) {
    return this.getItems({ status })
  }

  /**
   * Search items by name or description
   * @param {string} searchTerm - Search query
   * @returns {Promise} Matching items
   */
  async searchItems(searchTerm) {
    return this.getItems({ search: searchTerm })
  }

  /**
   * Get detailed progress report for specific item
   * @param {number|string} itemId - Item ID
   * @returns {Promise} Detailed report with all phases and subphases
   */
  async getDetailedItemReport(itemId) {
    return this.getProgressReport({ item_id: itemId, format: "detailed" })
  }

  /**
   * Get summary progress report for all items
   * @returns {Promise} Summary report
   */
  async getSummaryReport() {
    return this.getProgressReport({ format: "summary" })
  }

  /**
   * Get top performing employees
   * @returns {Promise} Top performers from statistics
   */
  async getTopPerformers() {
    const stats = await this.getStatistics()
    return stats.top_performers || []
  }

  /**
   * Get time statistics
   * @returns {Promise} Time-related metrics
   */
  async getTimeStatistics() {
    const stats = await this.getStatistics()
    return stats.time_statistics || {}
  }

  /**
   * Toggle subphase completion status
   * @param {number|string} subphaseId - Subphase ID
   * @param {boolean} currentStatus - Current completion status
   * @returns {Promise} Success confirmation
   */
  async toggleSubphaseCompletion(subphaseId, currentStatus) {
    return this.completeSubphase(subphaseId, !currentStatus)
  }

  /**
   * Get recent audit log entries
   * @param {number} limit - Number of entries to retrieve (default: 50)
   * @returns {Promise} Recent audit entries
   */
  async getRecentAuditLog(limit = 50) {
    return this.getAuditLog({ limit, offset: 0 })
  }

  /**
   * Get audit log for specific item
   * @param {number|string} itemId - Item ID
   * @param {number} limit - Number of entries (default: 100)
   * @returns {Promise} Item-specific audit entries
   */
  async getItemAuditLog(itemId, limit = 100) {
    return this.getAuditLog({ item_id: itemId, limit })
  }
}