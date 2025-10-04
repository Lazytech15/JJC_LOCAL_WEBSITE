import { getStoredToken, clearTokens } from "./auth.js"
import { io } from "socket.io-client"

export const API_ENDPOINTS = {
  public: "http://192.168.68.140:3001",
  // public: window.location.origin,
}

// Socket.IO connection
let socket = null
const socketListeners = new Map()

// Initialize Socket.IO connection
export const initializeSocket = () => {
  if (!socket) {
    socket = io(API_ENDPOINTS.public, {
      auth: {
        token: getStoredToken(),
      },
      transports: ["websocket", "polling"],
    })

    socket.on("connect", () => {
      console.log("[API] Socket connected:", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("[API] Socket disconnected")
    })

    socket.on("error", (error) => {
      console.error("[API] Socket error:", error)
    })

    // Handle real-time updates
    socket.on("employee_updated", (data) => {
      notifyListeners("employee_updated", data)
    })

    socket.on("employee_created", (data) => {
      notifyListeners("employee_created", data)
    })

    socket.on("employee_deleted", (data) => {
      notifyListeners("employee_deleted", data)
    })

    socket.on("recruitment_updated", (data) => {
      notifyListeners("recruitment_updated", data)
    })

    // Attendance WebSocket events
    socket.on("attendance_created", (data) => {
      notifyListeners("attendance_created", data)
    })

    socket.on("attendance_updated", (data) => {
      notifyListeners("attendance_updated", data)
    })

    socket.on("attendance_deleted", (data) => {
      notifyListeners("attendance_deleted", data)
    })

    socket.on("attendance_synced", (data) => {
      notifyListeners("attendance_synced", data)
    })

  }
  return socket
}

// Subscribe to real-time updates
export const subscribeToUpdates = (event, callback) => {
  if (!socketListeners.has(event)) {
    socketListeners.set(event, new Set())
  }
  socketListeners.get(event).add(callback)

  // Return unsubscribe function
  return () => {
    const listeners = socketListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }
}

// Notify all listeners for an event
const notifyListeners = (event, data) => {
  const listeners = socketListeners.get(event)
  if (listeners) {
    listeners.forEach((callback) => callback(data))
  }
}

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    socketListeners.clear()
  }
}

// Request queue for managing concurrent requests
const requestQueue = new Map()
const pendingRequests = new Set()

// Centralized API request handler
class APIService {
  constructor() {
    this.baseURL = API_ENDPOINTS.public
    this.defaultHeaders = {
      "Content-Type": "application/json",
    }
    this.profileCache = new Map()
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const requestId = `${options.method || "GET"}_${endpoint}_${Date.now()}`

    try {
      // Check if similar request is already pending
      const pendingKey = `${options.method || "GET"}_${endpoint}`
      if (pendingRequests.has(pendingKey) && options.deduplicate !== false) {
        console.log(`[API] Deduplicating request: ${pendingKey}`)
        return await this.waitForPendingRequest(pendingKey)
      }

      pendingRequests.add(pendingKey)

      const url = `${this.baseURL}${endpoint}`
      const config = {
        method: "GET",
        headers: { ...this.defaultHeaders },
        ...options,
      }

      // Add authentication if token exists
      const token = getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      console.log(`[API] Making request: ${config.method} ${url}`)

      const response = await fetch(url, config)

      // Handle authentication errors
      if (response.status === 401) {
        console.warn("[API] Authentication failed, clearing tokens")
        clearTokens()
        throw new Error("Authentication required")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      // Store successful response for deduplication
      requestQueue.set(pendingKey, data)

      // Emit socket event for successful operations
      if (socket && ["POST", "PUT", "DELETE"].includes(config.method)) {
        this.emitSocketUpdate(endpoint, config.method, data)
      }

      return data
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error)
      throw error
    } finally {
      pendingRequests.delete(`${options.method || "GET"}_${endpoint}`)
    }
  }

  // Wait for pending request to complete
  async waitForPendingRequest(pendingKey) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!pendingRequests.has(pendingKey)) {
          clearInterval(checkInterval)
          resolve(requestQueue.get(pendingKey))
        }
      }, 50)
    })
  }

  // Emit socket updates for real-time sync
  emitSocketUpdate(endpoint, method, data) {
    if (!socket) return

    if (endpoint.includes("/employees")) {
      if (method === "POST") {
        socket.emit("employee_created", data)
      } else if (method === "PUT") {
        socket.emit("employee_updated", data)
      } else if (method === "DELETE") {
        socket.emit("employee_deleted", data)
      }
    }
  }

  // Authentication methods
  async login(credentials) {
    const queryParams = new URLSearchParams(credentials).toString()
    return this.request(`/api/auth?${queryParams}`, {
      method: "GET",
    })
  }

  async refreshToken() {
    return this.request("/api/auth/refresh", {
      method: "POST",
    })
  }

  // Employee methods
  async getEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/employees?${queryParams}`)
  }

  async getEmployee(id) {
    return this.request(`/api/employees/${id}`)
  }

  async createEmployee(employeeData) {
    return this.request("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    })
  }

  // NEW: Add employee to emp_list table (alternative endpoint)
  async addEmployeeToEmpList(employeeData) {
    console.log("[API] Adding employee to emp_list:", employeeData)
    return this.request(`${API_ENDPOINTS.public}/api/add`, {
      method: "POST",
      body: JSON.stringify(employeeData),
    })
  }

  // NEW: Get employees from emp_list table
  async getEmpListEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/emp-list?${queryParams}`)
  }

  // NEW: Get specific employee from emp_list by uid
  async getEmpListEmployee(uid) {
    return this.request(`/api/emp-list/${uid}`)
  }

  // NEW: Update employee in emp_list table
  async updateEmpListEmployee(uid, employeeData) {
    return this.request(`/api/emp-list/${uid}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    })
  }

  // NEW: Delete/Deactivate employee in emp_list table
  async deleteEmpListEmployee(uid) {
    return this.request(`/api/emp-list/${uid}`, {
      method: "DELETE",
    })
  }

  async updateEmployee(id, employeeData) {
    return this.request(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    })
  }

  async deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, {
      method: "DELETE",
    })
  }

  // HR Department methods
  async getHRData() {
    return this.request("/api/tables/emp_list/data")
  }

  async addHREmployee(employeeData, userId) {
    return this.request("/api/data", {
      method: "POST",
      body: JSON.stringify({
        department: "hr",
        action: "add_employee",
        data: employeeData,
        user_id: userId,
      }),
    })
  }

  // Recruitment methods
  async getJobPostings(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/recruitment/jobs?${queryParams}`)
  }

  async createJobPosting(jobData) {
    return this.request("/api/recruitment/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    })
  }

  async updateJobPosting(id, jobData) {
    return this.request(`/api/recruitment/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    })
  }

  async deleteJobPosting(id) {
    return this.request(`/api/recruitment/jobs/${id}`, {
      method: "DELETE",
    })
  }

  async getApplications(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/recruitment/applications?${queryParams}`)
  }

  async updateApplicationStatus(id, status) {
    return this.request(`/api/recruitment/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }

  // Generic data methods for other departments
  async getDepartmentData(department, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/departments/${department}/data?${queryParams}`)
  }

  async submitDepartmentData(department, action, data, userId) {
    return this.request("/api/data", {
      method: "POST",
      body: JSON.stringify({
        department,
        action,
        data,
        user_id: userId,
      }),
    })
  }

  // Batch operations
  async batchRequest(requests) {
    return this.request("/api/batch", {
      method: "POST",
      body: JSON.stringify({ requests }),
    })
  }

  async uploadFile(file, endpoint = "/api/upload") {
    const formData = new FormData()
    formData.append("file", file)

    return this.request(endpoint, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        Authorization: `Bearer ${getStoredToken()}`,
      },
      body: formData,
    })
  }

  // ============================================================================
  // ENHANCED EMPLOYEE FILE METHODS
  // ============================================================================

  async getEmployeeFiles(userId) {
    console.log("[v0] APIService.getEmployeeFiles called with userId:", userId)

    try {
      const response = await fetch(`${this.baseURL}/api/files/employee/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[v0] Employee files result:", result)
      return result
    } catch (error) {
      console.error("[v0] Employee files fetch error:", error)
      throw error
    }
  }

  // Get employee profile picture by userId
  async getEmployeeProfile(userId) {
    console.log("APIService.getEmployeeProfile called with userId:", userId)

    try {
      const response = await fetch(`${this.baseURL}/api/files/employee/${userId}/profile`, {
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
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // If successful, return the URL (response will be redirected)
      return {
        success: true,
        url: `${this.baseURL}/api/files/employee/${userId}/profile`,
      }
    } catch (error) {
      console.error("Employee profile fetch error:", error)
      throw error
    }
  }

  // Get employee documents by userId
  async getEmployeeDocuments(userId) {
    console.log("APIService.getEmployeeDocuments called with userId:", userId)

    try {
      const response = await fetch(`${this.baseURL}/api/files/employee/${userId}/documents`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Employee documents result:", result)
      return result
    } catch (error) {
      console.error("Employee documents fetch error:", error)
      throw error
    }
  }

  async uploadProfilePicture(file, userId) {
    console.log("APIService.uploadProfilePicture called with:", { fileName: file.name, userId })

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

      console.log("Profile upload response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Profile upload error response:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Profile upload result:", result)

      return {
        ...result,
        databaseUpdated: true,
        message: "Profile picture uploaded and database updated successfully",
      }
    } catch (error) {
      console.error("Profile upload fetch error:", error)
      throw error
    }
  }

  async uploadDocument(file, userId) {
    console.log("APIService.uploadDocument called with:", { fileName: file.name, userId })

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

      console.log("Document upload response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Document upload error response:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Document upload result:", result)

      return {
        ...result,
        databaseUpdated: true,
        message: "Document uploaded and database updated successfully",
      }
    } catch (error) {
      console.error("Document upload fetch error:", error)
      throw error
    }
  }

  // ============================================================================
  // FILE SERVING METHODS - USING RELATIVE PATHS
  // ============================================================================

  // Get file URL using relative path (works for both profiles and documents)
  getFileUrl(relativePath) {
    if (!relativePath) return null

    const cleanPath = relativePath.replace(/^\/+/, "")
    return `${this.baseURL}/api/files/serve/${encodeURIComponent(cleanPath)}`
  }

  // Legacy method: Get profile picture URL using userId and filename
  getProfilePictureUrl(userId, filename) {
    const relativePath = `${userId}/profiles/${filename}`
    return this.getFileUrl(relativePath)
  }

  // Legacy method: Get document URL using userId and filename
  getDocumentUrl(userId, filename) {
    const relativePath = `${userId}/documents/${filename}`
    return this.getFileUrl(relativePath)
  }

  // ============================================================================
  // FILE MANAGEMENT METHODS - USING NEW SYSTEM
  // ============================================================================

  // Get file info by relative path
  async getFileInfo(relativePath) {
    return this.request(`/api/files/info/${encodeURIComponent(relativePath)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })
  }

  // Delete file by relative path
  async deleteFile(relativePath) {
    return this.request(`/api/files/serve/${encodeURIComponent(relativePath)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })
  }

  // Get all files for a user (profiles + documents)
  async getAllUserFiles(userId) {
    return this.request(`/api/files/user/${userId}/files`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })
  }

  // Legacy methods for backward compatibility
  async getProfilePictureList(userId) {
    const result = await this.getAllUserFiles(userId)
    return {
      success: result.success,
      data: result.data.profiles || [],
    }
  }

  async getDocumentList(userId) {
    const result = await this.getAllUserFiles(userId)
    return {
      success: result.success,
      data: result.data.documents || [],
    }
  }

  // Delete profile picture (using relative path)
  async deleteProfilePicture(userId, filename) {
    const relativePath = `${userId}/profiles/${filename}`
    return this.deleteFile(relativePath)
  }

  // Delete document (using relative path)
  async deleteDocument(userId, filename) {
    const relativePath = `${userId}/documents/${filename}`
    return this.deleteFile(relativePath)
  }

  // ============================================================================
  // DOWNLOAD METHODS
  // ============================================================================

  // Download file as blob using relative path
  async downloadFile(relativePath) {
    try {
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
    } catch (error) {
      console.error("Error downloading file:", error)
      throw error
    }
  }

  // Download profile picture as blob (for programmatic use)
  async downloadProfilePicture(userId, filename) {
    const relativePath = `${userId}/profiles/${filename}`
    return this.downloadFile(relativePath)
  }

  // Download document as blob (for programmatic use)
  async downloadDocument(userId, filename) {
    const relativePath = `${userId}/documents/${filename}`
    return this.downloadFile(relativePath)
  }

  // ============================================================================
  // MULTIPLE FILE OPERATIONS
  // ============================================================================

  // Upload multiple files for a user
  async uploadMultipleFiles(userId, files, type = "document") {
    const results = []

    for (const file of files) {
      try {
        let result
        if (type === "profile") {
          result = await this.uploadProfilePicture(file, userId)
        } else {
          result = await this.uploadDocument(file, userId)
        }
        results.push({ file: file.name, success: true, data: result })
      } catch (error) {
        results.push({ file: file.name, success: false, error: error.message })
      }
    }

    return results
  }

  // Batch delete files using relative paths
  async deleteMultipleFiles(relativePaths) {
    const results = []

    for (const relativePath of relativePaths) {
      try {
        const result = await this.deleteFile(relativePath)
        results.push({ relativePath, success: true, data: result })
      } catch (error) {
        results.push({ relativePath, success: false, error: error.message })
      }
    }

    return results
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Get user file summary (using new endpoint)
  async getUserFileSummary(userId) {
    const result = await this.getAllUserFiles(userId)
    if (!result.success) {
      throw new Error("Failed to get user files")
    }

    const { profiles, documents, totalFiles } = result.data

    // Calculate total size
    const totalSize = [...profiles, ...documents].reduce((sum, file) => sum + (file.size || 0), 0)

    return {
      success: true,
      data: {
        totalFiles,
        profileCount: profiles.length,
        documentCount: documents.length,
        totalSize,
        profiles,
        documents,
      },
    }
  }

  // Check if file exists by relative path
  async hasFile(relativePath) {
    try {
      const info = await this.getFileInfo(relativePath)
      return info.success
    } catch (error) {
      console.error("Error checking file existence:", error)
      return false
    }
  }

  // Check if profile picture exists for user
  async hasProfilePicture(userId, filename) {
    const relativePath = `${userId}/profiles/${filename}`
    return this.hasFile(relativePath)
  }

  // Check if document exists for user
  async hasDocument(userId, filename) {
    const relativePath = `${userId}/documents/${filename}`
    return this.hasFile(relativePath)
  }

  // Create file preview for display using relative path
  async createFilePreview(relativePath) {
    try {
      const blob = await this.downloadFile(relativePath)
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Error creating file preview:", error)
      throw error
    }
  }

  // Check user storage usage
  async getUserStorageInfo(userId) {
    try {
      const summary = await this.getUserFileSummary(userId)
      const totalSizeBytes = summary.data.totalSize
      const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2)

      // Assume 100MB limit per user (adjust as needed)
      const limitMB = 100
      const usagePercentage = ((totalSizeMB / limitMB) * 100).toFixed(1)

      return {
        success: true,
        data: {
          totalSizeBytes,
          totalSizeMB: Number.parseFloat(totalSizeMB),
          limitMB,
          usagePercentage: Number.parseFloat(usagePercentage),
          remainingMB: Math.max(0, limitMB - totalSizeMB),
          isNearLimit: usagePercentage > 80,
          isOverLimit: usagePercentage > 100,
        },
      }
    } catch (error) {
      console.error("Error checking user storage:", error)
      throw error
    }
  }

  // Get file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Create a preview URL for images (with error handling)
  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("File is not an image"))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsDataURL(file)
    })
  }

  // Validate file type
  validateFileType(file, type = "image") {
    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    const documentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]

    if (type === "image") {
      return imageTypes.includes(file.type)
    } else if (type === "document") {
      return documentTypes.includes(file.type)
    }

    return false
  }

  // Validate file size
  validateFileSize(file, maxSizeInMB, type = "image") {
    const defaultMaxSize = type === "image" ? 5 : 10 // 5MB for images, 10MB for documents
    const maxSize = (maxSizeInMB || defaultMaxSize) * 1024 * 1024 // Convert to bytes
    return file.size <= maxSize
  }

  // ============================================================================
  // BACKWARD COMPATIBILITY METHODS
  // ============================================================================

  // Legacy method: Get employee profile URL (if you have employeeId to userId mapping)
  getEmployeeProfileUrl(employeeId) {
    console.warn("getEmployeeProfileUrl is deprecated. Use getFileUrl with relative path instead.")
    // This would need to be implemented based on your employee-to-user mapping
    return `${this.baseURL}/api/files/profiles/employee/${employeeId}`
  }

  // Legacy method: Get employee profile info
  async getEmployeeProfileInfo(employeeId) {
    console.warn("getEmployeeProfileInfo is deprecated. Use getFileInfo with relative path instead.")
    return this.request(`/api/files/profiles/employee/${employeeId}/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })
  }

  // Legacy method: Get all users with files (if needed for admin)
  async getAllUsersWithFiles() {
    // This would need to be implemented if you want to list all users with files
    console.warn("getAllUsersWithFiles is not implemented in the new system")
    throw new Error("getAllUsersWithFiles is not implemented in the new system")
  }

  // ============================================================================
  // ATTENDANCE METHODS
  // ============================================================================

  async getAttendanceRecords(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance?${queryParams}`)
  }

  async getAttendanceStats(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/stats?${queryParams}`)
  }

  async createAttendanceRecord(attendanceData) {
    return this.request("/api/attendance/record", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    })
  }

  async updateAttendanceRecord(id, attendanceData) {
    return this.request(`/api/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(attendanceData),
    })
  }

  async deleteAttendanceRecord(id) {
    return this.request(`/api/attendance/${id}`, {
      method: "DELETE",
    })
  }

  async getAttendanceRecord(id) {
    return this.request(`/api/attendance/${id}`)
  }

  async getEmployeeAttendance(employee_uid, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/employee/${employee_uid}?${queryParams}`)
  }

  async getEmployeeAttendanceSummary(employee_uid, params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/summary/${employee_uid}?${queryParams}`)
  }

  async getUnsyncedAttendance(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/attendance/unsynced?${queryParams}`)
  }

  async markAttendanceSynced(record_ids) {
    return this.request("/api/attendance/mark-synced", {
      method: "POST",
      body: JSON.stringify({ record_ids }),
    })
  }

  async syncAttendanceRecords(attendance_data) {
    return this.request("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ attendance_data }),
    })
  }

  // ============================================================================
  // PROFILE PICTURE METHODS (NEW ENDPOINTS)
  // ============================================================================

  // Get profile picture by employee UID with proper caching
  async getProfileByUid(uid) {
    console.log("APIService.getProfileByUid called with uid:", uid)

    // Check cache first
    if (this.profileCache.has(uid)) {
      const cached = this.profileCache.get(uid)
      // Return cached result (could be success or failure)
      return cached
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
        this.profileCache.set(uid, result) // Cache the failure
        return result
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        const result = { success: false, error: error.message }
        this.profileCache.set(uid, result) // Cache the failure
        throw error
      }

      // Return the image blob for display
      const blob = await response.blob()
      const result = {
        success: true,
        blob,
        url: URL.createObjectURL(blob)
      }

      // Cache the successful result
      this.profileCache.set(uid, result)
      return result

    } catch (error) {
      console.error("Profile picture fetch error:", error)
      const result = { success: false, error: error.message }
      this.profileCache.set(uid, result) // Cache the failure
      throw error
    }
  }

  // Get profile picture information by employee UID
  async getProfileInfoByUid(uid) {
    console.log("APIService.getProfileInfoByUid called with uid:", uid)

    return this.request(`/api/profile/${uid}/info`, {
      method: "GET",
    })
  }

  // Get specific profile picture file by UID and filename
  async getSpecificProfileByUid(uid, filename) {
    console.log("APIService.getSpecificProfileByUid called with:", { uid, filename })

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

      // Return the image blob
      const blob = await response.blob()
      return {
        success: true,
        blob,
        url: URL.createObjectURL(blob)
      }
    } catch (error) {
      console.error("Specific profile picture fetch error:", error)
      throw error
    }
  }

  // Method to clear profile cache (call this when user logs out or data refreshes)
  clearProfileCache() {
    // Clean up any blob URLs before clearing
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

  // Method to remove specific UID from cache (useful for updates)
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

  // Upload profile picture for employee UID (keeps existing pictures)
  async uploadProfileByUid(uid, file, onProgress = null) {
  console.log("APIService.uploadProfileByUid called with:", { uid, fileName: file?.name })

  if (!file) {
    throw new Error("No file provided for upload")
  }

  // Validate file type on client side
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only image files are allowed.")
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error("File size too large. Maximum size is 10MB.")
  }

  const formData = new FormData()
  formData.append('profile_picture', file)

  try {
    const response = await fetch(`${API_ENDPOINTS.public}/api/profile/${uid}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    // Clear the cached profile for this UID since we uploaded a new one
    // Use apiService instance instead of this
    apiService.clearProfileFromCache(uid)

    console.log("Profile picture uploaded successfully:", result)
    return result

  } catch (error) {
    console.error("Profile picture upload error:", error)
    throw error
  }
}

  // Upload and replace profile picture for employee UID (deletes existing pictures)
  async uploadReplaceProfileByUid(uid, file, onProgress = null) {
    console.log("APIService.uploadReplaceProfileByUid called with:", { uid, fileName: file?.name })

    if (!file) {
      throw new Error("No file provided for upload")
    }

    // Validate file type on client side
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only image files are allowed.")
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 10MB.")
    }

    const formData = new FormData()
    formData.append('profile_picture', file)

    try {
      const response = await fetch(`${this.baseURL}/api/profile/${uid}/upload-replace`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Clear the cached profile for this UID since we replaced it
      apiService.clearProfileFromCache(uid)

      console.log("Profile picture uploaded and replaced successfully:", result)
      return result

    } catch (error) {
      console.error("Profile picture upload-replace error:", error)
      throw error
    }
  }

  // Upload profile picture with progress tracking (XMLHttpRequest version)
  async uploadProfileByUidWithProgress(uid, file, onProgress = null) {
    console.log("APIService.uploadProfileByUidWithProgress called with:", { uid, fileName: file?.name })

    if (!file) {
      throw new Error("No file provided for upload")
    }

    // Validate file type on client side
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only image files are allowed.")
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 10MB.")
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('profile_picture', file)

      // Set up progress tracking
      if (onProgress && typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            onProgress(percentComplete)
          }
        })
      }

      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText)

            // Clear the cached profile for this UID since we uploaded a new one
            apiService.clearProfileFromCache(uid)

            console.log("Profile picture uploaded successfully:", result)
            resolve(result)
          } else {
            const errorData = JSON.parse(xhr.responseText || '{}')
            reject(new Error(errorData.error || `HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        } catch (error) {
          reject(new Error("Failed to parse response"))
        }
      }

      xhr.onerror = () => {
        reject(new Error("Network error occurred during upload"))
      }

      xhr.ontimeout = () => {
        reject(new Error("Upload request timed out"))
      }

      // Set up the request
      xhr.open('POST', `${this.baseURL}/api/profile/${uid}/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${getStoredToken()}`)
      xhr.timeout = 60000 // 60 second timeout

      // Send the request
      xhr.send(formData)
    })
  }

  // Upload and replace with progress tracking (XMLHttpRequest version)
  async uploadReplaceProfileByUidWithProgress(uid, file, onProgress = null) {
    console.log("APIService.uploadReplaceProfileByUidWithProgress called with:", { uid, fileName: file?.name })

    if (!file) {
      throw new Error("No file provided for upload")
    }

    // Validate file type on client side
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only image files are allowed.")
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum size is 10MB.")
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('profile_picture', file)

      // Set up progress tracking
      if (onProgress && typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            onProgress(percentComplete)
          }
        })
      }

      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText)

            // Clear the cached profile for this UID since we replaced it
            apiService.clearProfileFromCache(uid)

            console.log("Profile picture uploaded and replaced successfully:", result)
            resolve(result)
          } else {
            const errorData = JSON.parse(xhr.responseText || '{}')
            reject(new Error(errorData.error || `HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        } catch (error) {
          reject(new Error("Failed to parse response"))
        }
      }

      xhr.onerror = () => {
        reject(new Error("Network error occurred during upload"))
      }

      xhr.ontimeout = () => {
        reject(new Error("Upload request timed out"))
      }

      // Set up the request
      xhr.open('POST', `${this.baseURL}/api/profile/${uid}/upload-replace`)
      xhr.setRequestHeader('Authorization', `Bearer ${getStoredToken()}`)
      xhr.timeout = 60000 // 60 second timeout

      // Send the request
      xhr.send(formData)
    })
  }

  // Delete profile picture by UID and filename
  async deleteProfileByUid(uid, filename) {
    console.log("APIService.deleteProfileByUid called with:", { uid, filename })

    const result = await this.request(`/api/profile/${uid}/${filename}`, {
      method: "DELETE",
    })

    // Clear the cached profile for this UID since we deleted a picture
    apiService.clearProfileFromCache(uid)

    return result
  }

  // Get profile picture URL by UID (direct URL for img src)
  getProfileUrlByUid(uid) {
    return `${this.baseURL}/api/profile/${uid}`
  }

  // Get specific profile picture URL by UID and filename
  getSpecificProfileUrlByUid(uid, filename) {
    return `${this.baseURL}/api/profile/${uid}/${filename}`
  }

  // Check if profile picture exists for employee UID
  async hasProfileByUid(uid) {
    try {
      const info = await this.getProfileInfoByUid(uid)
      return info.success && info.data && info.data.profile_pictures.length > 0
    } catch (error) {
      console.error("Error checking profile existence:", error)
      return false
    }
  }

  // Get profile picture as blob for download
  async downloadProfileByUid(uid, filename = null) {
    try {
      const url = filename
        ? `${this.baseURL}/api/profile/${uid}/${filename}`
        : `${this.baseURL}/api/profile/${uid}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.error("Error downloading profile picture:", error)
      throw error
    }
  }

}

// Create singleton instance
const apiService = new APIService()

// Export the service instance and individual methods for convenience
export default apiService

// Convenience exports for direct method access
export const {
  login,
  refreshToken,
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  // NEW: EMP_LIST methods
  addEmployeeToEmpList,
  getEmpListEmployees,
  getEmpListEmployee,
  updateEmpListEmployee,
  deleteEmpListEmployee,
  getHRData,
  addHREmployee,
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getApplications,
  updateApplicationStatus,
  getDepartmentData,
  submitDepartmentData,
  batchRequest,
  uploadFile,
  // Updated file methods
  uploadProfilePicture,
  uploadDocument,
  getFileUrl,
  getProfilePictureUrl,
  getDocumentUrl,
  deleteProfilePicture,
  deleteDocument,
  getAllUserFiles,
  getUserFileSummary,
  downloadFile,
  downloadProfilePicture,
  downloadDocument,
  // Enhanced employee file methods
  getEmployeeFiles,
  getEmployeeProfile,
  getEmployeeDocuments,
  // Attendance methods
  getAttendanceRecords,
  getAttendanceStats,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceRecord,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
  getUnsyncedAttendance,
  markAttendanceSynced,
  syncAttendanceRecords,
  // Profile picture methods (by UID)
  getProfileByUid,
  getProfileInfoByUid,
  getSpecificProfileByUid,
  uploadProfileByUid,
  uploadReplaceProfileByUid,
  uploadProfileByUidWithProgress,
  uploadReplaceProfileByUidWithProgress,
  deleteProfileByUid,
  getProfileUrlByUid,
  getSpecificProfileUrlByUid,
  hasProfileByUid,
  downloadProfileByUid,
} = apiService

// Initialize socket connection when module loads
if (typeof window !== "undefined") {
  initializeSocket()
}

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    disconnectSocket()
  })
}