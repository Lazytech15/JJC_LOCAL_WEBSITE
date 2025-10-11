// ============================================================================
// api-service.js - Main service aggregator
// ============================================================================
import { AuthService } from "./services/auth-service.js"
import { EmployeeService } from "./services/employee-service.js"
import { FileService } from "./services/file-service.js"
import { ProfileService } from "./services/profile-service.js"
import { AttendanceService } from "./services/attendance-service.js"
import { RecruitmentService } from "./services/recruitment-service.js"
import { PollingManager } from "./websocket/polling-manager.jsx"
import { DocumentService } from "./services/document-service.js"
import { DailySummaryService } from "./services/daily-summary-service.js"
import { ItemsService } from "./services/items-service.js"
import { PurchaseOrdersService } from "./services/purchase-orders-service.js"
import { SuppliersService } from "./services/suppliers-service.js"
import { EmployeeLogsService } from "./services/employee-logs-service.js"
import { AttendanceEditService } from "./services/attendance-edit-service.js"

class APIService {
  constructor() {
    // Initialize all service modules
    this.auth = new AuthService()
    this.employees = new EmployeeService()
    this.files = new FileService()
    this.profiles = new ProfileService()
    this.attendance = new AttendanceService()
    this.recruitment = new RecruitmentService()
    this.socket = new PollingManager()
    this.document = new DocumentService()
    this.summary = new DailySummaryService()
    this.items = new ItemsService()
    this.purchaseOrders = new PurchaseOrdersService()
    this.suppliers = new SuppliersService()
    this.employeeLogs = new EmployeeLogsService()
    this.editAttendance = new AttendanceEditService()
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
  document,
  summary,
  items,
  purchaseOrders,
  employeeLogs,
  editAttendance,
  suppliers
} = apiService
