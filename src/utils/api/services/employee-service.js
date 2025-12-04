// ============================================================================
// services/employee-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"

export class EmployeeService extends BaseAPIService {
  /**
   * Get all employees with filtering and pagination
   * @param {Object} params - Query parameters (limit, offset, search, department, status, sortBy, sortOrder)
   * @returns {Promise} Response with employees, departments, pagination, and statistics
   */
async getEmployees(params = {}, options = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Add all params to query string
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const url = `${this.baseURL}/api/employees?${queryParams.toString()}`;
    
    console.log('[EmployeeService] Fetching employees:', url);

    const fetchOptions = {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStoredToken()}`,
      },
    };

    // Add abort signal if provided
    if (options.signal) {
      fetchOptions.signal = options.signal;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      employees: data.employees || data.data || [],
      pagination: data.pagination || { total: 0, page: 1, limit: 20 },
      statistics: data.statistics || {},
      departments: data.departments || [],
    };

  } catch (error) {
    // Don't log abort errors
    if (error.name === 'AbortError') {
      console.log('[EmployeeService] Request aborted');
      throw error;
    }
    
    console.error("Error fetching employees:", error);
    return {
      success: false,
      error: error.message,
      employees: [],
      pagination: { total: 0, page: 1, limit: 20 },
      statistics: {},
      departments: [],
    };
  }
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
    return this.request("/api/employees/departments", {
      method: "GET",
    })
  }

  async updateEmployeePassword(id, passwordData) {
  return this.request(`/api/employees/${id}/password`, {
    method: "PUT",
    body: JSON.stringify(passwordData),
  })
}

 async addEmployeeToEmpList(employeeData) {
    console.log("[API] Adding employee to emp_list:", employeeData)
    return this.request("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
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

  /**
 * Get current logged-in employee data (bypasses status filter)
 * @param {number|string} uid - Employee UID
 * @returns {Promise} Employee data
 */
async getCurrentEmployeeData(uid) {
  try {
    const queryParams = new URLSearchParams({
      employeeUid: uid,
      includeAllStatuses: 'true',
      limit: 1
    });

    const url = `${this.baseURL}/api/employees?${queryParams.toString()}`;
    
    console.log('[EmployeeService] Fetching current employee data:', url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStoredToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      employee: data.employees?.[0] || null,
    };

  } catch (error) {
    console.error("Error fetching current employee:", error);
    return {
      success: false,
      error: error.message,
      employee: null,
    };
  }
}
}