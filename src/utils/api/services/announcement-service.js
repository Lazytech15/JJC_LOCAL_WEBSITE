// ============================================================================
// services/announcement-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class AnnouncementService extends BaseAPIService {
  /**
   * Get all announcements with filtering and pagination
   * @param {Object} params - Query parameters (limit, offset, priority, status, recipientType)
   * @returns {Promise} Response with announcements and pagination
   */
  async getAnnouncements(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/announcements?${queryParams}`)
  }

  /**
   * Get single announcement by ID
   * @param {number|string} id - Announcement ID
   * @returns {Promise} Announcement data
   */
  async getAnnouncement(id) {
    return this.request(`/api/announcements/${id}`)
  }

  /**
   * Get announcements for specific employee
   * @param {number|string} employeeId - Employee UID
   * @returns {Promise} Employee's announcements
   */
  async getEmployeeAnnouncements(employeeId) {
    return this.request(`/api/announcements/employee/${employeeId}`)
  }

  /**
   * Create new announcement
   * @param {Object} announcementData - Announcement information
   * @returns {Promise} Created announcement data
   */
  async createAnnouncement(announcementData) {
    return this.request("/api/announcements", {
      method: "POST",
      body: JSON.stringify(announcementData),
    })
  }

  /**
   * Update announcement by ID
   * @param {number|string} id - Announcement ID
   * @param {Object} announcementData - Updated announcement information
   * @returns {Promise} Updated announcement data
   */
  async updateAnnouncement(id, announcementData) {
    return this.request(`/api/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(announcementData),
    })
  }

  /**
   * Delete announcement
   * @param {number|string} id - Announcement ID
   * @returns {Promise} Deletion confirmation
   */
  async deleteAnnouncement(id) {
    return this.request(`/api/announcements/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Mark announcement as read
   * @param {number|string} announcementId - Announcement ID
   * @param {number|string} employeeId - Employee ID
   * @returns {Promise} Success confirmation
   */
  async markAnnouncementAsRead(announcementId, employeeId) {
    return this.request("/api/announcements/mark-read", {
      method: "POST",
      body: JSON.stringify({ announcementId, employeeId }),
    })
  }

  /**
   * Dismiss announcement for employee
   * @param {number|string} announcementId - Announcement ID
   * @param {number|string} employeeId - Employee ID
   * @returns {Promise} Success confirmation
   */
  async dismissAnnouncement(announcementId, employeeId) {
    return this.request("/api/announcements/dismiss", {
      method: "POST",
      body: JSON.stringify({ announcementId, employeeId }),
    })
  }
}