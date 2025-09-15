// ============================================================================
// api-service.js - Main service aggregator
// ============================================================================
import { AuthService } from "./services/auth-service.js"
import { EmployeeService } from "./services/employee-service.js"
import { FileService } from "./services/file-service.js"
import { ProfileService } from "./services/profile-service.js"
import { AttendanceService } from "./services/attendance-service.js"
import { RecruitmentService } from "./services/recruitment-service.js"
import { SocketManager } from "./websocket/socket-manager.js"
import { DocumentService } from "./services/document-service.js"

class APIService {
  constructor() {
    // Initialize all service modules
    this.auth = new AuthService()
    this.employees = new EmployeeService()
    this.files = new FileService()
    this.profiles = new ProfileService()
    this.attendance = new AttendanceService()
    this.recruitment = new RecruitmentService()
    this.socket = new SocketManager()
    this.document = new DocumentService()
    
  }

  // Initialize all services
  initialize() {
    this.socket.initialize()
  }

  // Cleanup method
  cleanup() {
    this.socket.disconnect()
    this.profiles.clearProfileCache()
  }
}

// Create and export singleton instance
const apiService = new APIService()

// Initialize services
if (typeof window !== "undefined") {
  apiService.initialize()

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    apiService.cleanup()
  })
}

export default apiService

// Export individual services for direct access if needed
export const {
  auth,
  employees,
  files,
  profiles,
  attendance,
  recruitment,
  socket,
  document
} = apiService