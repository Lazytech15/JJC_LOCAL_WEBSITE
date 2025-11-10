// ============================================================================
// services/operations-service.js - Updated for part_number schema with client_name, priority, remarks
// ============================================================================
import { BaseAPIService } from "../core/base-api.js";

export class OperationsService extends BaseAPIService {
  // ==================== ITEM METHODS ====================

  /**
   * Get all items with optional filtering
   * @param {Object} params - Query parameters (status, search, priority, client_name)
   * @returns {Promise} Response with items array
   */
  async getItems(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(
      `/api/operations/items${queryParams ? `?${queryParams}` : ""}`
    );
  }

  /**
   * Get single item by part_number with full details (phases and subphases)
   * @param {string} partNumber - Item part number
   * @returns {Promise} Item data with phases and subphases
   */
  async getItem(partNumber) {
    return this.request(
      `/api/operations/items?part_number=${encodeURIComponent(partNumber)}`
    );
  }

  /**
 * Create new operations item
 */
  async createItem(itemData) {
    if (!itemData.part_number) {
      throw new Error("part_number is required");
    }
    if (!itemData.name) {
      throw new Error("name is required");
    }
    if (
      itemData.priority &&
      !["High", "Medium", "Low"].includes(itemData.priority)
    ) {
      throw new Error("priority must be High, Medium, or Low");
    }

    const result = await this.request("/api/operations/items", {
      method: "POST",
      body: JSON.stringify(itemData),
    });

    // Invalidate cache after creating
    this.invalidateAllItemsCache();

    return result;
  }

  /**
   * Update item by part_number
   */
  async updateItem(partNumber, itemData) {
    if (
      itemData.priority &&
      !["High", "Medium", "Low"].includes(itemData.priority)
    ) {
      throw new Error("priority must be High, Medium, or Low");
    }

    const result = await this.request(
      `/api/operations/items?part_number=${encodeURIComponent(partNumber)}`,
      {
        method: "PUT",
        body: JSON.stringify(itemData),
      }
    );

    // Invalidate cache for this item
    this.invalidateItemCache(partNumber);

    return result;
  }

  /**
   * Delete item (cascades to phases and subphases)
   */
  async deleteItem(partNumber) {
    const result = await this.request(
      `/api/operations/items?part_number=${encodeURIComponent(partNumber)}`,
      {
        method: "DELETE",
      }
    );

    // Invalidate cache after deleting
    this.invalidateAllItemsCache();

    return result;
  }

  // ==================== PHASE METHODS ====================

  /**
   * Get phases for a specific item
   * @param {string} partNumber - Item part number
   * @returns {Promise} Array of phases
   */
  async getPhases(partNumber) {
    return this.request(
      `/api/operations/phases?part_number=${encodeURIComponent(partNumber)}`
    );
  }

  /**
   * Get single phase by ID
   * @param {number|string} id - Phase ID
   * @returns {Promise} Phase data
   */
  async getPhase(id) {
    return this.request(`/api/operations/phases?id=${id}`);
  }

  /**
 * Create new phase
 */
  async createPhase(phaseData) {
    if (!phaseData.part_number) {
      throw new Error("part_number is required");
    }
    if (!phaseData.name) {
      throw new Error("name is required");
    }

    const result = await this.request("/api/operations/phases", {
      method: "POST",
      body: JSON.stringify(phaseData),
    });

    // Invalidate cache for the item
    this.invalidateItemCache(phaseData.part_number);

    return result;
  }

  /**
   * Update phase by ID
   */
  async updatePhase(id, phaseData) {
    const result = await this.request(`/api/operations/phases?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(phaseData),
    });

    // Invalidate all items cache since we don't know which item this phase belongs to
    this.invalidateAllItemsCache();

    return result;
  }

  /**
   * Delete phase (cascades to subphases)
   */
  async deletePhase(id) {
    const result = await this.request(`/api/operations/phases?id=${id}`, {
      method: "DELETE",
    });

    // Invalidate all items cache
    this.invalidateAllItemsCache();

    return result;
  }

  // ==================== SUBPHASE METHODS ====================

  /**
   * Get subphases for a specific phase
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Array of subphases
   */
  async getSubphases(phaseId) {
    return this.request(`/api/operations/subphases?phase_id=${phaseId}`);
  }

  /**
   * Get single subphase by ID
   * @param {number|string} id - Subphase ID
   * @returns {Promise} Subphase data
   */
  async getSubphase(id) {
    return this.request(`/api/operations/subphases?id=${id}`);
  }

  /**
  * Create new subphase
  */
  async createSubphase(subphaseData) {
    if (!subphaseData.part_number) {
      throw new Error("part_number is required");
    }
    if (!subphaseData.phase_id) {
      throw new Error("phase_id is required");
    }
    if (!subphaseData.name) {
      throw new Error("name is required");
    }

    const result = await this.request("/api/operations/subphases", {
      method: "POST",
      body: JSON.stringify(subphaseData),
    });

    // Invalidate cache for the item
    this.invalidateItemCache(subphaseData.part_number);

    return result;
  }

  /**
   * Update subphase by ID
   */
  async updateSubphase(id, subphaseData) {
    const result = await this.request(`/api/operations/subphases?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(subphaseData),
    });

    // Invalidate all items cache
    this.invalidateAllItemsCache();

    return result;
  }

  /**
   * Delete subphase
   */
  async deleteSubphase(id) {
    const result = await this.request(`/api/operations/subphases?id=${id}`, {
      method: "DELETE",
    });

    // Invalidate all items cache
    this.invalidateAllItemsCache();

    return result;
  }

  // ==================== ACTION METHODS ====================

  /**
   * Mark subphase as completed with time duration
   * @param {number|string} subphaseId - Subphase ID
   * @param {boolean} completed - Completion status
   * @param {number} timeDuration - Duration in seconds (integer)
   * @returns {Promise} Success confirmation
   */
  async completeSubphaseWithDuration(
    subphaseId,
    completed = true,
    timeDuration = null
  ) {
    return this.request("/api/operations/complete-subphase", {
      method: "POST",
      body: JSON.stringify({
        subphase_id: subphaseId,
        completed,
        time_duration: timeDuration,
      }),
    });
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
        employee_barcode: employeeBarcode,
      }),
    });
  }

  // ==================== PROCESS CONTROL METHODS ====================

  /**
   * Start phase process - records start_time
   * @param {string} partNumber - Item part number
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Success confirmation
   */
  async startPhaseProcess(partNumber, phaseId) {
    return this.request(`/api/operations/start-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });
  }

  /**
   * Stop phase process - records end_time
   * @param {string} partNumber - Item part number
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Success confirmation
   */
  async stopPhaseProcess(partNumber, phaseId) {
    return this.request(`/api/operations/stop-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });
  }

  /**
   * Pause phase process - records pause_time
   * @param {string} partNumber - Item part number
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Success confirmation
   */
  async pausePhaseProcess(partNumber, phaseId) {
    return this.request(`/api/operations/pause-phase`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });
  }

  /**
   * Resume phase process - clears pause_time
   * @param {string} partNumber - Item part number
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Success confirmation
   */
  async resumePhaseProcess(partNumber, phaseId) {
    return this.request(`/api/operations/resume-phase`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });
  }

  /**
   * Reset phase process times - clears start_time, pause_time, and end_time
   * @param {string} partNumber - Item part number
   * @param {number|string} phaseId - Phase ID
   * @returns {Promise} Success confirmation
   */
  async resetPhaseProcess(partNumber, phaseId) {
    return this.request(`/api/operations/reset-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });
  }

  // ==================== REPORTING METHODS ====================

  /**
   * Get operations statistics
   * @returns {Promise} Statistics including items by status, overall stats, top performers, time statistics
   */
  async getStatistics() {
    return this.request("/api/operations/statistics");
  }

  /**
   * Get audit log with optional filtering
   * @param {Object} params - Query parameters (part_number, limit, offset)
   * @returns {Promise} Audit log entries with pagination
   */
  async getAuditLog(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/api/operations/audit-log?${queryParams}`);
  }

  /**
   * Get employee performance metrics
   * @param {number|string|null} employeeUid - Optional employee UID for specific employee
   * @returns {Promise} Performance data for employee(s)
   */
  async getEmployeePerformance(employeeUid = null) {
    const url = employeeUid
      ? `/api/operations/employee-performance?employee_uid=${employeeUid}`
      : "/api/operations/employee-performance";
    return this.request(url);
  }

  /**
   * Get progress report for items
   * @param {Object} params - Query parameters (part_number, format: 'json'|'summary'|'detailed')
   * @returns {Promise} Progress report data
   */
  async getProgressReport(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/api/operations/progress-report?${queryParams}`);
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Get item with full hierarchy (item -> phases -> subphases)
   * Alias for getItem() for clarity
   * @param {string} partNumber - Item part number
   * @returns {Promise} Complete item hierarchy
   */
  async getItemHierarchy(partNumber) {
    return this.getItem(partNumber);
  }

  /**
   * Get all items by status
   * @param {string} status - Status filter ('not_started'|'in_progress'|'completed')
   * @returns {Promise} Filtered items
   */
  async getItemsByStatus(status) {
    return this.getItems({ status });
  }

  /**
   * Get all items by priority
   * @param {string} priority - Priority filter ('High'|'Medium'|'Low')
   * @returns {Promise} Filtered items
   */
  async getItemsByPriority(priority) {
    if (!["High", "Medium", "Low"].includes(priority)) {
      throw new Error("priority must be High, Medium, or Low");
    }
    return this.getItems({ priority });
  }

  /**
   * Get all items by client name
   * @param {string} clientName - Client name to filter
   * @returns {Promise} Filtered items
   */
  async getItemsByClient(clientName) {
    return this.getItems({ client_name: clientName });
  }

  /**
   * Get high priority items
   * @returns {Promise} High priority items
   */
  async getHighPriorityItems() {
    return this.getItemsByPriority("High");
  }

  /**
   * Search items by part number, name, description, client name, or remarks
   * @param {string} searchTerm - Search query
   * @returns {Promise} Matching items
   */
  async searchItems(searchTerm) {
    return this.getItems({ search: searchTerm });
  }

  /**
   * Get detailed progress report for specific item
   * @param {string} partNumber - Item part number
   * @returns {Promise} Detailed report with all phases and subphases
   */
  async getDetailedItemReport(partNumber) {
    return this.getProgressReport({
      part_number: partNumber,
      format: "detailed",
    });
  }

  /**
   * Get summary progress report for all items
   * @returns {Promise} Summary report
   */
  async getSummaryReport() {
    return this.getProgressReport({ format: "summary" });
  }

  /** 
   * Get top performing employees
   * @returns {Promise} Top performers from statistics
   */
  async getTopPerformers() {
    const stats = await this.getStatistics();
    return stats.top_performers || [];
  }

  /**
   * Get time statistics
   * @returns {Promise} Time-related metrics
   */
  async getTimeStatistics() {
    const stats = await this.getStatistics();
    return stats.time_statistics || {};
  }

  /**
   * Toggle subphase completion status
   * @param {number|string} subphaseId - Subphase ID
   * @param {boolean} currentStatus - Current completion status
   * @returns {Promise} Success confirmation
   */
  async toggleSubphaseCompletion(subphaseId, currentStatus) {
    return this.completeSubphaseWithDuration(subphaseId, !currentStatus);
  }

  /**
   * Get recent audit log entries
   * @param {number} limit - Number of entries to retrieve (default: 50)
   * @returns {Promise} Recent audit entries
   */
  async getRecentAuditLog(limit = 50) {
    return this.getAuditLog({ limit, offset: 0 });
  }

  /**
   * Get audit log for specific item
   * @param {string} partNumber - Item part number
   * @param {number} limit - Number of entries (default: 100)
   * @returns {Promise} Item-specific audit entries
   */
  async getItemAuditLog(partNumber, limit = 100) {
    return this.getAuditLog({ part_number: partNumber, limit });
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Create item with phases and subphases in one call
   * @param {Object} itemData - Complete item structure
   * @param {string} itemData.part_number - Item part number
   * @param {string} itemData.name - Item name
   * @param {string} [itemData.description] - Item description
   * @param {string} [itemData.client_name] - Client name
   * @param {string} [itemData.priority='Medium'] - Priority (High, Medium, Low)
   * @param {string} [itemData.remarks] - Additional remarks
   * @param {number} [itemData.qty=1] - Batch quantity
   * @param {Array} [itemData.phases] - Array of phases with subphases
   * @returns {Promise} Created item with all phases and subphases
   */
  async createItemWithStructure(itemData) {
    // Calculate total_qty from subphases
    let totalQty = 0;
    if (itemData.phases && itemData.phases.length > 0) {
      itemData.phases.forEach((phase) => {
        if (phase.subphases && phase.subphases.length > 0) {
          phase.subphases.forEach((subphase) => {
            totalQty += parseInt(subphase.expected_quantity) || 0;
          });
        }
      });
    }

    // Create item first
    const item = await this.createItem({
      part_number: itemData.part_number,
      name: itemData.name,
      description: itemData.description,
      client_name: itemData.client_name,
      priority: itemData.priority || "Medium",
      remarks: itemData.remarks,
      qty: itemData.qty || 1,
      total_qty: totalQty || itemData.qty || 1,
    });

    // Create phases if provided
    if (itemData.phases && itemData.phases.length > 0) {
      for (const phaseData of itemData.phases) {
        const phase = await this.createPhase({
          part_number: itemData.part_number,
          name: phaseData.name,
        });

        // Create subphases if provided
        if (phaseData.subphases && phaseData.subphases.length > 0) {
          for (const subphaseData of phaseData.subphases) {
            await this.createSubphase({
              part_number: itemData.part_number,
              phase_id: phase.id,
              name: subphaseData.name,
              condition: subphaseData.condition,
              expected_duration: subphaseData.expected_duration || 0,
              expected_quantity: subphaseData.expected_quantity || 0,
            });
          }
        }
      }
    }

    // Return complete item with hierarchy
    return this.getItemHierarchy(itemData.part_number);
  }

  /**
   * Get all incomplete items
   * @returns {Promise} Items that are not completed
   */
  async getIncompleteItems() {
    const allItems = await this.getItems();
    return allItems.filter((item) => item.status !== "completed");
  }

  /**
   * Get all items assigned to specific employee
   * @param {number|string} employeeUid - Employee UID
   * @returns {Promise} Items with employee assignments
   */
  async getEmployeeItems(employeeUid) {
    const performance = await this.getEmployeePerformance(employeeUid);
    return performance.recent_tasks || [];
  }

  /**
   * Validate part number format (optional helper)
   * @param {string} partNumber - Part number to validate
   * @returns {boolean} True if valid
   */
  validatePartNumber(partNumber) {
    if (!partNumber || typeof partNumber !== "string") {
      return false;
    }
    // Basic validation - adjust rules as needed
    if (partNumber.length > 100) {
      return false;
    }
    // Part number should not be empty after trim
    if (partNumber.trim().length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Validate priority value
   * @param {string} priority - Priority to validate
   * @returns {boolean} True if valid
   */
  validatePriority(priority) {
    return ["High", "Medium", "Low"].includes(priority);
  }

  /**
   * Check if item exists by part number
   * @param {string} partNumber - Part number to check
   * @returns {Promise<boolean>} True if item exists
   */
  async itemExists(partNumber) {
    try {
      await this.getItem(partNumber);
      return true;
    } catch (error) {
      if (error.message && error.message.includes("404")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get items with completion percentage
   * @param {number} minPercentage - Minimum completion percentage (0-100)
   * @param {number} maxPercentage - Maximum completion percentage (0-100)
   * @returns {Promise} Filtered items
   */
  async getItemsByCompletionRange(minPercentage = 0, maxPercentage = 100) {
    const allItems = await this.getItems();
    return allItems.filter((item) => {
      const progress = item.overall_progress || 0;
      return progress >= minPercentage && progress <= maxPercentage;
    });
  }

  /**
   * Get items nearing completion (80-99%)
   * @returns {Promise} Items near completion
   */
  async getItemsNearingCompletion() {
    return this.getItemsByCompletionRange(80, 99);
  }

  /**
   * Get recently created items
   * @param {number} days - Number of days to look back (default: 7)
   * @returns {Promise} Recent items
   */
  async getRecentItems(days = 7) {
    const allItems = await this.getItems();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allItems.filter((item) => {
      const createdDate = new Date(item.created_at);
      return createdDate >= cutoffDate;
    });
  }

  /**
   * Get items by multiple filters
   * @param {Object} filters - Filter options
   * @param {string} [filters.status] - Status filter
   * @param {string} [filters.priority] - Priority filter
   * @param {string} [filters.client_name] - Client name filter
   * @param {string} [filters.search] - Search term
   * @returns {Promise} Filtered items
   */
  async getItemsByFilters(filters) {
    return this.getItems(filters);
  }

  /**
   * Update item priority
   * @param {string} partNumber - Item part number
   * @param {string} priority - New priority (High, Medium, Low)
   * @returns {Promise} Success confirmation
   */
  async updateItemPriority(partNumber, priority) {
    if (!this.validatePriority(priority)) {
      throw new Error("priority must be High, Medium, or Low");
    }
    return this.updateItem(partNumber, { priority });
  }

  /**
   * Update item client
   * @param {string} partNumber - Item part number
   * @param {string} clientName - New client name
   * @returns {Promise} Success confirmation
   */
  async updateItemClient(partNumber, clientName) {
    return this.updateItem(partNumber, { client_name: clientName });
  }

  /**
   * Add or update item remarks
   * @param {string} partNumber - Item part number
   * @param {string} remarks - New remarks
   * @returns {Promise} Success confirmation
   */
  async updateItemRemarks(partNumber, remarks) {
    return this.updateItem(partNumber, { remarks });
  }

  /**
   * Get items grouped by client
   * @returns {Promise} Object with client names as keys and items as values
   */
  async getItemsGroupedByClient() {
    const allItems = await this.getItems();
    const grouped = {};

    allItems.forEach((item) => {
      const client = item.client_name || "No Client";
      if (!grouped[client]) {
        grouped[client] = [];
      }
      grouped[client].push(item);
    });

    return grouped;
  }

  /**
   * Get items grouped by priority
   * @returns {Promise} Object with priority levels as keys and items as values
   */
  async getItemsGroupedByPriority() {
    const allItems = await this.getItems();
    const grouped = {
      High: [],
      Medium: [],
      Low: [],
    };

    allItems.forEach((item) => {
      const priority = item.priority || "Medium";
      if (grouped[priority]) {
        grouped[priority].push(item);
      }
    });

    return grouped;
  }

  /**
   * Get urgent items (High priority and in progress or not started)
   * @returns {Promise} Urgent items
   */
  async getUrgentItems() {
    const highPriorityItems = await this.getItemsByPriority("High");
    return highPriorityItems.filter(
      (item) => item.status === "in_progress" || item.status === "not_started"
    );
  }

  /**
   * Get client summary (count of items per client)
   * @returns {Promise} Array of objects with client_name and item_count
   */
  async getClientSummary() {
    const allItems = await this.getItems();
    const summary = {};

    allItems.forEach((item) => {
      const client = item.client_name || "No Client";
      summary[client] = (summary[client] || 0) + 1;
    });

    return Object.entries(summary).map(([client_name, item_count]) => ({
      client_name,
      item_count,
    }));
  }

  /**
   * Get priority distribution
   * @returns {Promise} Object with count for each priority level
   */
  async getPriorityDistribution() {
    const allItems = await this.getItems();
    const distribution = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    allItems.forEach((item) => {
      const priority = item.priority || "Medium";
      if (distribution[priority] !== undefined) {
        distribution[priority]++;
      }
    });

    return distribution;
  }

  /**
   * Search items by remarks
   * @param {string} searchTerm - Search term for remarks
   * @returns {Promise} Items with matching remarks
   */
  async searchItemsByRemarks(searchTerm) {
    const allItems = await this.getItems({ search: searchTerm });
    return allItems.filter(
      (item) =>
        item.remarks &&
        item.remarks.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Get items without client assigned
   * @returns {Promise} Items with no client_name
   */
  async getItemsWithoutClient() {
    const allItems = await this.getItems();
    return allItems.filter(
      (item) => !item.client_name || item.client_name.trim() === ""
    );
  }

  /**
   * Get items without remarks
   * @returns {Promise} Items with no remarks
   */
  async getItemsWithoutRemarks() {
    const allItems = await this.getItems();
    return allItems.filter(
      (item) => !item.remarks || item.remarks.trim() === ""
    );
  }

  /**
   * Get overdue items (based on expected vs actual hours for completed subphases)
   * @returns {Promise} Items that are taking longer than expected
   */
  async getOverdueItems() {
    const allItems = await this.getItems();
    const overdueItems = [];

    for (const item of allItems) {
      if (item.status !== "completed") {
        const detailedItem = await this.getItem(item.part_number);
        let totalExpected = 0;
        let totalActual = 0;

        if (detailedItem.phases) {
          detailedItem.phases.forEach((phase) => {
            if (phase.subphases) {
              phase.subphases.forEach((subphase) => {
                totalExpected += parseFloat(subphase.expected_duration || 0);
                totalActual += parseFloat(subphase.actual_hours || 0);
              });
            }
          });
        }

        if (totalActual > totalExpected && totalExpected > 0) {
          overdueItems.push({
            ...item,
            total_expected: totalExpected,
            total_actual: totalActual,
            overdue_hours: totalActual - totalExpected,
          });
        }
      }
    }

    return overdueItems;
  }

  /**
   * Export items to CSV-ready format
   * @param {Object} filters - Optional filters to apply
   * @returns {Promise} Array of items with flattened structure for CSV export
   */
  async exportItemsToCSV(filters = {}) {
    const items = await this.getItems(filters);
    return items.map((item) => ({
      part_number: item.part_number,
      name: item.name,
      description: item.description || "",
      client_name: item.client_name || "",
      priority: item.priority || "Medium",
      remarks: item.remarks || "",
      status: item.status,
      overall_progress: item.overall_progress || 0,
      phase_count: item.phase_count || 0,
      subphase_count: item.subphase_count || 0,
      completed_subphase_count: item.completed_subphase_count || 0,
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      created_at: item.created_at,
      completed_at: item.completed_at || "",
    }));
  }

  /**
   * Get client performance metrics
   * @param {string} clientName - Client name
   * @returns {Promise} Performance metrics for the client
   */
  async getClientPerformance(clientName) {
    const clientItems = await this.getItemsByClient(clientName);

    const totalItems = clientItems.length;
    const completedItems = clientItems.filter(
      (item) => item.status === "completed"
    ).length;
    const inProgressItems = clientItems.filter(
      (item) => item.status === "in_progress"
    ).length;
    const notStartedItems = clientItems.filter(
      (item) => item.status === "not_started"
    ).length;

    const avgProgress =
      clientItems.reduce(
        (sum, item) => sum + (parseFloat(item.overall_progress) || 0),
        0
      ) / (totalItems || 1);

    const priorityDistribution = {
      High: clientItems.filter((item) => item.priority === "High").length,
      Medium: clientItems.filter((item) => item.priority === "Medium").length,
      Low: clientItems.filter((item) => item.priority === "Low").length,
    };

    return {
      client_name: clientName,
      total_items: totalItems,
      completed_items: completedItems,
      in_progress_items: inProgressItems,
      not_started_items: notStartedItems,
      avg_progress: avgProgress.toFixed(2),
      completion_rate: ((completedItems / (totalItems || 1)) * 100).toFixed(2),
      priority_distribution: priorityDistribution,
      items: clientItems,
    };
  }

  /**
   * Update subphase current completed quantity
   * @param {number|string} subphaseId - Subphase ID
   * @param {number} currentCompletedQuantity - New completed quantity
   * @returns {Promise} Success confirmation
   */
  async updateSubphaseCompletedQuantity(subphaseId, currentCompletedQuantity) {
    return this.request(
      `/api/operations/update-completed-quantity?id=${subphaseId}`,
      {
        method: "POST",
        body: JSON.stringify({
          current_completed_quantity: currentCompletedQuantity,
        }),
      }
    );
  }

  async completeSubphaseWithDuration(subphaseId, completed = true, timeDuration = null) {
    const result = await this.request("/api/operations/complete-subphase", {
      method: "POST",
      body: JSON.stringify({
        subphase_id: subphaseId,
        completed,
        time_duration: timeDuration,
      }),
    });

    this.invalidateAllItemsCache();
    return result;
  }

  async assignEmployee(subphaseId, employeeBarcode) {
    const result = await this.request("/api/operations/assign-employee", {
      method: "POST",
      body: JSON.stringify({
        subphase_id: subphaseId,
        employee_barcode: employeeBarcode,
      }),
    });

    this.invalidateAllItemsCache();
    return result;
  }

  async startPhaseProcess(partNumber, phaseId) {
    const result = await this.request(`/api/operations/start-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });

    this.invalidateItemCache(partNumber);
    return result;
  }

  async stopPhaseProcess(partNumber, phaseId) {
    const result = await this.request(`/api/operations/stop-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });

    this.invalidateItemCache(partNumber);
    return result;
  }

  async pausePhaseProcess(partNumber, phaseId) {
    const result = await this.request(`/api/operations/pause-phase`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });

    this.invalidateItemCache(partNumber);
    return result;
  }

  async resumePhaseProcess(partNumber, phaseId) {
    const result = await this.request(`/api/operations/resume-phase`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });

    this.invalidateItemCache(partNumber);
    return result;
  }

  async resetPhaseProcess(partNumber, phaseId) {
    const result = await this.request(`/api/operations/reset-item`, {
      method: "POST",
      body: JSON.stringify({
        part_number: partNumber,
        phase_id: phaseId,
      }),
    });

    this.invalidateItemCache(partNumber);
    return result;
  }

  async updateSubphaseCompletedQuantity(subphaseId, currentCompletedQuantity) {
    const result = await this.request(
      `/api/operations/update-completed-quantity?id=${subphaseId}`,
      {
        method: "POST",
        body: JSON.stringify({
          current_completed_quantity: currentCompletedQuantity,
        }),
      }
    );

    this.invalidateAllItemsCache();
    return result;
  }

  // ==================== CACHE MANAGEMENT METHODS ====================

/**
 * Invalidate cache for specific item
 * @param {string} partNumber - Part number to invalidate
 */
async invalidateItemCache(partNumber) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'REFRESH_ITEM',
      partNumber
    })
    console.log('🔄 Cache invalidation requested for:', partNumber)
  }
}
/**
 * Invalidate entire items cache
 */
async invalidateAllItemsCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel()

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        console.log('🔄 Cache invalidation response:', event.data)
        resolve(event.data.success)
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'REFRESH_ALL_ITEMS' },
        [messageChannel.port2]
      )

      // Don't wait forever
      setTimeout(() => {
        console.warn('⚠️ Cache invalidation timeout, continuing anyway')
        resolve(false)
      }, 5000)
    })
  }
}

  /**
 * ✅ FIXED: Force update items from server
 */
async forceUpdateItemsCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel()

    return new Promise((resolve, reject) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log('✅ Cache force update successful:', event.data.count || 0, 'items')
          resolve(event.data)
        } else {
          console.error('❌ Cache force update failed:', event.data.error)
          reject(new Error(event.data.error || 'Cache update failed'))
        }
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'FORCE_UPDATE_ITEMS' },
        [messageChannel.port2]
      )

      // Timeout after 30 seconds
      setTimeout(() => {
        console.warn('⚠️ Cache force update timeout')
        reject(new Error('Cache update timeout'))
      }, 30000)
    })
  } else {
    console.warn('⚠️ Service worker not available')
    throw new Error('Service worker not available')
  }
}

  /**
 * Import item from Google Sheets
 * @param {Object} data - Import data from Google Sheets
 * @param {string} data.part_number - Part number
 * @param {string} data.client_name - Client name
 * @param {number} data.qty - Quantity
 * @param {number} [data.sheet_row] - Row number from sheet
 * @returns {Promise} Created item
 */
async importFromGoogleSheets(data) {
  return this.request("/api/operations/google-sheets-import", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      source: "google_sheets",
      timestamp: new Date().toISOString()
    }),
  });
}

/**
 * Get items imported from Google Sheets
 * @returns {Promise} Items with source='google_sheets'
 */
async getGoogleSheetsItems() {
  const allItems = await this.getItems();
  return allItems.filter(item => 
    item.part_number && item.part_number.includes('GS-')
  );
}

/**
 * Get clients list (unique client names from all items)
 * @returns {Promise<string[]>} Array of unique client names
 */
async getClients() {
  try {
    const allItems = await this.getItems();
    const clientSet = new Set();
    
    allItems.forEach(item => {
      if (item.client_name && item.client_name.trim()) {
        clientSet.add(item.client_name.trim());
      }
    });
    
    return Array.from(clientSet).sort();
  } catch (error) {
    console.error('Error loading clients:', error);
    return [];
  }
}

/**
 * Validate Google Sheets import data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with isValid and errors
 */
validateGoogleSheetsImport(data) {
  const errors = [];
  
  if (!data.part_number || !data.part_number.trim()) {
    errors.push('Part number is required');
  }
  
  if (!data.client_name || !data.client_name.trim()) {
    errors.push('Client name is required');
  }
  
  if (!data.qty) {
    errors.push('Quantity is required');
  } else {
    const qty = parseInt(data.qty);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Quantity must be a positive number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Test connection to backend (for Google Sheets)
 * @returns {Promise} Health check response
 */
async testConnection() {
  return this.request("/api/operations/health");
}

/**
 * Import item from Google Sheets and refresh cache
 * @param {Object} data - Import data
 * @returns {Promise} Created item
 */
async importFromGoogleSheets(data) {
  const result = await this.request("/api/operations/google-sheets-import", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      source: "google_sheets",
      timestamp: new Date().toISOString()
    }),
  });
  
  // ✅ After successful import, refresh the cache
  if (result.success) {
    console.log('✅ Item imported successfully, refreshing cache...');
    
    // Clear IndexedDB cache to force fresh fetch
    await this.forceUpdateItemsCache();
    
    // Also invalidate the specific item cache
    if (result.data?.part_number) {
      await this.invalidateItemCache(result.data.part_number);
    }
  }
  
  return result;
}

/**
 * Batch import with cache refresh
 */
async batchImportFromGoogleSheets(items) {
  const results = [];
  
  for (const item of items) {
    try {
      const validation = this.validateGoogleSheetsImport(item);
      if (!validation.isValid) {
        results.push({
          success: false,
          part_number: item.part_number,
          errors: validation.errors
        });
        continue;
      }
      
      const result = await this.importFromGoogleSheets(item);
      results.push({
        success: true,
        part_number: item.part_number,
        data: result
      });
      
      // Small delay between imports
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        success: false,
        part_number: item.part_number,
        error: error.message
      });
    }
  }
  
  // ✅ After batch import, do a final cache refresh
  console.log('✅ Batch import complete, doing final cache refresh...');
  await this.forceUpdateItemsCache();
  
  return results;
}

/**
 * ✅ NEW: Check for updates without blocking UI
 * Use this for polling - it won't throw errors
 */
async checkForUpdates() {
  try {
    console.log('🔍 Checking for updates...')
    
    // Fetch directly, bypassing cache
    const response = await this.request('/api/operations/items', {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'X-Skip-Cache': 'true'
      }
    })
    
    // Trigger cache refresh in background
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REFRESH_ALL_ITEMS'
      })
    }
    
    return response
  } catch (error) {
    console.error('❌ Failed to check for updates:', error)
    throw error
  }
}

/**
 * Get items imported from Google Sheets
 * @returns {Promise} Items with source='google_sheets'
 */
async getGoogleSheetsItems() {
  const allItems = await this.getItems();
  return allItems.filter(item => 
    item.part_number && item.part_number.includes('GS-')
  );
}

/**
 * Validate Google Sheets import data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with isValid and errors
 */
validateGoogleSheetsImport(data) {
  const errors = [];
  
  if (!data.part_number || !data.part_number.trim()) {
    errors.push('Part number is required');
  }
  
  // Item name is optional, but if provided, validate it's not too long
  if (data.item_name && data.item_name.length > 200) {
    errors.push('Item name must be 200 characters or less');
  }
  
  if (!data.client_name || !data.client_name.trim()) {
    errors.push('Client name is required');
  }
  
  if (!data.qty) {
    errors.push('Quantity is required');
  } else {
    const qty = parseInt(data.qty);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Quantity must be a positive number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Import multiple items from Google Sheets in batch
 * @param {Array<Object>} items - Array of import data objects
 * @returns {Promise} Array of results with success/error for each item
 */
async batchImportFromGoogleSheets(items) {
  const results = [];
  
  for (const item of items) {
    try {
      const validation = this.validateGoogleSheetsImport(item);
      if (!validation.isValid) {
        results.push({
          success: false,
          part_number: item.part_number,
          errors: validation.errors
        });
        continue;
      }
      
      const result = await this.importFromGoogleSheets(item);
      results.push({
        success: true,
        part_number: item.part_number,
        data: result
      });
      
      // Small delay between imports to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        success: false,
        part_number: item.part_number,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get summary of Google Sheets imports
 * @returns {Promise} Summary with counts and statistics
 */
async getGoogleSheetsImportSummary() {
  const sheetsItems = await this.getGoogleSheetsItems();
  
  const summary = {
    total_imports: sheetsItems.length,
    by_status: {
      not_started: 0,
      in_progress: 0,
      completed: 0
    },
    by_client: {},
    recent_imports: [],
    name_sources: {
      provided: 0,
      template: 0,
      generated: 0
    }
  };
  
  sheetsItems.forEach(item => {
    // Count by status
    if (summary.by_status[item.status] !== undefined) {
      summary.by_status[item.status]++;
    }
    
    // Count by client
    const client = item.client_name || 'No Client';
    summary.by_client[client] = (summary.by_client[client] || 0) + 1;
    
    // Check remarks for name source
    if (item.remarks) {
      if (item.remarks.includes('Custom name provided')) {
        summary.name_sources.provided++;
      } else if (item.remarks.includes('Template:')) {
        summary.name_sources.template++;
      } else {
        summary.name_sources.generated++;
      }
    }
  });
  
  // Get 10 most recent imports
  summary.recent_imports = sheetsItems
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map(item => ({
      part_number: item.part_number,
      name: item.name,
      client_name: item.client_name,
      status: item.status,
      created_at: item.created_at
    }));
  
  return summary;
}
}
