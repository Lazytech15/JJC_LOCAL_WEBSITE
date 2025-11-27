// ============================================================================
// services/announcement-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"
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

  /**
   * Get attachments for an announcement
   * @param {number|string} announcementId - Announcement ID
   * @returns {Promise} Announcement attachments
   */
  async getAnnouncementAttachments(announcementId) {
    return this.request(`/api/announcements/${announcementId}/attachments`)
  }

      /**
   * Upload attachments for an announcement - FIXED VERSION
   * @param {number|string} announcementId - Announcement ID
   * @param {File|File[]} files - File or array of files to upload
   * @returns {Promise} Upload result
   */
  async uploadAnnouncementAttachments(announcementId, files) {
  const fileArray = Array.isArray(files) ? files : [files]

  console.log(`[AnnouncementService] Starting upload for announcement ${announcementId}`)
  console.log(`[AnnouncementService] Files to upload:`, fileArray.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type
  })))

  // Validate each file
  for (const file of fileArray) {
    this.validateAnnouncementFile(file)
  }

  const formData = new FormData()
  fileArray.forEach((file, index) => {
    formData.append('attachments[]', file)
    console.log(`[AnnouncementService] Added file ${index + 1}: ${file.name}`)
  })

  // Get token for authentication
  const token = this.getToken()
  
  if (!token) {
    throw new Error('No authentication token found')
  }
  
  console.log(`[AnnouncementService] Using token: ${token.substring(0, 20)}...`)
  
  try {
    const url = `${this.baseURL}/api/announcements/${announcementId}/upload?token=${encodeURIComponent(token)}`
    console.log(`[AnnouncementService] Upload URL: ${url}`)
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`
        // DO NOT set Content-Type - browser sets it with boundary
      },
      body: formData
      // REMOVED: credentials: 'include' - causes CORS issues with wildcard
    })

    console.log(`[AnnouncementService] Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorMessage
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || response.statusText
        console.error('[AnnouncementService] Error response:', errorData)
      } catch {
        errorMessage = await response.text()
        console.error('[AnnouncementService] Error text:', errorMessage)
      }
      throw new Error(`Upload failed (${response.status}): ${errorMessage}`)
    }

    const result = await response.json()
    console.log('[AnnouncementService] Upload successful:', result)
    return result
    
  } catch (error) {
    console.error(`[AnnouncementService] Upload error:`, error)
    throw error
  }
}


  /**
   * Get announcement attachment (returns blob)
   * @param {number|string} announcementId - Announcement ID
   * @param {string} filename - Attachment filename
   * @returns {Promise<Blob>} Attachment blob
   */
  async getAnnouncementAttachment(announcementId, filename) {
    try {
      const token = this.getToken()
      const attachmentUrl = `${this.baseURL}/api/announcements/${announcementId}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`

      const response = await fetch(attachmentUrl, {
        method: "GET",
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch attachment: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error(`[AnnouncementService] Error fetching attachment:`, error)
      throw error
    }
  }

  /**
   * Download announcement attachment with proper download headers
   * @param {number|string} announcementId - Announcement ID
   * @param {string} filename - Attachment filename
   * @returns {Promise<Blob>} Attachment blob for download
   */
  async downloadAnnouncementAttachment(announcementId, filename) {
    try {
      const token = this.getToken()
      const attachmentUrl = `${this.baseURL}/api/announcements/${announcementId}/${encodeURIComponent(filename)}?download=true&token=${encodeURIComponent(token)}`

      const response = await fetch(attachmentUrl, {
        method: "GET",
        credentials: 'include',
        headers: {
          'Accept': 'application/octet-stream'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error(`[AnnouncementService] Error downloading attachment:`, error)
      throw error
    }
  }

  /**
   * Delete announcement attachment
   * @param {number|string} announcementId - Announcement ID
   * @param {string} filename - Attachment filename
   * @returns {Promise} Deletion result
   */
  async deleteAnnouncementAttachment(announcementId, filename) {
    return this.request(`/api/announcements/${announcementId}/${filename}`, {
      method: "DELETE"
    })
  }

     /**
   * Validate announcement attachment file
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  validateAnnouncementFile(file) {
    if (!file) {
      throw new Error("No file provided")
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Only documents and images allowed.`)
    }

    const maxSize = 10 * 1024 * 1024 // 10MB for announcements
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 10MB per file.")
    }
  }

  /**
   * Get token helper method
   * @returns {string} Authentication token
   */
  getToken() {
    return getStoredToken()
  }

  /**
   * Get announcement attachment URL
   * @param {number|string} announcementId - Announcement ID
   * @param {string} filename - Attachment filename
   * @returns {string} Attachment URL
   */
  getAnnouncementAttachmentUrl(announcementId, filename) {
    const token = this.getToken()
    return `${this.baseURL}/api/announcements/${announcementId}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`
  }

  /**
   * Get token helper method
   * @returns {string} Authentication token
   */
  getToken() {
    // Import at top of file if not already there
    // import { getStoredToken } from "../../auth.js"
    return getStoredToken()
  }

  /**
   * Download blob as file helper
   * @param {Blob} blob - File blob
   * @param {string} filename - Filename for download
   */
  downloadBlob(blob, filename) {
    try {
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      
      window.document.body.appendChild(link)
      link.click()
      
      window.document.body.removeChild(link)
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('[AnnouncementService] Error in downloadBlob:', error)
      throw new Error('Failed to download file')
    }
  }
}