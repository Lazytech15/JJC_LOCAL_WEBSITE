// ============================================================================
// services/auth-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class AuthService extends BaseAPIService {
  /**
   * Login user with credentials
   * @param {Object} credentials - Login credentials (username, password, department)
   * @returns {Promise} User data and authentication token
   */
  async login(credentials) {
    try {
      const { username, password, department } = credentials
      
      // Validate required fields
      if (!username || !password || !department) {
        throw new Error('Username, password, and department are required')
      }

      // Make login request
      const queryParams = new URLSearchParams({
        username,
        password,
        department
      }).toString()

      const response = await this.request(`/api/auth?${queryParams}`, {
        method: "GET",
      })

      // Store authentication token if provided
      if (response.token) {
        localStorage.setItem('authToken', response.token)
      }

      return response
    } catch (error) {
      console.error('[AuthService] Login failed:', error)
      throw error
    }
  }

  /**
   * Refresh authentication token
   * @returns {Promise} New authentication token
   */
  async refreshToken() {
    try {
      const response = await this.request("/api/auth/refresh", {
        method: "POST",
      })

      // Update stored token
      if (response.token) {
        localStorage.setItem('authToken', response.token)
      }

      return response
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error)
      throw error
    }
  }

  /**
   * Logout user and clear authentication
   * @returns {Promise} Logout confirmation
   */
  async logout() {
    try {
      // Call logout endpoint if it exists
      await this.request("/api/auth/logout", {
        method: "POST",
      }).catch(() => {
        // Silently fail if endpoint doesn't exist
      })

      // Clear stored token
      localStorage.removeItem('authToken')
      
      return { success: true, message: 'Logged out successfully' }
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
      // Still clear token on error
      localStorage.removeItem('authToken')
      throw error
    }
  }

  /**
   * Verify current authentication status
   * @returns {Promise} User data if authenticated
   */
  async verifyAuth() {
    try {
      return await this.request("/api/auth/verify", {
        method: "GET",
      })
    } catch (error) {
      console.error('[AuthService] Auth verification failed:', error)
      throw error
    }
  }

  /**
   * Get HR data (legacy method for compatibility)
   * @returns {Promise} HR data
   */
  async getHRData() {
    return this.request("/api/employees")
  }

  /**
   * Check if user has TRUE SuperAdmin privileges
   * Only users with access_level='admin' AND department='superAdmin' are TRUE SuperAdmins
   * @param {Object} user - User object
   * @returns {boolean} True if user is TRUE SuperAdmin
   */
  isSuperAdmin(user) {
    return user?.access_level === 'admin' && user?.department === 'superAdmin'
  }

  /**
   * Check if user can access department
   * @param {Object} user - User object
   * @param {string} department - Department name
   * @returns {boolean} True if user can access department
   */
  canAccessDepartment(user, department) {
    if (!user) return false
    
    // TRUE SuperAdmins (admin + superAdmin dept) can access all departments
    if (this.isSuperAdmin(user)) return true
    
    // Regular users (including admins from other depts) can only access their own department
    return user.department === department
  }

  /**
   * Get available departments for user
   * @param {Object} user - User object
   * @returns {Array} List of accessible departments
   */
  getAccessibleDepartments(user) {
    const allDepartments = [
      { id: 'hr', name: 'Human Resources' },
      { id: 'operations', name: 'Operations' },
      { id: 'finance', name: 'Finance' },
      { id: 'procurement', name: 'Procurement' },
      { id: 'engineering', name: 'Engineering' }
    ]

    // TRUE SuperAdmins can access all departments + superAdmin
    if (this.isSuperAdmin(user)) {
      return [
        ...allDepartments,
        { id: 'superadmin', name: 'superAdmin' }
      ]
    }

    // Regular users (including non-superAdmin admins) can only access their own department
    return allDepartments.filter(dept => dept.name === user.department)
  }
}