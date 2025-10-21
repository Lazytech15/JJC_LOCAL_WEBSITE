// ============================================================================
// services/employee-logs-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class EmployeeLogsService extends BaseAPIService {
  // GET /api/employee-logs - Retrieve all employee logs with optional filtering and pagination
  async getEmployeeLogs(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employee-logs?${queryParams}`)
  }

  // GET /api/employee-logs/:id - Get a specific employee log by ID
  async getEmployeeLog(id) {
    return this.request(`/api/employee-logs/${id}`)
  }

  // Helper methods for common operations

  // Search employee logs with pagination
  async searchEmployeeLogs(searchTerm = "", page = 1, limit = 100, filters = {}) {
    const params = {
      search: searchTerm,
      offset: (page - 1) * limit,
      limit,
      ...filters
    }
    return this.getEmployeeLogs(params)
  }

  // Get employee logs by username
  async getLogsByUsername(username, params = {}) {
    return this.getEmployeeLogs({
      username,
      ...params
    })
  }

  // Get employee logs by date range
  async getLogsByDateRange(dateFrom, dateTo, params = {}) {
    return this.getEmployeeLogs({
      date_from: dateFrom,
      date_to: dateTo,
      ...params
    })
  }

  // Get recent employee logs
  async getRecentLogs(limit = 50) {
    return this.getEmployeeLogs({
      limit,
      sort_by: "created_at",
      sort_order: "DESC"
    })
  }

  // Get logs with details (non-null details)
  async getLogsWithDetails(params = {}) {
    return this.getEmployeeLogs({
      has_details: true,
      ...params
    })
  }

  // Get today's logs
  async getTodaysLogs(params = {}) {
    const today = new Date().toISOString().split('T')[0]
    return this.getLogsByDateRange(today, today, params)
  }

  // Get this week's logs
  async getThisWeeksLogs(params = {}) {
    const today = new Date()
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6))
    
    return this.getLogsByDateRange(
      firstDay.toISOString().split('T')[0],
      lastDay.toISOString().split('T')[0],
      params
    )
  }

  // Get this month's logs
  async getThisMonthsLogs(params = {}) {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    return this.getLogsByDateRange(
      firstDay.toISOString().split('T')[0],
      lastDay.toISOString().split('T')[0],
      params
    )
  }

  // DELETE /api/employee-logs/:id - Delete a specific employee log
  async deleteEmployeeLog(id) {
    return this.request(`/api/employee-logs/${id}`, {
      method: "DELETE",
    })
  }

  // GET /api/employee-logs/audit/:id - Get audit records for a log
  async getAuditForLog(id) {
    return this.request(`/api/employee-logs/audit/${id}`)
  }

  // PUT /api/employee-logs/:id - Update a specific employee log
  async updateEmployeeLog(id, logData) {
    return this.request(`/api/employee-logs/${id}`, {
      method: "PUT",
      body: JSON.stringify(logData),
    })
  }

  // DELETE /api/employee-logs/bulk - Bulk delete logs
  async bulkDeleteLogs(deleteData) {
    return this.request("/api/employee-logs/bulk", {
      method: "DELETE",
      body: JSON.stringify(deleteData),
    })
  }

  // POST /api/employee-logs/bulk - Bulk operations (review, archive, etc.)
  async bulkUpdateLogs(updateData) {
    return this.request("/api/employee-logs/bulk", {
      method: "POST",
      body: JSON.stringify(updateData),
    })
  }
}