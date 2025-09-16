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
    if (this.profileCache.has(uid)) {
      return this.profileCache.get(uid)
    }

    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (response.status === 404) {
        const result = { success: false, error: "No profile picture found" }
        this.profileCache.set(uid, result)
        return result
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        const result = { success: false, error: error.message }
        this.profileCache.set(uid, result)
        throw error
      }

      const blob = await response.blob()
      const result = {
        success: true,
        blob,
        url: URL.createObjectURL(blob)
      }

      this.profileCache.set(uid, result)
      return result

    } catch (error) {
      console.error("Profile picture fetch error:", error)
      const result = { success: false, error: error.message }
      this.profileCache.set(uid, result)
      throw error
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