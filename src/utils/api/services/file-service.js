// ============================================================================
// services/file-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"
import { getStoredToken } from "../../auth.js"

export class FileService extends BaseAPIService {
  constructor() {
    super()
    this.profileCache = new Map()
  }

  // File URL generation
  getFileUrl(relativePath) {
    if (!relativePath) return null
    const cleanPath = relativePath.replace(/^\/+/, "")
    return `${this.baseURL}/api/files/serve/${encodeURIComponent(cleanPath)}`
  }

  getProfilePictureUrl(userId, filename) {
    const relativePath = `${userId}/profiles/${filename}`
    return this.getFileUrl(relativePath)
  }

  getDocumentUrl(userId, filename) {
    const relativePath = `${userId}/documents/${filename}`
    return this.getFileUrl(relativePath)
  }

  // Upload methods with proper error handling
  async uploadProfilePicture(file, userId) {
    const formData = new FormData()
    formData.append("profilePicture", file)
    formData.append("userId", userId.toString())

    try {
      const response = await fetch(`${this.baseURL}/api/uploads/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Profile picture upload error:", error)
      throw error
    }
  }

  async uploadDocument(file, userId) {
    const formData = new FormData()
    formData.append("document", file)
    formData.append("userId", userId.toString())

    try {
      const response = await fetch(`${this.baseURL}/api/uploads/document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Document upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      // Ensure consistent response format
      if (result.success) {
        return {
          success: true,
          data: {
            filename: result.data?.filename || result.filename,
            originalName: result.data?.originalName || result.originalName || file.name,
            size: result.data?.size || file.size,
            mimetype: result.data?.mimetype || file.type,
            path: result.data?.path || result.path
          }
        }
      } else {
        throw new Error(result.error || "Document upload failed")
      }
    } catch (error) {
      console.error("Document upload error:", error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // File management
  async deleteFile(relativePath) {
    return this.request(`/api/files/serve/${encodeURIComponent(relativePath)}`, {
      method: "DELETE",
    })
  }

  async getAllUserFiles(userId) {
    return this.request(`/api/files/user/${userId}/files`)
  }

  async downloadFile(relativePath) {
    const response = await fetch(`${this.baseURL}/api/files/serve/${encodeURIComponent(relativePath)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  // Get file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Validate file type
  validateFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type)
  }

  // Validate file size
  validateFileSize(file, maxSizeInBytes) {
    return file.size <= maxSizeInBytes
  }
}