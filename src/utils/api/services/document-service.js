// ============================================================================
// services/document-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"

export class DocumentService extends BaseAPIService {
  constructor() {
    super()
    this.documentCache = new Map()
  }

  // ============================================================================
  // SINGLE EMPLOYEE DOCUMENT OPERATIONS
  // ============================================================================

  /**
   * Get all documents for a specific employee
   * @param {number} uid - Employee UID
   * @returns {Promise<Object>} Response with employee info and documents list
   */
  async getEmployeeDocuments(uid) {
    const cacheKey = `employee_${uid}`
    
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      const result = await this.request(`/api/document/${uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.error(`Error fetching documents for employee ${uid}:`, error)
      throw error
    }
  }

  /**
   * Upload document(s) for a specific employee
   * @param {number} uid - Employee UID
   * @param {File|File[]} files - File or array of files to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocuments(uid, files) {
    const fileArray = Array.isArray(files) ? files : [files]
    
    // Validate files
    for (const file of fileArray) {
      this.validateDocumentFile(file)
    }

    const formData = new FormData()
    fileArray.forEach(file => {
      formData.append('documents', file)
    })

    const result = await this.request(`/api/document/${uid}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
      body: formData
    })

    // Clear cache for this employee
    this.clearEmployeeFromCache(uid)
    this.clearBulkCache()
    
    return result
  }

  /**
   * Get a specific document file
   * @param {number} uid - Employee UID
   * @param {string} filename - Document filename
   * @returns {Promise<Blob>} Document blob
   */
  async getDocument(uid, filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/document/${uid}/${filename}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()

    } catch (error) {
      console.error(`Error fetching document ${filename} for employee ${uid}:`, error)
      throw error
    }
  }

  /**
   * Download a specific document with proper download headers
   * @param {number} uid - Employee UID
   * @param {string} filename - Document filename
   * @returns {Promise<Blob>} Document blob for download
   */
  async downloadDocument(uid, filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/document/${uid}/${filename}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()

    } catch (error) {
      console.error(`Error downloading document ${filename} for employee ${uid}:`, error)
      throw error
    }
  }

  /**
   * Delete a specific document
   * @param {number} uid - Employee UID
   * @param {string} filename - Document filename
   * @returns {Promise<Object>} Deletion result
   */
  async deleteDocument(uid, filename) {
    const result = await this.request(`/api/document/${uid}/${filename}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    // Clear caches
    this.clearEmployeeFromCache(uid)
    this.clearBulkCache()
    
    return result
  }

  /**
   * Delete all documents for a specific employee
   * @param {number} uid - Employee UID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAllEmployeeDocuments(uid) {
    const result = await this.request(`/api/document/${uid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    // Clear caches
    this.clearEmployeeFromCache(uid)
    this.clearBulkCache()
    
    return result
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Get all employees with their documents (paginated with filters)
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50)
   * @param {string} options.search - Search term for employee names
   * @param {string} options.department - Filter by department
   * @param {string} options.document_type - Filter by document type
   * @returns {Promise<Object>} Bulk employee documents data
   */
  async getBulkEmployeeDocuments(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      department = '',
      document_type = ''
    } = options

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(department && { department }),
      ...(document_type && { document_type })
    })

    const cacheKey = `bulk_${queryParams.toString()}`
    
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      const result = await this.request(`/api/document/bulk?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.error("Error fetching bulk employee documents:", error)
      throw error
    }
  }

  /**
   * Get simplified list of all employees with document status
   * @returns {Promise<Object>} Simple employee document status
   */
  async getSimpleEmployeeDocumentStatus() {
    const cacheKey = 'bulk_simple'
    
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      const result = await this.request('/api/document/bulk/simple', {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.error("Error fetching simple employee document status:", error)
      throw error
    }
  }

  /**
   * Download documents in bulk as ZIP (GET method with query params)
   * @param {Object} options - Download options
   * @param {string} options.department - Filter by department
   * @param {string} options.search - Search term for employee names
   * @param {string} options.document_type - Filter by document type
   * @param {number[]} options.uids - Specific employee UIDs
   * @returns {Promise<Blob>} ZIP file blob
   */
  async downloadBulkDocuments(options = {}) {
    const {
      department = '',
      search = '',
      document_type = '',
      uids = []
    } = options

    const queryParams = new URLSearchParams({
      ...(department && { department }),
      ...(search && { search }),
      ...(document_type && { document_type }),
      ...(uids.length > 0 && { uids: uids.join(',') })
    })

    try {
      const response = await fetch(`${this.baseURL}/api/document/bulk/download?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()

    } catch (error) {
      console.error("Error downloading bulk documents:", error)
      throw error
    }
  }

  /**
   * Download specific documents as ZIP (POST method with request body)
   * @param {Object} options - Download options
   * @param {number[]} options.uids - Employee UIDs (required)
   * @param {string} options.document_type - Filter by document type
   * @param {boolean} options.include_summary - Include summary file (default: true)
   * @param {number} options.compression_level - ZIP compression level 0-9 (default: 6)
   * @returns {Promise<Blob>} ZIP file blob
   */
  async downloadSpecificDocuments(options) {
    const {
      uids,
      document_type = '',
      include_summary = true,
      compression_level = 6
    } = options

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      throw new Error("UIDs array is required")
    }

    try {
      const response = await fetch(`${this.baseURL}/api/document/bulk/download`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({
          uids,
          ...(document_type && { document_type }),
          include_summary,
          compression_level
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()

    } catch (error) {
      console.error("Error downloading specific documents:", error)
      throw error
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get document statistics overview
   * @returns {Promise<Object>} Document statistics
   */
  async getDocumentStatistics() {
    const cacheKey = 'stats_overview'
    
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      const result = await this.request('/api/document/stats/overview', {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      // Cache for 5 minutes
      this.documentCache.set(cacheKey, result)
      setTimeout(() => {
        this.documentCache.delete(cacheKey)
      }, 5 * 60 * 1000)
      
      return result

    } catch (error) {
      console.error("Error fetching document statistics:", error)
      throw error
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate document file before upload
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  validateDocumentFile(file) {
    if (!file) {
      throw new Error("No file provided")
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/csv',
      'application/rtf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'application/zip',
      'application/x-rar-compressed'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Only document and image files are allowed.`)
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 50MB per file.")
    }
  }

  /**
   * Get document URL for direct access
   * @param {number} uid - Employee UID
   * @param {string} filename - Document filename
   * @returns {string} Document URL
   */
  getDocumentUrl(uid, filename) {
    return `${this.baseURL}/api/document/${uid}/${filename}`
  }

  /**
   * Get document download URL
   * @param {number} uid - Employee UID
   * @param {string} filename - Document filename
   * @returns {string} Document download URL
   */
  getDocumentDownloadUrl(uid, filename) {
    return `${this.baseURL}/api/document/${uid}/${filename}/download`
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2)
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Clear all document cache
   */
  clearDocumentCache() {
    this.documentCache.clear()
  }

  /**
   * Clear cache for a specific employee
   * @param {number} uid - Employee UID
   */
  clearEmployeeFromCache(uid) {
    const keysToDelete = []
    for (const key of this.documentCache.keys()) {
      if (key.startsWith(`employee_${uid}`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.documentCache.delete(key))
  }

  /**
   * Clear bulk operation cache
   */
  clearBulkCache() {
    const keysToDelete = []
    for (const key of this.documentCache.keys()) {
      if (key.startsWith('bulk_') || key === 'stats_overview') {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.documentCache.delete(key))
  }

  // ============================================================================
  // HELPER METHODS FOR UI
  // ============================================================================

  /**
   * Download blob as file
   * @param {Blob} blob - File blob
   * @param {string} filename - Filename for download
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Create a preview URL for an image document
   * @param {Blob} blob - Image blob
   * @returns {string} Object URL for preview
   */
  createPreviewUrl(blob) {
    return URL.createObjectURL(blob)
  }

  /**
   * Revoke a preview URL
   * @param {string} url - Object URL to revoke
   */
  revokePreviewUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
}