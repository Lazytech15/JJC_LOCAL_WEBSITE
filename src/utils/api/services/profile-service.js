// ============================================================================
// services/profile-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"

export class ProfileService extends BaseAPIService {
  constructor() {
    super()
    this.profileCache = new Map()
  }

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

// Simplified method to just get the URL without fetching
getProfileUrlByUid(uid) {
  // Returns the direct URL that will be cached by service worker
  return `${this.baseURL}/api/profile/${uid}`
}

// Method to check if profile exists
async checkProfileExists(uid) {
  try {
    const response = await fetch(`${this.baseURL}/api/profile/${uid}/info`, {
      method: "HEAD", // Just check headers, don't download
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    return response.ok
  } catch (error) {
    return false
  }
}

// Clear specific profile from service worker cache
clearProfileFromServiceWorker(uid) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_PROFILE',
      uid: uid
    })
  }
}

// Clear all profiles from service worker cache
clearAllProfilesFromServiceWorker() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_PROFILE_CACHE'
    })
  }
}

// Updated clearProfileFromCache to also clear service worker
clearProfileFromCache(uid) {
  // Clear from local cache if exists
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

  // Clear from service worker cache
  this.clearProfileFromServiceWorker(uid)
}

// Preload profile picture (triggers service worker caching)
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

      // Return the response blob for download
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
        include_summary: options.include_summary !== false, // Default true
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

      // Return the response blob for download
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

      // Clear the profile from cache since it was deleted
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

  /**
   * Get face descriptor for an employee
   * @param {number} uid - Employee UID
   * @returns {Promise<Object>} Response with descriptor data
   */
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

  /**
   * Save face descriptor for an employee
   * @param {number} uid - Employee UID
   * @param {Array<number>} descriptor - 128-dimensional face descriptor array
   * @returns {Promise<Object>} Response indicating success/failure
   */
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

  /**
   * Update existing face descriptor for an employee
   * @param {number} uid - Employee UID
   * @param {Array<number>} descriptor - 128-dimensional face descriptor array
   * @returns {Promise<Object>} Response indicating success/failure
   */
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

  /**
   * Delete face descriptor for an employee
   * @param {number} uid - Employee UID
   * @returns {Promise<Object>} Response indicating success/failure
   */
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

  /**
   * Get all employees with face descriptors
   * @returns {Promise<Object>} Response with list of employees having descriptors
   */
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

  // Utility method to extract filename from response headers
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

  // Utility method to trigger file download in browser
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
  }

  getProfileUrlByUid(uid) {
    return `${this.baseURL}/api/profile/${uid}`
  }
}