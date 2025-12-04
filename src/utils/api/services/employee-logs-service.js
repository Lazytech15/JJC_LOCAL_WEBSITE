// ============================================================================
// services/employee-logs-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class EmployeeLogsService extends BaseAPIService {
  // POST /api/employee-logs - Create a new employee log entry
  async createEmployeeLog(logData) {
    // Client-side validation for required fields
    const requiredFields = ['username', 'purpose'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!logData[field] || String(logData[field]).trim() === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Trim string fields
    const cleanData = {
      ...logData,
      username: String(logData.username).trim(),
      purpose: String(logData.purpose).trim()
    };
    
    if (cleanData.details) {
      cleanData.details = String(cleanData.details).trim();
    }
    
    return this.request("/api/employee-logs", {
      method: "POST",
      body: JSON.stringify(cleanData),
    });
  }

  // Validation helper - check if log data is valid
  validateLogData(logData) {
    const errors = [];
    
    if (!logData.username || String(logData.username).trim() === '') {
      errors.push('Username is required');
    }
    
    if (!logData.purpose || String(logData.purpose).trim() === '') {
      errors.push('Purpose is required');
    }
    
    // Optional: Add length validations
    if (logData.username && String(logData.username).length > 255) {
      errors.push('Username must be 255 characters or less');
    }
    
    if (logData.purpose && String(logData.purpose).length > 500) {
      errors.push('Purpose must be 500 characters or less');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

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

  // POST /api/employee-logs/generate-report - Generate report with filters
  async generateReport(reportData) {
    return this.request("/api/employee-logs/generate-report", {
      method: "POST",
      body: JSON.stringify(reportData),
    })
  }

  // POST /api/employee-logs/email-report - Send report via email
  async emailReport(emailData) {
    return this.request("/api/employee-logs/email-report", {
      method: "POST",
      body: JSON.stringify(emailData),
    })
  }

  // POST /api/employee-logs/schedule-report - Schedule recurring report
  async scheduleReport(scheduleData) {
    return this.request("/api/employee-logs/schedule-report", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    })
  }

  // GET /api/employee-logs/statistics - Get enhanced statistics
  async getStatistics(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employee-logs/statistics?${queryParams}`)
  }

  // POST /api/employee-logs/bulk-operations - Enhanced bulk operations
  async bulkOperations(operationData) {
    return this.request("/api/employee-logs/bulk-operations", {
      method: "POST",
      body: JSON.stringify(operationData),
    })
  }
}