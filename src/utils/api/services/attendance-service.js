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
}