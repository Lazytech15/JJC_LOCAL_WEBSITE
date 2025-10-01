// ============================================================================
// services/employee-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class EmployeeService extends BaseAPIService {
  /**
   * Get all employees with filtering and pagination
   * @param {Object} params - Query parameters (limit, offset, search, department, status, sortBy, sortOrder)
   * @returns {Promise} Response with employees, departments, pagination, and statistics
   */
  async getEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employees?${queryParams}`)
  }

  /**
   * Get single employee by ID
   * @param {number|string} id - Employee UID
   * @returns {Promise} Employee data
   */
  async getEmployee(id) {
    return this.request(`/api/employees/${id}`)
  }

  /**
   * Create new employee
   * @param {Object} employeeData - Employee information
   * @returns {Promise} Created employee data
   */
  async createEmployee(employeeData) {
    return this.request("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    })
  }

  /**
   * Update employee by ID
   * @param {number|string} id - Employee UID
   * @param {Object} employeeData - Updated employee information
   * @returns {Promise} Updated employee data
   */
  async updateEmployee(id, employeeData) {
    return this.request(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    })
  }

  /**
   * Update employee status
   * @param {number|string} id - Employee UID
   * @param {string} status - New status (Active, Inactive, On Leave, Terminated)
   * @returns {Promise} Updated status confirmation
   */
  async updateEmployeeStatus(id, status) {
    return this.request(`/api/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  }

  /**
   * Delete single employee
   * @param {number|string} id - Employee UID
   * @returns {Promise} Deletion confirmation
   */
  async deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Bulk delete employees
   * @param {Array<number>} employeeIds - Array of employee UIDs to delete
   * @returns {Promise} Bulk deletion confirmation with count
   */
  async bulkDeleteEmployees(employeeIds) {
    return this.request("/api/employees/bulk", {
      method: "DELETE",
      body: JSON.stringify({ employeeIds }),
    })
  }

  /**
   * Get departments (if separate endpoint exists)
   * @returns {Promise} List of departments
   */
  async getDepartments() {
    return this.request("/api/departments", {
      method: "GET",
    })
  }

  /**
   * Validate employee data (email, ID, etc.)
   * @param {Object} params - Validation parameters
   * @returns {Promise} Validation result
   */
  async validateEmployee(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employees/validate?${queryParams}`)
  }
}