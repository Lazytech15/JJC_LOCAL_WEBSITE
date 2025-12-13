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
import { AnnouncementService } from "./services/announcement-service.js"
import { OperationsService } from "./services/operation-service.js"
import { EmailService } from "./services/email-service.js"
import { MaterialsService } from "./services/Materials-service.js"
import { EmployeeInventoryService } from "./services/employee-inventory-service.js"


class APIService {
  constructor() {
    // Initialize all service modules
    this.auth = new AuthService()
    this.employees = new EmployeeService()
    this.files = new FileService()
    this.profiles = new ProfileService()
    this.attendance = new AttendanceService()
    this.recruitment = new RecruitmentService()
    this._socket = null // Lazy initialization to prevent circular dependency
    this.document = new DocumentService()
    this.summary = new DailySummaryService()
    this.items = new ItemsService()
    this.purchaseOrders = new PurchaseOrdersService()
    this.suppliers = new SuppliersService()
    this.employeeLogs = new EmployeeLogsService()
    this.editAttendance = new AttendanceEditService()
    this.announcements = new AnnouncementService()
    this.operations = new OperationsService()
    this.email = new EmailService()
    this.materials = new MaterialsService()
    this.employeeInventory = new EmployeeInventoryService()
  }

  // Lazy initialization for socket to avoid circular dependency issues
  get socket() {
    if (!this._socket) {
      this._socket = new PollingManager()
    }
    return this._socket
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

// Initialize services after a microtask to ensure all modules are loaded
if (typeof window !== "undefined") {
  // Delay initialization to avoid circular dependency issues
  queueMicrotask(() => {
    apiService.initialize()
  })

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    apiService.cleanup()
  })
}

export default apiService

// Export individual services for direct access if needed
// Note: socket is excluded from destructuring to maintain lazy initialization
export const {
  auth,
  employees,
  files,
  profiles,
  attendance,
  recruitment,
  document,
  summary,
  items,
  purchaseOrders,
  employeeLogs,
  editAttendance,
  suppliers,
  announcements,
  operations,
  email,
  materials,
  employeeInventory
} = apiService

// Export socket separately to maintain lazy initialization
export const getSocket = () => apiService.socket