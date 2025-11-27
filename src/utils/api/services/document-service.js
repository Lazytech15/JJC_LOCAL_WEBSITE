// ============================================================================
// services/document-service.js - With Service Worker Cache Integration
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"
export class DocumentService extends BaseAPIService {
  constructor() {
    super()
    this.documentCache = new Map()
    this.cacheVersion = "v1"
    this.documentCacheName = `jjc-documents-${this.cacheVersion}`
  }

  // ============================================================================
  // SERVICE WORKER CACHE HELPERS
  // ============================================================================

  /**
   * Register service worker cache strategy
   */
  async registerServiceWorkerCache() {
    if (!('caches' in window)) {
      console.warn("[DocumentService] Cache API not available")
      return false
    }

    try {
      await caches.open(this.documentCacheName)
      console.log(`[DocumentService] Opened cache: ${this.documentCacheName}`)
      return true
    } catch (error) {
      console.error("[DocumentService] Failed to register SW cache:", error)
      return false
    }
  }

  /**
   * Get from service worker cache
   */
  async getFromSWCache(key) {
    try {
      if (!('caches' in window)) return null

      const cache = await caches.open(this.documentCacheName)
      const response = await cache.match(key)

      if (response) {
        console.log(`[DocumentService] Retrieved from SW cache: ${key}`)
        return response
      }
      return null
    } catch (error) {
      console.error("[DocumentService] Error reading SW cache:", error)
      return null
    }
  }

  /**
   * Save to service worker cache
   */
  async saveToSWCache(key, response) {
    try {
      if (!('caches' in window)) return false

      const cache = await caches.open(this.documentCacheName)

      // Clone response before caching
      const responseToCache = response.clone()
      await cache.put(key, responseToCache)

      console.log(`[DocumentService] Cached in SW: ${key}`)
      return true
    } catch (error) {
      console.error("[DocumentService] Error saving to SW cache:", error)
      return false
    }
  }

  /**
   * Clear specific document from service worker cache
   */
  async clearDocumentFromSWCache(employeeId, filename) {
    try {
      if (!('caches' in window)) return false

      const cache = await caches.open(this.documentCacheName)
      const documentUrl = `${this.baseURL}/api/document/${employeeId}/${filename}`

      const deleted = await cache.delete(documentUrl)
      if (deleted) {
        console.log(`[DocumentService] Cleared from SW cache: ${documentUrl}`)
      }
      return deleted
    } catch (error) {
      console.error("[DocumentService] Error clearing document from SW cache:", error)
      return false
    }
  }

  /**
   * Clear all documents for employee from service worker cache
   */
  async clearEmployeeDocumentsFromSWCache(employeeId) {
    try {
      if (!('caches' in window)) return 0

      const cache = await caches.open(this.documentCacheName)
      const requests = await cache.keys()

      let deletedCount = 0
      for (const request of requests) {
        if (request.url.includes(`/api/document/${employeeId}`)) {
          await cache.delete(request)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        console.log(`[DocumentService] Cleared ${deletedCount} documents from SW cache for employee ${employeeId}`)
      }
      return deletedCount
    } catch (error) {
      console.error("[DocumentService] Error clearing employee documents from SW cache:", error)
      return 0
    }
  }

  /**
   * Clear all document cache
   */
  async clearAllDocumentSWCache() {
    try {
      if (!('caches' in window)) return false

      const deleted = await caches.delete(this.documentCacheName)
      if (deleted) {
        console.log("[DocumentService] Cleared entire document SW cache")
      }
      return deleted
    } catch (error) {
      console.error("[DocumentService] Error clearing all SW cache:", error)
      return false
    }
  }

  // ============================================================================
  // SINGLE EMPLOYEE DOCUMENT OPERATIONS
  // ============================================================================

  /**
   * Get all documents for a specific employee
   * @param {number} employeeId - Employee ID (can be uid or id)
   * @returns {Promise<Object>} Response with employee info and documents list
   */
  async getEmployeeDocuments(employeeId) {
    const cacheKey = `employee_${employeeId}`
    const apiUrl = `/api/document/${employeeId}`

    if (this.documentCache.has(cacheKey)) {
      console.log(`[DocumentService] Using memory cache for employee ${employeeId}`)
      return this.documentCache.get(cacheKey)
    }

    try {
      console.log(`[DocumentService] Fetching documents for employee ${employeeId}`)

      // Try to get from service worker cache first
      const swCached = await this.getFromSWCache(apiUrl)
      if (swCached) {
        const cachedData = await swCached.json()
        this.documentCache.set(cacheKey, cachedData)
        return cachedData
      }

      // Fetch from network
      const result = await this.request(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      console.log(`[DocumentService] Received documents result:`, result)

      // Cache in both memory and service worker
      if (result.success || result.data) {
        const formattedResult = result.success ? result : {
          success: true,
          data: result.data
        }

        this.documentCache.set(cacheKey, formattedResult)

        // Cache in service worker as well
        const response = new Response(JSON.stringify(formattedResult), {
          headers: { 'Content-Type': 'application/json' }
        })
        await this.saveToSWCache(apiUrl, response)

        return formattedResult
      }

      return result

    } catch (error) {
      console.error(`[DocumentService] Error fetching documents for employee ${employeeId}:`, error)

      // Try to return cached version on error
      const swCached = await this.getFromSWCache(apiUrl)
      if (swCached) {
        return await swCached.json()
      }

      return {
        success: false,
        error: error.message,
        data: {
          employee: { id: employeeId },
          documents: []
        }
      }
    }
  }

  /**
   * Upload document(s) for a specific employee
   * @param {number} employeeId - Employee ID
   * @param {File|File[]} files - File or array of files to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocuments(employeeId, files) {
    const fileArray = Array.isArray(files) ? files : [files]

    for (const file of fileArray) {
      this.validateDocumentFile(file)
    }

    const formData = new FormData()
    fileArray.forEach(file => {
      formData.append('documents', file)
    })

    console.log(`[DocumentService] Uploading ${fileArray.length} documents for employee ${employeeId}`)

    const result = await this.request(`/api/document/${employeeId}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
      body: formData
    })

    console.log(`[DocumentService] Upload result:`, result)

    // Clear all caches for this employee
    await this.clearEmployeeDocumentsFromSWCache(employeeId)
    this.clearEmployeeFromCache(employeeId)
    this.clearBulkCache()

    return result
  }

  /**
  * Get a specific document file
  * @param {number} employeeId - Employee ID
  * @param {string} filename - Document filename
  * @returns {Promise<Blob>} Document blob
  */
  async getDocument(employeeId, filename) {
    try {
      console.log(`[DocumentService] Fetching document: ${filename} for employee ${employeeId}`)

      const token = getStoredToken()
      const documentUrl = `${this.baseURL}/api/document/${employeeId}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`

      // Try service worker cache first
      const swCached = await this.getFromSWCache(documentUrl)
      if (swCached) {
        console.log(`[DocumentService] Document from SW cache: ${filename}`)
        return await swCached.blob()
      }

      const response = await fetch(documentUrl, {
        method: "GET",
        credentials: 'include'
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Cache in service worker
      await this.saveToSWCache(documentUrl, response.clone())

      return await response.blob()

    } catch (error) {
      console.error(`[DocumentService] Error fetching document ${filename} for employee ${employeeId}:`, error)
      throw error
    }
  }

 
/**
  * Download a specific document with proper download headers
  * @param {number} employeeId - Employee ID
  * @param {string} filename - Document filename
  * @returns {Promise<Blob>} Document blob for download
  */
  async downloadDocument(employeeId, filename) {
    try {
      console.log(`[DocumentService] Downloading document: ${filename} for employee ${employeeId}`)

      const token = getStoredToken()

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Use query parameters instead of headers to avoid CORS preflight
      const documentUrl = `${this.baseURL}/api/document/${employeeId}/${encodeURIComponent(filename)}?download=true&token=${encodeURIComponent(token)}`

      const response = await fetch(documentUrl, {
        method: "GET",
        credentials: 'include',
        headers: {
          'Accept': 'application/octet-stream'
        }
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.error || errorData.message || `Failed to download: ${response.statusText}`)
      }

      // Verify we received a valid response
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        // If we got JSON back, it might be an error
        const jsonResponse = await response.json()
        if (!jsonResponse.success) {
          throw new Error(jsonResponse.error || 'Download failed')
        }
      }

      // Return the blob for download
      return await response.blob()

    } catch (error) {
      console.error(`[DocumentService] Error downloading document ${filename} for employee ${employeeId}:`, error)
      throw error
    }
  }

  /**
   * Delete a specific document
   * @param {number} employeeId - Employee ID
   * @param {string} filename - Document filename
   * @returns {Promise<Object>} Deletion result
   */
  async deleteDocument(employeeId, filename) {
    console.log(`[DocumentService] Deleting document: ${filename} for employee ${employeeId}`)

    const result = await this.request(`/api/document/${employeeId}/${filename}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    // Clear caches
    await this.clearDocumentFromSWCache(employeeId, filename)
    this.clearEmployeeFromCache(employeeId)
    this.clearBulkCache()

    return result
  }

  /**
   * Delete all documents for a specific employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAllEmployeeDocuments(employeeId) {
    console.log(`[DocumentService] Deleting all documents for employee ${employeeId}`)

    const result = await this.request(`/api/document/${employeeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    // Clear all caches
    await this.clearEmployeeDocumentsFromSWCache(employeeId)
    this.clearEmployeeFromCache(employeeId)
    this.clearBulkCache()

    return result
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Get all employees with their documents (paginated with filters)
   * @param {Object} options - Query options
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
    const apiUrl = `/api/document/bulk?${queryParams}`

    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      // Try service worker cache first
      const swCached = await this.getFromSWCache(apiUrl)
      if (swCached) {
        const cachedData = await swCached.json()
        this.documentCache.set(cacheKey, cachedData)
        return cachedData
      }

      const result = await this.request(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)

      // Cache in service worker
      const response = new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
      await this.saveToSWCache(apiUrl, response)

      return result

    } catch (error) {
      console.error("[DocumentService] Error fetching bulk employee documents:", error)
      throw error
    }
  }

  /**
   * Get simplified list of all employees with document status
   * @returns {Promise<Object>} Simple employee document status
   */
  async getSimpleEmployeeDocumentStatus() {
    const cacheKey = 'bulk_simple'
    const apiUrl = '/api/document/bulk/simple'

    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      // Try service worker cache first
      const swCached = await this.getFromSWCache(apiUrl)
      if (swCached) {
        const cachedData = await swCached.json()
        this.documentCache.set(cacheKey, cachedData)
        return cachedData
      }

      const result = await this.request(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)

      // Cache in service worker
      const response = new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
      await this.saveToSWCache(apiUrl, response)

      return result

    } catch (error) {
      console.error("[DocumentService] Error fetching simple employee document status:", error)
      throw error
    }
  }

  /**
   * Download documents in bulk as ZIP
   * @param {Object} options - Download options
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
      const downloadUrl = `${this.baseURL}/api/document/bulk/download?${queryParams}`

      // Don't use cache for downloads, always get fresh
      const response = await fetch(downloadUrl, {
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
      console.error("[DocumentService] Error downloading bulk documents:", error)
      throw error
    }
  }

  /**
   * Download specific documents as ZIP
   * @param {Object} options - Download options
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
      const downloadUrl = `${this.baseURL}/api/document/bulk/download`

      // Don't use cache for downloads, always get fresh
      const response = await fetch(downloadUrl, {
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
      console.error("[DocumentService] Error downloading specific documents:", error)
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
    const apiUrl = '/api/document/stats/overview'

    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)
    }

    try {
      // Try service worker cache first
      const swCached = await this.getFromSWCache(apiUrl)
      if (swCached) {
        const cachedData = await swCached.json()
        this.documentCache.set(cacheKey, cachedData)
        return cachedData
      }

      const result = await this.request(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      this.documentCache.set(cacheKey, result)

      // Cache in service worker
      const response = new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
      await this.saveToSWCache(apiUrl, response)

      // Cache for 5 minutes in memory
      setTimeout(() => {
        this.documentCache.delete(cacheKey)
      }, 5 * 60 * 1000)

      return result

    } catch (error) {
      console.error("[DocumentService] Error fetching document statistics:", error)
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 50MB per file.")
    }
  }

  /**
   * Get document URL for direct access
   * @param {number} employeeId - Employee ID
   * @param {string} filename - Document filename
   * @returns {string} Document URL
   */
  getDocumentUrl(employeeId, filename) {
    return `${this.baseURL}/api/document/${employeeId}/${filename}`
  }

  /**
   * Get document download URL
   * @param {number} employeeId - Employee ID
   * @param {string} filename - Document filename
   * @returns {string} Document download URL with download flag
   */
  getDocumentDownloadUrl(employeeId, filename) {
    const token = getStoredToken()
    return `${this.baseURL}/api/document/${employeeId}/${encodeURIComponent(filename)}?download=true&token=${encodeURIComponent(token)}`
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
   * Clear all document cache (memory and service worker)
   */
  async clearDocumentCache() {
    console.log("[DocumentService] Clearing all document cache")
    this.documentCache.clear()
    await this.clearAllDocumentSWCache()
  }

  /**
   * Clear cache for a specific employee
   * @param {number} employeeId - Employee ID
   */
  clearEmployeeFromCache(employeeId) {
    console.log(`[DocumentService] Clearing memory cache for employee ${employeeId}`)
    const keysToDelete = []
    for (const key of this.documentCache.keys()) {
      if (key.startsWith(`employee_${employeeId}`)) {
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
  /**
   * Helper method to download blob with proper filename
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
      
      // Cleanup
      window.document.body.removeChild(link)
      
      // Revoke the object URL after a short delay to ensure download started
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('[DocumentService] Error in downloadBlob:', error)
      throw new Error('Failed to download file')
    }
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