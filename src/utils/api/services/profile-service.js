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