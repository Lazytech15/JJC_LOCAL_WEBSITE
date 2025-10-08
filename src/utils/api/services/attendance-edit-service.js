// ============================================================================
// services/attendance-edit-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class AttendanceEditService extends BaseAPIService {
  /**
   * Get records that have been edited or deleted since a specific timestamp
   * GET /api/attendance-edits
   * @param {Object} params - Query parameters
   * @param {string} params.since - ISO timestamp to fetch edits since (optional)
   * @param {number} params.limit - Maximum number of records to return (default: 100)
   * @returns {Promise<Object>} Object containing edited and deleted records
   */
  async getEditedRecords(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendanceEdit?${queryParams}`)
  }

  /**
   * Add a new attendance record
   * POST /api/attendance-edits
   * @param {Object} recordData - Attendance record data
   * @param {string} recordData.employee_uid - Employee UID (required)
   * @param {string} recordData.clock_type - Clock type (morning_in, morning_out, etc.) (required)
   * @param {string} recordData.clock_time - Clock time in MySQL format (required)
   * @param {string} recordData.date - Attendance date (required)
   * @param {number} recordData.regular_hours - Regular hours (optional)
   * @param {number} recordData.overtime_hours - Overtime hours (optional)
   * @param {boolean} recordData.is_late - Late flag (optional)
   * @param {string} recordData.notes - Notes (optional)
   * @param {string} recordData.location - Location (optional)
   * @returns {Promise<Object>} Created attendance record
   */
  async addAttendanceRecord(recordData) {
    return this.request("/api/attendanceEdit", {
      method: "POST",
      body: JSON.stringify(recordData),
    })
  }

  /**
   * Edit an attendance record and mark it as unsynced
   * PUT /api/attendance-edits/:id
   * @param {number} id - Attendance record ID
   * @param {Object} updateData - Fields to update
   * @param {string} updateData.employee_uid - Employee UID (optional)
   * @param {string} updateData.id_number - Employee ID number (optional)
   * @param {string} updateData.clock_type - Clock type (morning_in, morning_out, etc.) (optional)
   * @param {string} updateData.clock_time - Clock time (optional)
   * @param {number} updateData.regular_hours - Regular hours (optional)
   * @param {number} updateData.overtime_hours - Overtime hours (optional)
   * @param {string} updateData.date - Attendance date (optional)
   * @param {boolean} updateData.is_late - Late flag (optional)
   * @param {string} updateData.notes - Notes (optional)
   * @param {string} updateData.location - Location (optional)
   * @returns {Promise<Object>} Updated attendance record
   */
  async editAttendanceRecord(id, updateData) {
    return this.request(`/api/attendanceEdit/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    })
  }

  /**
   * Delete an attendance record and log the deletion
   * DELETE /api/attendance-edits/:id
   * @param {number} id - Attendance record ID to delete
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteAttendanceRecord(id) {
    return this.request(`/api/attendanceEdit/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Batch edit multiple attendance records
   * POST /api/attendance-edits/batch
   * @param {Array<Object>} records - Array of records to edit
   * @param {number} records[].id - Record ID (required)
   * @param {string} records[].clock_type - Clock type (optional)
   * @param {string} records[].clock_time - Clock time (optional)
   * @param {number} records[].regular_hours - Regular hours (optional)
   * @param {number} records[].overtime_hours - Overtime hours (optional)
   * @param {string} records[].date - Date (optional)
   * @param {boolean} records[].is_late - Late flag (optional)
   * @param {string} records[].notes - Notes (optional)
   * @returns {Promise<Object>} Batch operation results
   */
  async batchEditRecords(records) {
    return this.request("/api/attendanceEdit/batch", {
      method: "POST",
      body: JSON.stringify({ records }),
    })
  }

  /**
   * Get all unsynced attendance records
   * This is a convenience method that fetches all edited records without a timestamp filter
   * @param {number} limit - Maximum number of records (default: 100)
   * @returns {Promise<Object>} Unsynced records
   */
  async getUnsyncedRecords(limit = 100) {
    return this.getEditedRecords({ limit })
  }

  /**
   * Get recent edits since last sync
   * @param {string|Date} lastSyncTime - Last sync timestamp
   * @param {number} limit - Maximum number of records (default: 100)
   * @returns {Promise<Object>} Records edited/deleted since last sync
   */
  async getEditsSince(lastSyncTime, limit = 100) {
    const timestamp = lastSyncTime instanceof Date 
      ? lastSyncTime.toISOString() 
      : lastSyncTime
    
    return this.getEditedRecords({ since: timestamp, limit })
  }

  /**
   * Update clock time for an attendance record
   * Convenience method for updating just the clock time
   * @param {number} id - Attendance record ID
   * @param {string} clockTime - New clock time (ISO format or MySQL datetime)
   * @returns {Promise<Object>} Updated record
   */
  async updateClockTime(id, clockTime) {
    return this.editAttendanceRecord(id, { clock_time: clockTime })
  }

  /**
   * Mark attendance record as late
   * @param {number} id - Attendance record ID
   * @param {boolean} isLate - Late status
   * @param {string} notes - Optional notes explaining why
   * @returns {Promise<Object>} Updated record
   */
  async markAsLate(id, isLate = true, notes = null) {
    const updateData = { is_late: isLate }
    if (notes) {
      updateData.notes = notes
    }
    return this.editAttendanceRecord(id, updateData)
  }

  /**
   * Update attendance hours
   * @param {number} id - Attendance record ID
   * @param {Object} hours - Hours to update
   * @param {number} hours.regular_hours - Regular hours (optional)
   * @param {number} hours.overtime_hours - Overtime hours (optional)
   * @returns {Promise<Object>} Updated record
   */
  async updateHours(id, hours) {
    return this.editAttendanceRecord(id, hours)
  }
}