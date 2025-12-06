// ============================================================================
// services/operations-service.js - Updated for part_number schema with client_name, priority, remarks
// ============================================================================
import { BaseAPIService } from "../core/base-api.js";

export class OperationsService extends BaseAPIService {
  // ==================== ITEM METHODS ====================

/**
 * Get all items with optional filtering and pagination
 * @param {Object} params - Query parameters
 * @param {string} [params.status] - Status filter
 * @param {string} [params.search] - Search term
 * @param {string} [params.priority] - Priority filter
 * @param {string} [params.client_name] - Client name filter
 * @param {number} [params.page=1] - Page number (starts at 1)
 * @param {number} [params.limit=20] - Items per page (max 100)
 * @returns {Promise<{items: Array, pagination: Object}>} Response with items array and pagination info
 */
async getItems(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const response = await this.request(
    `/api/operations/items${queryParams ? `?${queryParams}` : ""}`
  );
  
  // Handle both paginated and non-paginated responses
  if (response && response.items && response.pagination) {
    // Paginated response
    return response;
  } else if (Array.isArray(response)) {
    // Legacy non-paginated response (single item query)
    return {
      items: response,
      pagination: {
        current_page: 1,
        per_page: response.length,
        total_items: response.length,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    };
  } else {
    // Unknown response format
    return {
      items: [],
      pagination: {
        current_page: 1,
        per_page: 0,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false
      }
    };
  }
}

/**
 * Get items with pagination
 * @param {number} page - Page number (starts at 1)
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters (status, search, priority, client_name)
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsPaginated(page = 1, limit = 20, filters = {}) {
  return this.getItems({
    page,
    limit,
    ...filters
  });
}

/**
 * Get next page of items
 * @param {Object} currentPagination - Current pagination object
 * @param {Object} filters - Current filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getNextPage(currentPagination, filters = {}) {
  if (!currentPagination.has_next) {
    throw new Error('No next page available');
  }
  return this.getItemsPaginated(
    currentPagination.current_page + 1,
    currentPagination.per_page,
    filters
  );
}

/**
 * Get previous page of items
 * @param {Object} currentPagination - Current pagination object
 * @param {Object} filters - Current filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getPreviousPage(currentPagination, filters = {}) {
  if (!currentPagination.has_previous) {
    throw new Error('No previous page available');
  }
  return this.getItemsPaginated(
    currentPagination.current_page - 1,
    currentPagination.per_page,
    filters
  );
}

/**
 * Get all items by fetching all pages
 * @param {Object} filters - Filters to apply
 * @param {number} maxPages - Maximum pages to fetch (safety limit)
 * @returns {Promise<Array>} All items across all pages
 */
async getAllItems(filters = {}, maxPages = 50) {
  let allItems = [];
  let currentPage = 1;
  let hasMore = true;
  
  while (hasMore && currentPage <= maxPages) {
    const response = await this.getItemsPaginated(currentPage, 100, filters);
    allItems = [...allItems, ...response.items];
    hasMore = response.pagination.has_next;
    currentPage++;
  }
  
  return allItems;
}

/**
 * Search items with pagination
 * @param {string} searchTerm - Search query
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async searchItemsPaginated(searchTerm, page = 1, limit = 20) {
  return this.getItemsPaginated(page, limit, { search: searchTerm });
}

/**
 * Get items by status with pagination
 * @param {string} status - Status filter
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsByStatusPaginated(status, page = 1, limit = 20) {
  return this.getItemsPaginated(page, limit, { status });
}

/**
 * Get items by client with pagination
 * @param {string} clientName - Client name
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsByClientPaginated(clientName, page = 1, limit = 20) {
  return this.getItemsPaginated(page, limit, { client_name: clientName });
}

/**
 * Get items by priority with pagination
 * @param {string} priority - Priority level
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsByPriorityPaginated(priority, page = 1, limit = 20) {
  if (!["High", "Medium", "Low"].includes(priority)) {
    throw new Error("priority must be High, Medium, or Low");
  }
  return this.getItemsPaginated(page, limit, { priority });
}

/**
 * Get items with pagination and sorting
 * @param {number} page - Page number (starts at 1)
 * @param {number} limit - Items per page
 * @param {Object} filters - Filters (status, search, priority, client_name)
 * @param {string} sortBy - Field to sort by (part_number, name, client_name, priority, status, created_at, overall_progress)
 * @param {string} sortOrder - Sort direction ('ASC' or 'DESC')
 * @returns {Promise<{items: Array, pagination: Object, sorting: Object}>}
 */
async getItemsPaginatedSorted(page = 1, limit = 20, filters = {}, sortBy = 'created_at', sortOrder = 'DESC') {
  return this.getItems({
    page,
    limit,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...filters
  });
}

/**
 * Get items sorted alphabetically (A-Z)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedAlphabetically(page = 1, limit = 20, filters = {}) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'name', 'ASC');
}

/**
 * Get items sorted by part number (A-Z)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedByPartNumber(page = 1, limit = 20, filters = {}) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'part_number', 'ASC');
}

/**
 * Get items sorted by client name (A-Z)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedByClient(page = 1, limit = 20, filters = {}) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'client_name', 'ASC');
}

/**
 * Get items sorted by priority (High > Medium > Low)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedByPriority(page = 1, limit = 20, filters = {}) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'priority', 'ASC');
}

/**
 * Get items sorted by progress (0-100%)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @param {boolean} ascending - If true, sort 0-100%; if false, sort 100-0%
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedByProgress(page = 1, limit = 20, filters = {}, ascending = true) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'overall_progress', ascending ? 'ASC' : 'DESC');
}

/**
 * Get items sorted by creation date
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @param {boolean} newestFirst - If true, newest first; if false, oldest first
 * @returns {Promise<{items: Array, pagination: Object}>}
 */
async getItemsSortedByDate(page = 1, limit = 20, filters = {}, newestFirst = true) {
  return this.getItemsPaginatedSorted(page, limit, filters, 'created_at', newestFirst ? 'DESC' : 'ASC');
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



    return result;
  }

  /**
   * Delete phase (cascades to subphases)
   */
  async deletePhase(id) {
    const result = await this.request(`/api/operations/phases?id=${id}`, {
      method: "DELETE",
    });



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

 

    return result;
  }

  /**
   * Delete subphase
   */
  async deleteSubphase(id) {
    const result = await this.request(`/api/operations/subphases?id=${id}`, {
      method: "DELETE",
    });



    return result;
  }

  // ==================== ACTION METHODS ====================

  /**
 * Mark subphase as completed with time duration
 * @param {number|string} subphaseId - Subphase ID
 * @param {boolean} completed - Completion status
 * @param {number} timeDuration - Duration in MINUTES (integer)
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
      time_duration: timeDuration, // Now in MINUTES
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

    return result;
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
    // Use the existing /api/operations/clients endpoint
    const response = await this.request('/api/operations/clients');
    
    // If the endpoint returns an array directly
    if (Array.isArray(response)) {
      return response.filter(Boolean); // Remove any null/undefined values
    }
    
    // Fallback: fetch all items if clients endpoint doesn't exist
    const itemsResponse = await this.getAllItems({}, 100); // Fetch up to 100 pages
    
    // Handle paginated response
    let allItems = [];
    if (Array.isArray(itemsResponse)) {
      allItems = itemsResponse;
    } else if (itemsResponse && Array.isArray(itemsResponse.items)) {
      allItems = itemsResponse.items;
    }
    
    const clientSet = new Set();
    
    allItems.forEach(item => {
      if (item && item.client_name && item.client_name.trim()) {
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
  
  
  return results;
}

  /**
 * Get fresh data with cache busting
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Fresh items
 */
async getFreshData(filters = {}) {
  try {
    console.log('🔄 Fetching fresh data...')
    
    const response = await this.getItems({
      ...filters,
      _t: Date.now() // Cache buster
    })
    
    // Handle both paginated and non-paginated responses
    if (response && response.items) {
      return response.items
    } else if (Array.isArray(response)) {
      return response
    }
    
    return []
  } catch (error) {
    console.error('❌ Failed to fetch fresh data:', error)
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

/**
 * Get duration variance statistics
 * @param {Object} filters - Optional filters (status, priority, client_name)
 * @returns {Promise} Statistics on expected vs actual durations
 */
async getDurationVarianceStats(filters = {}) {
  try {
    const items = await this.getItems(filters);
    
    const stats = {
      total_items_with_estimates: 0,
      completed_with_actual: 0,
      over_estimate: 0,
      under_estimate: 0,
      on_target: 0,
      avg_variance_hours: 0,
      total_expected_hours: 0,
      total_actual_hours: 0,
      items: []
    };
    
    let varianceSum = 0;
    
    items.forEach(item => {
      if (item.expected_completion_hours) {
        stats.total_items_with_estimates++;
        stats.total_expected_hours += parseFloat(item.expected_completion_hours);
        
        if (item.actual_completion_hours) {
          stats.completed_with_actual++;
          stats.total_actual_hours += parseFloat(item.actual_completion_hours);
          
          const variance = item.actual_completion_hours - item.expected_completion_hours;
          varianceSum += variance;
          
          if (variance > 0.5) {
            stats.over_estimate++;
          } else if (variance < -0.5) {
            stats.under_estimate++;
          } else {
            stats.on_target++;
          }
          
          stats.items.push({
            part_number: item.part_number,
            name: item.name,
            expected_hours: item.expected_completion_hours,
            actual_hours: item.actual_completion_hours,
            variance: variance,
            variance_percentage: ((variance / item.expected_completion_hours) * 100).toFixed(1)
          });
        }
      }
    });
    
    if (stats.completed_with_actual > 0) {
      stats.avg_variance_hours = (varianceSum / stats.completed_with_actual).toFixed(2);
      stats.avg_variance_percentage = ((stats.avg_variance_hours / (stats.total_expected_hours / stats.completed_with_actual)) * 100).toFixed(1);
    }
    
    // Sort items by variance (worst first)
    stats.items.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    
    return stats;
  } catch (error) {
    console.error('Error getting duration variance stats:', error);
    throw error;
  }
}

/**
 * Get items that exceeded expected duration
 * @param {number} varianceThreshold - Minimum hours over estimate (default: 1)
 * @returns {Promise} Items that took longer than expected
 */
async getOverEstimatedItems(varianceThreshold = 1) {
  try {
    const items = await this.getAllItems();
    
    return items.filter(item => 
      item.expected_completion_hours &&
      item.actual_completion_hours &&
      (item.actual_completion_hours - item.expected_completion_hours) >= varianceThreshold
    ).map(item => ({
      ...item,
      variance: item.actual_completion_hours - item.expected_completion_hours,
      variance_percentage: (((item.actual_completion_hours - item.expected_completion_hours) / item.expected_completion_hours) * 100).toFixed(1)
    })).sort((a, b) => b.variance - a.variance);
  } catch (error) {
    console.error('Error getting over-estimated items:', error);
    throw error;
  }
}

/**
 * Get items that completed faster than expected
 * @param {number} varianceThreshold - Minimum hours under estimate (default: 1)
 * @returns {Promise} Items that took less time than expected
 */
async getUnderEstimatedItems(varianceThreshold = 1) {
  try {
    const items = await this.getAllItems();
    
    return items.filter(item => 
      item.expected_completion_hours &&
      item.actual_completion_hours &&
      (item.expected_completion_hours - item.actual_completion_hours) >= varianceThreshold
    ).map(item => ({
      ...item,
      variance: item.expected_completion_hours - item.actual_completion_hours,
      variance_percentage: (((item.expected_completion_hours - item.actual_completion_hours) / item.expected_completion_hours) * 100).toFixed(1)
    })).sort((a, b) => b.variance - a.variance);
  } catch (error) {
    console.error('Error getting under-estimated items:', error);
    throw error;
  }
}

/**
 * Get average completion time by client
 * @returns {Promise} Client-wise duration statistics
 */
async getClientDurationStats() {
  try {
    const items = await this.getAllItems();
    const clientStats = {};
    
    items.forEach(item => {
      if (item.client_name && item.expected_completion_hours && item.actual_completion_hours) {
        if (!clientStats[item.client_name]) {
          clientStats[item.client_name] = {
            client_name: item.client_name,
            total_items: 0,
            total_expected: 0,
            total_actual: 0,
            avg_variance: 0,
            items: []
          };
        }
        
        clientStats[item.client_name].total_items++;
        clientStats[item.client_name].total_expected += parseFloat(item.expected_completion_hours);
        clientStats[item.client_name].total_actual += parseFloat(item.actual_completion_hours);
        clientStats[item.client_name].items.push({
          part_number: item.part_number,
          name: item.name,
          expected: item.expected_completion_hours,
          actual: item.actual_completion_hours
        });
      }
    });
    
    // Calculate averages and variances
    Object.keys(clientStats).forEach(client => {
      const stats = clientStats[client];
      stats.avg_expected = (stats.total_expected / stats.total_items).toFixed(2);
      stats.avg_actual = (stats.total_actual / stats.total_items).toFixed(2);
      stats.avg_variance = (stats.avg_actual - stats.avg_expected).toFixed(2);
      stats.avg_variance_percentage = ((stats.avg_variance / stats.avg_expected) * 100).toFixed(1);
    });
    
    return Object.values(clientStats).sort((a, b) => b.total_items - a.total_items);
  } catch (error) {
    console.error('Error getting client duration stats:', error);
    throw error;
  }
}

/**
 * Export duration variance report
 * @param {Object} filters - Optional filters
 * @returns {Promise} CSV-ready data with variance analysis
 */
async exportDurationVarianceReport(filters = {}) {
  try {
    const stats = await this.getDurationVarianceStats(filters);
    
    return stats.items.map(item => ({
      part_number: item.part_number,
      name: item.name,
      expected_hours: item.expected_hours,
      actual_hours: item.actual_hours,
      variance_hours: item.variance,
      variance_percentage: item.variance_percentage + '%',
      status: item.variance > 0 ? 'Over Estimate' : item.variance < 0 ? 'Under Estimate' : 'On Target'
    }));
  } catch (error) {
    console.error('Error exporting duration variance report:', error);
    throw error;
  }
}

// ==================== MATERIAL MANAGEMENT METHODS ====================

/**
 * Get all materials with optional filtering
 * @param {Object} params - Query parameters
 * @param {number} [params.subphase_id] - Filter by subphase
 * @param {number} [params.id] - Get specific material
 * @param {string} [params.status] - Filter by status (pending, checked_out, used, returned, cancelled)
 * @param {boolean} [params.checked_out] - Filter by checkout status
 * @returns {Promise} Materials data
 */
async getMaterials(params = {}) {
    const queryParams = new URLSearchParams()
    
    if (params.subphase_id) {
      queryParams.append('subphase_id', params.subphase_id)
    }
    if (params.id) {
      queryParams.append('id', params.id)
    }
    if (params.status) {
      queryParams.append('status', params.status)
    }
    if (params.checked_out !== undefined) {
      queryParams.append('checked_out', params.checked_out ? '1' : '0')
    }
    
    const url = `/api/operations/materials${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    return this.request(url)
  }
/**
 * Get materials for a specific subphase
 * @param {number|string} subphaseId - Subphase ID
 * @returns {Promise<Array>} Array of materials for the subphase
 */
// async getSubphaseMaterials(subphaseId) {
//   return this.getMaterials({ subphase_id: subphaseId });
// }

/**
 * Get single material by ID
 * @param {number|string} materialId - Material ID
 * @returns {Promise} Material data with subphase, phase, and item info
 */
async getMaterial(materialId) {
  return this.getMaterials({ id: materialId });
}

/**
 * Get materials by status
 * @param {string} status - Status filter (pending, checked_out, used, returned, cancelled)
 * @returns {Promise<Array>} Filtered materials
 */
async getMaterialsByStatus(status) {
  const validStatuses = ['pending', 'checked_out', 'used', 'returned', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
  }
  return this.getMaterials({ status });
}

/**
 * Get checked out materials
 * @returns {Promise<Array>} Materials currently checked out
 */
async getCheckedOutMaterials() {
  return this.getMaterials({ checked_out: true });
}

/**
 * Get pending materials (not yet checked out)
 * @returns {Promise<Array>} Pending materials
 */
async getPendingMaterials() {
  return this.getMaterialsByStatus('pending');
}

/**
 * Get returned materials
 * @returns {Promise<Array>} Returned/unused materials
 */
async getReturnedMaterials() {
  return this.getMaterialsByStatus('returned');
}

  async createMaterial(data) {
    return this.request('/api/operations/materials', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

/**
 * Create multiple materials for a subphase at once
 * @param {number|string} subphaseId - Subphase ID
 * @param {Array<Object>} materials - Array of material objects
 * @returns {Promise<Array>} Array of created materials
 */
async createMultipleMaterials(subphaseId, materials) {
  const results = [];
  
  for (const material of materials) {
    try {
      const result = await this.createMaterial({
        subphase_id: subphaseId,
        ...material
      });
      results.push({
        success: true,
        material_name: material.material_name,
        data: result
      });
    } catch (error) {
      results.push({
        success: false,
        material_name: material.material_name,
        error: error.message
      });
    }
  }
  
  return results;
}

  async updateMaterial(id, data) {
    return this.request(`/api/operations/materials?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

/**
 * Delete material requirement
 * @param {number|string} materialId - Material ID
 * @returns {Promise} Success confirmation
 */
async deleteMaterial(materialId) {
  const result = await this.request(`/api/operations/materials?id=${materialId}`, {
    method: 'DELETE'
  });

  return result;
}

/**
 * Checkout material to an employee
 * @param {number|string} materialId - Material ID
 * @param {string} employeeBarcode - Employee barcode or ID number
 * @returns {Promise} Success confirmation with employee data
 */
async checkoutMaterial(materialId, employeeBarcode) {
  return this.request('/api/operations/checkout-material', {
    method: 'POST',
    body: JSON.stringify({
      material_id: materialId,
      employee_barcode: employeeBarcode
    })
  });
}

/**
 * Return unused material
 * @param {number|string} materialId - Material ID
 * @param {number} quantityReturned - Quantity being returned
 * @param {string} [notes] - Notes about the return
 * @returns {Promise} Success confirmation
 */
async returnMaterial(materialId, quantityReturned, notes = null) {
  if (quantityReturned === undefined || quantityReturned === null) {
    throw new Error('quantityReturned is required');
  }

  return this.request('/api/operations/return-material', {
    method: 'POST',
    body: JSON.stringify({
      material_id: materialId,
      quantity_returned: quantityReturned,
      notes: notes
    })
  });
}

/**
 * Record material usage (used and/or returned)
 * @param {number|string} materialId - Material ID
 * @param {number} quantityUsed - Quantity actually used
 * @param {number} [quantityReturned=0] - Quantity returned/unused
 * @param {string} [notes] - Notes about usage
 * @returns {Promise} Success confirmation
 */
async recordMaterialUsage(materialId, quantityUsed, quantityReturned = 0, notes = null) {
  if (quantityUsed === undefined || quantityUsed === null) {
    throw new Error('quantityUsed is required');
  }

  return this.request('/api/operations/material-usage', {
    method: 'POST',
    body: JSON.stringify({
      material_id: materialId,
      quantity_used: quantityUsed,
      quantity_returned: quantityReturned,
      notes: notes
    })
  });
}

/**
 * Cancel material requirement (mark as cancelled)
 * @param {number|string} materialId - Material ID
 * @param {string} [reason] - Reason for cancellation
 * @returns {Promise} Success confirmation
 */
async cancelMaterial(materialId, reason = null) {
  return this.updateMaterial(materialId, {
    status: 'cancelled',
    notes: reason
  });
}

/**
 * Bulk checkout materials to an employee
 * @param {Array<number|string>} materialIds - Array of material IDs
 * @param {string} employeeBarcode - Employee barcode
 * @returns {Promise<Array>} Array of checkout results
 */
async bulkCheckoutMaterials(materialIds, employeeBarcode) {
  const results = [];
  
  for (const materialId of materialIds) {
    try {
      const result = await this.checkoutMaterial(materialId, employeeBarcode);
      results.push({
        success: true,
        material_id: materialId,
        data: result
      });
    } catch (error) {
      results.push({
        success: false,
        material_id: materialId,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get material summary for a subphase
 * @param {number|string} subphaseId - Subphase ID
 * @returns {Promise} Material summary statistics
 */
async getSubphaseMaterialSummary(subphaseId) {
  const materials = await this.getSubphaseMaterials(subphaseId);
  
  const summary = {
    total_materials: materials.length,
    by_status: {
      pending: 0,
      checked_out: 0,
      used: 0,
      returned: 0,
      cancelled: 0
    },
    total_quantity_required: 0,
    total_quantity_used: 0,
    total_quantity_returned: 0,
    materials: materials
  };
  
  materials.forEach(material => {
    if (summary.by_status[material.status] !== undefined) {
      summary.by_status[material.status]++;
    }
    
    summary.total_quantity_required += parseFloat(material.material_quantity || 0);
    summary.total_quantity_used += parseFloat(material.quantity_used || 0);
    summary.total_quantity_returned += parseFloat(material.quantity_returned || 0);
  });
  
  return summary;
}

/**
 * Get materials grouped by name (aggregated)
 * @param {Object} filters - Optional filters (status, etc.)
 * @returns {Promise<Array>} Materials grouped by name with quantities
 */
async getMaterialsGroupedByName(filters = {}) {
  const materials = await this.getMaterials(filters);
  const grouped = {};
  
  materials.forEach(material => {
    const name = material.material_name;
    if (!grouped[name]) {
      grouped[name] = {
        material_name: name,
        total_required: 0,
        total_used: 0,
        total_returned: 0,
        count: 0,
        units: new Set(),
        items: []
      };
    }
    
    grouped[name].total_required += parseFloat(material.material_quantity || 0);
    grouped[name].total_used += parseFloat(material.quantity_used || 0);
    grouped[name].total_returned += parseFloat(material.quantity_returned || 0);
    grouped[name].count++;
    grouped[name].units.add(material.unit_of_measure || 'pcs');
    grouped[name].items.push(material);
  });
  
  // Convert units Set to Array
  Object.keys(grouped).forEach(name => {
    grouped[name].units = Array.from(grouped[name].units);
  });
  
  return Object.values(grouped).sort((a, b) => b.total_required - a.total_required);
}

/**
 * Get material usage efficiency report
 * @returns {Promise} Efficiency statistics
 */
async getMaterialUsageEfficiency() {
  const materials = await this.getMaterials();
  const completedMaterials = materials.filter(m => 
    m.status === 'used' || m.status === 'returned'
  );
  
  const report = {
    total_materials: materials.length,
    completed_materials: completedMaterials.length,
    total_required: 0,
    total_used: 0,
    total_returned: 0,
    efficiency_rate: 0,
    waste_rate: 0,
    items: []
  };
  
  completedMaterials.forEach(material => {
    const required = parseFloat(material.material_quantity || 0);
    const used = parseFloat(material.quantity_used || 0);
    const returned = parseFloat(material.quantity_returned || 0);
    
    report.total_required += required;
    report.total_used += used;
    report.total_returned += returned;
    
    if (required > 0) {
      const efficiency = (used / required) * 100;
      const waste = ((required - used - returned) / required) * 100;
      
      report.items.push({
        material_name: material.material_name,
        subphase_name: material.subphase_name,
        item_name: material.item_name,
        required: required,
        used: used,
        returned: returned,
        efficiency: efficiency.toFixed(1) + '%',
        waste: waste.toFixed(1) + '%'
      });
    }
  });
  
  if (report.total_required > 0) {
    report.efficiency_rate = ((report.total_used / report.total_required) * 100).toFixed(1) + '%';
    report.waste_rate = (((report.total_required - report.total_used - report.total_returned) / report.total_required) * 100).toFixed(1) + '%';
  }
  
  return report;
}

/**
 * Get materials with high waste (returned > 20% of required)
 * @returns {Promise<Array>} Materials with high return rates
 */
async getHighWasteMaterials() {
  const materials = await this.getMaterials();
  
  return materials.filter(material => {
    const required = parseFloat(material.material_quantity || 0);
    const returned = parseFloat(material.quantity_returned || 0);
    
    if (required === 0) return false;
    
    const returnRate = (returned / required) * 100;
    return returnRate > 20;
  }).map(material => ({
    ...material,
    required: material.material_quantity,
    returned: material.quantity_returned,
    return_rate: ((material.quantity_returned / material.material_quantity) * 100).toFixed(1) + '%'
  })).sort((a, b) => 
    (b.quantity_returned / b.material_quantity) - (a.quantity_returned / a.material_quantity)
  );
}

/**
 * Get employee material checkout history
 * @param {string} employeeUid - Employee UID
 * @returns {Promise<Array>} Materials checked out by employee
 */
async getEmployeeMaterialCheckouts(employeeUid) {
  const materials = await this.getMaterials();
  
  return materials.filter(material => 
    material.checked_out_by_uid === employeeUid.toString()
  ).sort((a, b) => 
    new Date(b.checkout_date) - new Date(a.checkout_date)
  );
}

/**
 * Get overdue checkouts (checked out but not used/returned)
 * @param {number} daysThreshold - Days since checkout (default: 7)
 * @returns {Promise<Array>} Overdue material checkouts
 */
async getOverdueCheckouts(daysThreshold = 7) {
  const materials = await this.getMaterials({ status: 'checked_out' });
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  
  return materials.filter(material => {
    const checkoutDate = new Date(material.checkout_date);
    return checkoutDate < cutoffDate;
  }).map(material => ({
    ...material,
    days_checked_out: Math.floor(
      (new Date() - new Date(material.checkout_date)) / (1000 * 60 * 60 * 24)
    )
  })).sort((a, b) => b.days_checked_out - a.days_checked_out);
}

/**
 * Validate material data
 * @param {Object} materialData - Material data to validate
 * @returns {Object} Validation result with isValid and errors
 */
validateMaterialData(materialData) {
  const errors = [];
  
  if (!materialData.subphase_id) {
    errors.push('subphase_id is required');
  }
  
  if (!materialData.material_name || !materialData.material_name.trim()) {
    errors.push('material_name is required');
  }
  
  if (materialData.material_quantity === undefined || materialData.material_quantity === null) {
    errors.push('material_quantity is required');
  } else {
    const qty = parseFloat(materialData.material_quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('material_quantity must be a positive number');
    }
  }
  
  if (materialData.unit_of_measure && materialData.unit_of_measure.length > 50) {
    errors.push('unit_of_measure must be 50 characters or less');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Export materials to CSV-ready format
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Materials in CSV-friendly format
 */
async exportMaterialsToCSV(filters = {}) {
  const materials = await this.getMaterials(filters);
  
  return materials.map(material => ({
    material_id: material.id,
    material_name: material.material_name,
    subphase_name: material.subphase_name || '',
    phase_name: material.phase_name || '',
    item_name: material.item_name || '',
    client_name: material.client_name || '',
    quantity_required: material.material_quantity,
    quantity_used: material.quantity_used || 0,
    quantity_returned: material.quantity_returned || 0,
    unit: material.unit_of_measure || 'pcs',
    status: material.status,
    checked_out: material.is_checked_out ? 'Yes' : 'No',
    checked_out_by: material.checked_out_by_name || '',
    checkout_date: material.checkout_date || '',
    return_date: material.return_date || '',
    notes: material.notes || '',
    return_notes: material.return_notes || ''
  }));
}

/**
 * Get material inventory summary (total required vs available)
 * @returns {Promise<Array>} Summary by material name
 */
async getMaterialInventorySummary() {
  const grouped = await this.getMaterialsGroupedByName();
  
  return grouped.map(material => ({
    material_name: material.material_name,
    total_pending: material.items.filter(m => m.status === 'pending').length,
    total_checked_out: material.items.filter(m => m.status === 'checked_out').length,
    total_used: material.items.filter(m => m.status === 'used').length,
    total_returned: material.items.filter(m => m.status === 'returned').length,
    quantity_required: material.total_required,
    quantity_used: material.total_used,
    quantity_returned: material.total_returned,
    utilization_rate: material.total_required > 0 
      ? ((material.total_used / material.total_required) * 100).toFixed(1) + '%'
      : '0%',
    units: material.units
  }));
}

/**
 * Quick add material to subphase (with defaults)
 * @param {number|string} subphaseId - Subphase ID
 * @param {string} materialName - Material name
 * @param {number} quantity - Required quantity
 * @param {string} [unit='pcs'] - Unit of measure
 * @returns {Promise} Created material
 */
async quickAddMaterial(subphaseId, materialName, quantity, unit = 'pcs') {
  return this.createMaterial({
    subphase_id: subphaseId,
    material_name: materialName,
    material_quantity: quantity,
    unit_of_measure: unit
  });
}

/**
 * Complete material lifecycle (checkout, use, and return in sequence)
 * @param {number|string} materialId - Material ID
 * @param {string} employeeBarcode - Employee barcode
 * @param {number} quantityUsed - Quantity used
 * @param {number} [quantityReturned=0] - Quantity returned
 * @param {string} [notes] - Notes
 * @returns {Promise} Final status
 */
async completeMaterialLifecycle(materialId, employeeBarcode, quantityUsed, quantityReturned = 0, notes = null) {
  try {
    // Step 1: Checkout
    await this.checkoutMaterial(materialId, employeeBarcode);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Record usage
    const result = await this.recordMaterialUsage(materialId, quantityUsed, quantityReturned, notes);
    
    return {
      success: true,
      message: 'Material lifecycle completed',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

 async getSubphaseMaterials(subphaseId) {
    return this.request(`/api/operations/subphase-materials?subphase_id=${subphaseId}`)
  }
  
// Fix createMaterial method
async createMaterial(materialData) {
  try {
    console.log('➕ Creating material:', materialData);
    const data = await this.request('/api/operations/materials', {
      method: 'POST',
      body: JSON.stringify(materialData),
    });

    console.log('✅ Material created:', data);
    return data.success ? data.data : data;
  } catch (error) {
    console.error('❌ Failed to create material:', error);
    throw error;
  }
}

// Fix updateMaterial method
async updateMaterial(materialId, updates) {
  try {
    console.log(`🔄 Updating material ${materialId}:`, updates);
    const data = await this.request(`/api/operations/materials?id=${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    console.log('✅ Material updated');
    return data;
  } catch (error) {
    console.error('❌ Failed to update material:', error);
    throw error;
  }
}

async deleteMaterial(id) {
    return this.request(`/api/operations/materials?id=${id}`, {
      method: 'DELETE'
    })
  }

}
