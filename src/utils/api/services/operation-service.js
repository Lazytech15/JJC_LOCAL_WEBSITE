// ============================================================================
// services/operations-service.js - Updated for part_number schema
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
   * Get single item by part_number with full details (phases and subphases)
   * @param {string} partNumber - Item part number
   * @returns {Promise} Item data with phases and subphases
   */
  async getItem(partNumber) {
    return this.request(`/api/operations/items?part_number=${encodeURIComponent(partNumber)}`)
  }

  /**
   * Create new operations item
   * @param {Object} itemData - Item information (part_number, name, description)
   * @returns {Promise} Created item data
   */
  async createItem(itemData) {
    if (!itemData.part_number) {
      throw new Error('part_number is required')
    }
    if (!itemData.name) {
      throw new Error('name is required')
    }
    return this.request("/api/operations/items", {
      method: "POST",
      body: JSON.stringify(itemData),
    })
  }

  /**
   * Update item by part_number
   * @param {string} partNumber - Item part number
   * @param {Object} itemData - Updated item information (name, description, status, overall_progress)
   * @returns {Promise} Success confirmation
   */
  async updateItem(partNumber, itemData) {
    return this.request(`/api/operations/items?part_number=${encodeURIComponent(partNumber)}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    })
  }

  /**
   * Delete item (cascades to phases and subphases)
   * @param {string} partNumber - Item part number
   * @returns {Promise} Deletion confirmation
   */
  async deleteItem(partNumber) {
    return this.request(`/api/operations/items?part_number=${encodeURIComponent(partNumber)}`, {
      method: "DELETE",
    })
  }

  // ==================== PHASE METHODS ====================

  /**
   * Get phases for a specific item
   * @param {string} partNumber - Item part number
   * @returns {Promise} Array of phases
   */
  async getPhases(partNumber) {
    return this.request(`/api/operations/phases?part_number=${encodeURIComponent(partNumber)}`)
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
   * @param {Object} phaseData - Phase information (part_number, name)
   * @returns {Promise} Created phase data
   */
  async createPhase(phaseData) {
    if (!phaseData.part_number) {
      throw new Error('part_number is required')
    }
    if (!phaseData.name) {
      throw new Error('name is required')
    }
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
   * @param {Object} subphaseData - Subphase information (part_number, phase_id, name, condition, expected_duration)
   * @returns {Promise} Created subphase data
   */
  async createSubphase(subphaseData) {
    if (!subphaseData.part_number) {
      throw new Error('part_number is required')
    }
    if (!subphaseData.phase_id) {
      throw new Error('phase_id is required')
    }
    if (!subphaseData.name) {
      throw new Error('name is required')
    }
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
   * @param {Object} params - Query parameters (part_number, limit, offset)
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
   * @param {Object} params - Query parameters (part_number, format: 'json'|'summary'|'detailed')
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
   * @param {string} partNumber - Item part number
   * @returns {Promise} Complete item hierarchy
   */
  async getItemHierarchy(partNumber) {
    return this.getItem(partNumber)
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
   * Search items by part number, name or description
   * @param {string} searchTerm - Search query
   * @returns {Promise} Matching items
   */
  async searchItems(searchTerm) {
    return this.getItems({ search: searchTerm })
  }

  /**
   * Get detailed progress report for specific item
   * @param {string} partNumber - Item part number
   * @returns {Promise} Detailed report with all phases and subphases
   */
  async getDetailedItemReport(partNumber) {
    return this.getProgressReport({ part_number: partNumber, format: "detailed" })
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
   * @param {string} partNumber - Item part number
   * @param {number} limit - Number of entries (default: 100)
   * @returns {Promise} Item-specific audit entries
   */
  async getItemAuditLog(partNumber, limit = 100) {
    return this.getAuditLog({ part_number: partNumber, limit })
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Create item with phases and subphases in one call
   * @param {Object} itemData - Complete item structure
   * @param {string} itemData.part_number - Item part number
   * @param {string} itemData.name - Item name
   * @param {string} itemData.description - Item description
   * @param {Array} itemData.phases - Array of phases with subphases
   * @returns {Promise} Created item with all phases and subphases
   */
  async createItemWithStructure(itemData) {
    // Create item first
    const item = await this.createItem({
      part_number: itemData.part_number,
      name: itemData.name,
      description: itemData.description
    })

    // Create phases if provided
    if (itemData.phases && itemData.phases.length > 0) {
      for (const phaseData of itemData.phases) {
        const phase = await this.createPhase({
          part_number: itemData.part_number,
          name: phaseData.name
        })

        // Create subphases if provided
        if (phaseData.subphases && phaseData.subphases.length > 0) {
          for (const subphaseData of phaseData.subphases) {
            await this.createSubphase({
              part_number: itemData.part_number,
              phase_id: phase.id,
              name: subphaseData.name,
              condition: subphaseData.condition,
              expected_duration: subphaseData.expected_duration || 0
            })
          }
        }
      }
    }

    // Return complete item with hierarchy
    return this.getItemHierarchy(itemData.part_number)
  }

  /**
   * Get all incomplete items
   * @returns {Promise} Items that are not completed
   */
  async getIncompleteItems() {
    const allItems = await this.getItems()
    return allItems.filter(item => item.status !== 'completed')
  }

  /**
   * Get all items assigned to specific employee
   * @param {number|string} employeeUid - Employee UID
   * @returns {Promise} Items with employee assignments
   */
  async getEmployeeItems(employeeUid) {
    const performance = await this.getEmployeePerformance(employeeUid)
    return performance.recent_tasks || []
  }

  /**
   * Validate part number format (optional helper)
   * @param {string} partNumber - Part number to validate
   * @returns {boolean} True if valid
   */
  validatePartNumber(partNumber) {
    if (!partNumber || typeof partNumber !== 'string') {
      return false
    }
    // Basic validation - adjust rules as needed
    if (partNumber.length > 100) {
      return false
    }
    // Part number should not be empty after trim
    if (partNumber.trim().length === 0) {
      return false
    }
    return true
  }

  /**
   * Check if item exists by part number
   * @param {string} partNumber - Part number to check
   * @returns {Promise<boolean>} True if item exists
   */
  async itemExists(partNumber) {
    try {
      await this.getItem(partNumber)
      return true
    } catch (error) {
      if (error.message && error.message.includes('404')) {
        return false
      }
      throw error
    }
  }

  /**
   * Get items with completion percentage
   * @param {number} minPercentage - Minimum completion percentage (0-100)
   * @param {number} maxPercentage - Maximum completion percentage (0-100)
   * @returns {Promise} Filtered items
   */
  async getItemsByCompletionRange(minPercentage = 0, maxPercentage = 100) {
    const allItems = await this.getItems()
    return allItems.filter(item => {
      const progress = item.overall_progress || 0
      return progress >= minPercentage && progress <= maxPercentage
    })
  }

  /**
   * Get items nearing completion (80-99%)
   * @returns {Promise} Items near completion
   */
  async getItemsNearingCompletion() {
    return this.getItemsByCompletionRange(80, 99)
  }

  /**
   * Get recently created items
   * @param {number} days - Number of days to look back (default: 7)
   * @returns {Promise} Recent items
   */
  async getRecentItems(days = 7) {
    const allItems = await this.getItems()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return allItems.filter(item => {
      const createdDate = new Date(item.created_at)
      return createdDate >= cutoffDate
    })
  }

  /**
 * Start item process - records start_time
 * @param {string} partNumber - Item part number
 * @returns {Promise} Success confirmation
 */
async startItemProcess(partNumber) {
  return this.request(`/api/operations/start-item`, {
    method: "POST",
    body: JSON.stringify({ part_number: partNumber }),
  })
}

/**
 * Stop item process - records end_time
 * @param {string} partNumber - Item part number
 * @returns {Promise} Success confirmation
 */
async stopItemProcess(partNumber) {
  return this.request(`/api/operations/stop-item`, {
    method: "POST",
    body: JSON.stringify({ part_number: partNumber }),
  })
}

/**
 * Reset item process times - clears start_time and end_time
 * @param {string} partNumber - Item part number
 * @returns {Promise} Success confirmation
 */
async resetItemProcess(partNumber) {
  return this.request(`/api/operations/reset-item`, {
    method: "POST",
    body: JSON.stringify({ part_number: partNumber }),
  })
}
}