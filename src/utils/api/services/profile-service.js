// ============================================================================
// services/profile-service.js - Complete with Direct Caching for All Images
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"

export class ProfileService extends BaseAPIService {
  constructor() {
    super()
    this.profileCache = new Map()
    this.landingImageCache = new Map() // Landing images cache
    this.galleryImageCache = new Map() // Gallery images cache
  }

  // ============================================================================
  // PROFILE PICTURE METHODS (Original with existing cache)
  // ============================================================================

  async getProfileByUid(uid) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (response.status === 404) {
        return { success: false, error: "No profile picture found" }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        throw error
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      return {
        success: true,
        blob,
        url
      }

    } catch (error) {
      console.error("Profile picture fetch error:", error)
      return { success: false, error: error.message }
    }
  }

  getProfileUrlByUid(uid) {
    return `${this.baseURL}/api/profile/${uid}`
  }

  async checkProfileExists(uid) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/info`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  clearProfileFromServiceWorker(uid) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_PROFILE',
        uid: uid
      })
    }
  }

  clearAllProfilesFromServiceWorker() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_PROFILE_CACHE'
      })
    }
  }

  clearProfileFromCache(uid) {
    if (this.profileCache.has(uid)) {
      const cached = this.profileCache.get(uid)
      if (cached.success && cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
      this.profileCache.delete(uid)
    }

    this.clearProfileFromServiceWorker(uid)
  }

  async preloadProfile(uid) {
    try {
      const url = this.getProfileUrlByUid(uid)
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })
      
      if (response.ok) {
        console.log(`[ProfileService] Preloaded profile for UID: ${uid}`)
        return true
      }
      return false
    } catch (error) {
      console.error(`[ProfileService] Failed to preload profile for UID ${uid}:`, error)
      return false
    }
  }

  async getProfileInfoByUid(uid) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/info`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data

    } catch (error) {
      console.error("Profile info fetch error:", error)
      throw error
    }
  }

  async getSpecificProfilePicture(uid, filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/${filename}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (response.status === 404) {
        return { success: false, error: "Profile picture file not found" }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      return {
        success: true,
        blob,
        url: URL.createObjectURL(blob),
        filename
      }

    } catch (error) {
      console.error("Specific profile picture fetch error:", error)
      throw error
    }
  }

  // ============================================================================
  // LANDING PAGE IMAGE MANAGEMENT WITH DIRECT CACHING
  // ============================================================================

  /**
   * Get all landing page images with caching
   * @param {boolean} forceRefresh - Force fetch from server
   * @returns {Promise<Object>} Response with images array
   */
  async getLandingImages(forceRefresh = false) {
    try {
      const cacheKey = 'landing_images_list'
      if (!forceRefresh && this.landingImageCache.has(cacheKey)) {
        console.log('[ProfileService] Returning cached landing images list')
        return this.landingImageCache.get(cacheKey)
      }

      const response = await fetch(`${this.baseURL}/api/profile/landing`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = {
        success: true,
        data: data.data
      }

      this.landingImageCache.set(cacheKey, result)
      console.log('[ProfileService] Cached landing images list')

      return result

    } catch (error) {
      console.error("Landing images fetch error:", error)
      return { success: false, error: error.message, data: { images: [], count: 0 } }
    }
  }

  /**
   * Get landing image blob with caching
   * @param {string} filename - Image filename
   * @param {boolean} forceRefresh - Force fetch from server
   * @returns {Promise<Object>} Response with blob and URL
   */
  async getLandingImageBlob(filename, forceRefresh = false) {
    try {
      if (!forceRefresh && this.landingImageCache.has(filename)) {
        console.log(`[ProfileService] Returning cached landing image: ${filename}`)
        return this.landingImageCache.get(filename)
      }

      const url = this.getLandingImageUrl(filename)
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (response.status === 404) {
        return { success: false, error: "Landing image not found" }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const result = {
        success: true,
        blob,
        url: blobUrl,
        filename
      }

      this.landingImageCache.set(filename, result)
      console.log(`[ProfileService] Cached landing image: ${filename}`)

      return result

    } catch (error) {
      console.error("Landing image blob fetch error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Upload landing page image and invalidate cache
   */
  async uploadLandingImage(file) {
    try {
      if (!file) {
        throw new Error("No file provided for upload")
      }

      this.validateFile(file)

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${this.baseURL}/api/profile/landing/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Clear cache after upload
      this.clearLandingImageCache()

      return {
        success: true,
        message: data.message,
        data: data.data
      }

    } catch (error) {
      console.error("Landing image upload error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get specific landing page image URL
   * @param {string} filename - Image filename
   * @returns {string} Image URL
   */
  getLandingImageUrl(filename) {
    return `${this.baseURL}/api/profile/landing/${filename}`
  }

  /**
   * Delete landing page image and clear from cache
   */
  async deleteLandingImage(filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/landing/${filename}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Clear specific image from cache
      this.clearLandingImageFromCache(filename)

      return {
        success: true,
        message: data.message,
        data: data.data
      }

    } catch (error) {
      console.error("Landing image delete error:", error)
      return { success: false, error: error.message }
    }
  }

  // ============================================================================
  // GALLERY IMAGE MANAGEMENT WITH DIRECT CACHING
  // ============================================================================

  /**
   * Get all gallery images with caching
   */
  async getGalleryImages(forceRefresh = false) {
    try {
      const cacheKey = 'gallery_images_list'
      if (!forceRefresh && this.galleryImageCache.has(cacheKey)) {
        console.log('[ProfileService] Returning cached gallery images list')
        return this.galleryImageCache.get(cacheKey)
      }

      const response = await fetch(`${this.baseURL}/api/profile/gallery`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = {
        success: true,
        data: data.data
      }

      this.galleryImageCache.set(cacheKey, result)
      console.log('[ProfileService] Cached gallery images list')

      return result

    } catch (error) {
      console.error("Gallery images fetch error:", error)
      return { success: false, error: error.message, data: { images: [], count: 0 } }
    }
  }

  /**
   * Get gallery image blob with caching
   */
  async getGalleryImageBlob(filename, forceRefresh = false) {
    try {
      if (!forceRefresh && this.galleryImageCache.has(filename)) {
        console.log(`[ProfileService] Returning cached gallery image: ${filename}`)
        return this.galleryImageCache.get(filename)
      }

      const url = this.getGalleryImageUrl(filename)
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (response.status === 404) {
        return { success: false, error: "Gallery image not found" }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const result = {
        success: true,
        blob,
        url: blobUrl,
        filename
      }

      this.galleryImageCache.set(filename, result)
      console.log(`[ProfileService] Cached gallery image: ${filename}`)

      return result

    } catch (error) {
      console.error("Gallery image blob fetch error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Upload gallery image(s) and invalidate cache
   */
  async uploadGalleryImages(files) {
    try {
      const fileArray = Array.isArray(files) ? files : [files]
      
      if (fileArray.length === 0) {
        throw new Error("No files provided for upload")
      }

      fileArray.forEach(file => this.validateFile(file))

      const formData = new FormData()
      fileArray.forEach(file => {
        formData.append('images[]', file)
      })

      const response = await fetch(`${this.baseURL}/api/profile/gallery/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Clear cache after upload
      this.clearGalleryImageCache()

      return {
        success: true,
        message: data.message,
        data: data.data
      }

    } catch (error) {
      console.error("Gallery images upload error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get specific gallery image URL
   * @param {string} filename - Image filename
   * @returns {string} Image URL
   */
  getGalleryImageUrl(filename) {
    return `${this.baseURL}/api/profile/gallery/${filename}`
  }

  /**
   * Delete gallery image and clear from cache
   */
  async deleteGalleryImage(filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/gallery/${filename}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Clear specific image from cache
      this.clearGalleryImageFromCache(filename)

      return {
        success: true,
        message: data.message,
        data: data.data
      }

    } catch (error) {
      console.error("Gallery image delete error:", error)
      return { success: false, error: error.message }
    }
  }

  // ============================================================================
  // BULK PROFILE METHODS
  // ============================================================================

  async getBulkProfiles(options = {}) {
    try {
      const queryParams = new URLSearchParams()
      
      if (options.page) queryParams.append('page', options.page)
      if (options.limit) queryParams.append('limit', options.limit)
      if (options.search) queryParams.append('search', options.search)
      if (options.department) queryParams.append('department', options.department)

      const response = await fetch(`${this.baseURL}/api/profile/bulk?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data

    } catch (error) {
      console.error("Bulk profiles fetch error:", error)
      throw error
    }
  }

  async getBulkProfilesSimple() {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/bulk/simple`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data

    } catch (error) {
      console.error("Simple bulk profiles fetch error:", error)
      throw error
    }
  }

  async downloadBulkProfiles(options = {}) {
    try {
      const queryParams = new URLSearchParams()
      
      if (options.department) queryParams.append('department', options.department)
      if (options.search) queryParams.append('search', options.search)
      if (options.uids && Array.isArray(options.uids)) {
        queryParams.append('uids', options.uids.join(','))
      }

      const response = await fetch(`${this.baseURL}/api/profile/bulk/download?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      return {
        success: true,
        blob,
        filename: this.extractFilenameFromResponse(response) || 'profile_images.zip'
      }

    } catch (error) {
      console.error("Bulk download error:", error)
      throw error
    }
  }

  async downloadBulkProfilesPost(uids, options = {}) {
    try {
      const requestBody = {
        uids: uids,
        include_summary: options.include_summary !== false,
        compression_level: options.compression_level || 6
      }

      const response = await fetch(`${this.baseURL}/api/profile/bulk/download`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      return {
        success: true,
        blob,
        filename: this.extractFilenameFromResponse(response) || 'profile_images.zip'
      }

    } catch (error) {
      console.error("Bulk download (POST) error:", error)
      throw error
    }
  }

  async deleteProfilePicture(uid, filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/${filename}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      this.clearProfileFromCache(uid)
      
      return data

    } catch (error) {
      console.error("Profile picture delete error:", error)
      throw error
    }
  }

  async uploadProfileByUid(uid, file) {
    if (!file) {
      throw new Error("No file provided for upload")
    }

    this.validateFile(file)

    const formData = new FormData()
    formData.append('profile_picture', file)

    const result = await this.request(`/api/profile/${uid}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
      body: formData
    })

    this.clearProfileFromCache(uid)
    return result
  }

  async uploadReplaceProfileByUid(uid, file) {
    if (!file) {
      throw new Error("No file provided for upload")
    }

    this.validateFile(file)

    const formData = new FormData()
    formData.append('profile_picture', file)

    const result = await this.request(`/api/profile/${uid}/upload-replace`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
      body: formData
    })

    this.clearProfileFromCache(uid)
    return result
  }

  // ============================================================================
  // FACE RECOGNITION DESCRIPTOR METHODS
  // ============================================================================

  async getEmployeeDescriptor(uid) {
    try {
      console.log(`🔍 Fetching face descriptor for UID: ${uid}`);
      
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/descriptor`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (response.status === 404) {
        console.log(`⚠️ No descriptor found for UID: ${uid}`);
        return { success: false, error: "No face descriptor found" }
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Descriptor loaded for UID: ${uid}`);
      return {
        success: true,
        descriptor: data.descriptor || data.data?.descriptor,
        data: data
      }

    } catch (error) {
      console.error("Face descriptor fetch error:", error)
      return { success: false, error: error.message }
    }
  }

  async saveEmployeeDescriptor(uid, descriptor) {
    try {
      console.log(`💾 Saving face descriptor for UID: ${uid}`);
      
      if (!Array.isArray(descriptor) || descriptor.length !== 128) {
        throw new Error("Invalid descriptor: must be an array of 128 numbers")
      }

      const response = await fetch(`${this.baseURL}/api/profile/${uid}/descriptor`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({ descriptor })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Descriptor saved successfully for UID: ${uid}`);
      return {
        success: true,
        message: data.message || "Descriptor saved successfully",
        data: data
      }

    } catch (error) {
      console.error("Face descriptor save error:", error)
      return { success: false, error: error.message }
    }
  }

  async updateEmployeeDescriptor(uid, descriptor) {
    try {
      console.log(`🔄 Updating face descriptor for UID: ${uid}`);
      
      if (!Array.isArray(descriptor) || descriptor.length !== 128) {
        throw new Error("Invalid descriptor: must be an array of 128 numbers")
      }

      const response = await fetch(`${this.baseURL}/api/profile/${uid}/descriptor`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({ descriptor })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Descriptor updated successfully for UID: ${uid}`);
      return {
        success: true,
        message: data.message || "Descriptor updated successfully",
        data: data
      }

    } catch (error) {
      console.error("Face descriptor update error:", error)
      return { success: false, error: error.message }
    }
  }

  async deleteEmployeeDescriptor(uid) {
    try {
      console.log(`🗑️ Deleting face descriptor for UID: ${uid}`);
      
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/descriptor`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Descriptor deleted successfully for UID: ${uid}`);
      return {
        success: true,
        message: data.message || "Descriptor deleted successfully",
        data: data
      }

    } catch (error) {
      console.error("Face descriptor delete error:", error)
      return { success: false, error: error.message }
    }
  }

  async getAllEmployeesWithDescriptors() {
    try {
      console.log('📋 Fetching all employees with face descriptors...');
      
      const response = await fetch(`${this.baseURL}/api/profile/descriptors`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Found ${data.count || data.data?.length || 0} employees with descriptors`);
      return {
        success: true,
        data: data.data || data.employees || [],
        count: data.count || data.data?.length || 0
      }

    } catch (error) {
      console.error("Fetch employees with descriptors error:", error)
      return { success: false, error: error.message, data: [] }
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Clear landing image from cache
   */
  clearLandingImageFromCache(filename) {
    if (this.landingImageCache.has(filename)) {
      const cached = this.landingImageCache.get(filename)
      if (cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
          console.log(`[ProfileService] Revoked blob URL for landing image: ${filename}`)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
      this.landingImageCache.delete(filename)
    }
    
    // Also clear the list cache
    this.landingImageCache.delete('landing_images_list')
  }

  /**
   * Clear all landing images from cache
   */
  clearLandingImageCache() {
    this.landingImageCache.forEach((cached, key) => {
      if (cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
    })
    this.landingImageCache.clear()
    console.log('[ProfileService] Cleared all landing image cache')
  }

  /**
   * Clear gallery image from cache
   */
  clearGalleryImageFromCache(filename) {
    if (this.galleryImageCache.has(filename)) {
      const cached = this.galleryImageCache.get(filename)
      if (cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
          console.log(`[ProfileService] Revoked blob URL for gallery image: ${filename}`)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
      this.galleryImageCache.delete(filename)
    }
    
    // Also clear the list cache
    this.galleryImageCache.delete('gallery_images_list')
  }

  /**
   * Clear all gallery images from cache
   */
  clearGalleryImageCache() {
    this.galleryImageCache.forEach((cached, key) => {
      if (cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
    })
    this.galleryImageCache.clear()
    console.log('[ProfileService] Cleared all gallery image cache')
  }

  /**
   * Clear all caches (profiles, landing, gallery)
   */
  clearAllCaches() {
    this.clearProfileCache()
    this.clearLandingImageCache()
    this.clearGalleryImageCache()
    console.log('[ProfileService] Cleared all caches')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      profiles: this.profileCache.size,
      landingImages: this.landingImageCache.size,
      galleryImages: this.galleryImageCache.size,
      total: this.profileCache.size + this.landingImageCache.size + this.galleryImageCache.size
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only image files are allowed.")
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 10MB.")
    }
  }

  extractFilenameFromResponse(response) {
    const contentDisposition = response.headers.get('Content-Disposition')
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      if (filenameMatch) {
        return filenameMatch[1]
      }
    }
    return null
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  clearProfileCache() {
    this.profileCache.forEach((cached) => {
      if (cached.success && cached.url && cached.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cached.url)
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error)
        }
      }
    })
    this.profileCache.clear()
  }
}