// ============================================================================
// services/attendance-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class AttendanceService extends BaseAPIService {
  async getAttendanceRecords(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance?${queryParams}`)
  }

  async getAttendanceStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/stats?${queryParams}`)
  }

  async createAttendanceRecord(attendanceData) {
    return this.request("/api/attendance/record", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    })
  }

  async updateAttendanceRecord(id, attendanceData) {
    return this.request(`/api/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(attendanceData),
    })
  }

  async deleteAttendanceRecord(id) {
    return this.request(`/api/attendance/${id}`, {
      method: "DELETE",
    })
  }

  async getEmployeeAttendance(employee_uid, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/employee/${employee_uid}?${queryParams}`)
  }

  async syncAttendanceRecords(attendance_data) {
    return this.request("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ attendance_data }),
    })
  }

  /**
   * Remove duplicate attendance entries
   * Duplicates are identified by: employee_uid, clock_time, date, and clock_type
   * Keeps the oldest record (smallest ID) and removes newer duplicates
   * @returns {Promise<Object>} Result with removed_count and removed_ids
   */
  async removeDuplicateEntries() {
    return this.request("/api/attendance/remove-duplicates", {
      method: "POST",
    })
  }

  /**
   * Get attendance records with automatic duplicate removal
   * This will automatically remove duplicates before fetching records
   * @param {Object} params - Query parameters (limit, offset, etc.)
   * @returns {Promise<Object>} Attendance records with duplicates_removed info
   */
  async getAttendanceRecordsWithCleanup(params = {}) {
    // Always include auto_remove_duplicates flag
    const cleanupParams = { ...params, auto_remove_duplicates: 'true' }
    const queryParams = new URLSearchParams(cleanupParams).toString()
    return this.request(`/api/attendance?${queryParams}`)
  }
}