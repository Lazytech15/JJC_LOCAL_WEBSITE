// services/employee-inventory-service.js
import { BaseAPIService } from "../core/base-api.js"

export class EmployeeInventoryService extends BaseAPIService {
  constructor() {
    super()
    this.endpoint = "/api/employee-inventory"
  }

  // ============================================================================
  // GET Operations
  // ============================================================================

  /**
   * Get all checkouts with filtering and pagination
   */
  async getAllCheckouts(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 100,
      offset: params.offset || 0,
      ...(params.status && { status: params.status }),
      ...(params.employee_uid && { employee_uid: params.employee_uid }),
      ...(params.date_from && { date_from: params.date_from }),
      ...(params.date_to && { date_to: params.date_to }),
      ...(params.search && { search: params.search }),
    })

    return this.request(`${this.endpoint}?${queryParams}`)
  }

  /**
   * Get single checkout by ID
   */
  async getCheckoutById(id) {
    return this.request(`${this.endpoint}/${id}`)
  }

  /**
   * Get all checkouts for specific employee
   */
  async getEmployeeInventory(employeeUid, params = {}) {
    const queryParams = new URLSearchParams({
      include_completed: params.includeCompleted || "false",
      ...(params.status && { status: params.status }),
    })

    return this.request(`${this.endpoint}/employee/${employeeUid}?${queryParams}`)
  }

  /**
   * Get all overdue checkouts
   */
  async getOverdueCheckouts() {
    return this.request(`${this.endpoint}/overdue`)
  }

  /**
   * Get all active checkouts (not completed)
   */
  async getActiveCheckouts() {
    return this.request(`${this.endpoint}/active`)
  }

  /**
   * Get inventory statistics
   */
  async getStatistics() {
    return this.request(`${this.endpoint}/statistics`)
  }

  // ============================================================================
  // POST Operations
  // ============================================================================

  /**
   * Create new checkout
   */
  async createCheckout(checkoutData) {
    const requiredFields = ["employee_uid", "employee_barcode", "employee_name", "material_name", "quantity_checked_out"]

    for (const field of requiredFields) {
      if (!checkoutData[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    return this.request(`${this.endpoint}/checkout`, {
      method: "POST",
      body: JSON.stringify(checkoutData),
    })
  }

  /**
   * Bulk checkout multiple items
   */
  async bulkCheckout(checkouts, checkoutBy = null) {
    if (!Array.isArray(checkouts) || checkouts.length === 0) {
      throw new Error("Checkouts array is required and must not be empty")
    }

    return this.request(`${this.endpoint}/bulk-checkout`, {
      method: "POST",
      body: JSON.stringify({
        checkouts,
        checkout_by: checkoutBy,
      }),
    })
  }

  /**
   * Process return of checked out item
   */
  async processReturn(checkoutId, returnData) {
    if (!returnData.quantity_returned || returnData.quantity_returned <= 0) {
      throw new Error("Valid return quantity is required")
    }

    return this.request(`${this.endpoint}/return/${checkoutId}`, {
      method: "POST",
      body: JSON.stringify({
        quantity_returned: returnData.quantity_returned,
        return_condition: returnData.return_condition || "good",
        return_notes: returnData.return_notes || null,
      }),
    })
  }

  /**
   * Mark quantity as used (consumed)
   */
  async markAsUsed(checkoutId, quantityUsed, notes = null) {
    if (!quantityUsed || quantityUsed <= 0) {
      throw new Error("Valid quantity is required")
    }

    return this.request(`${this.endpoint}/mark-used/${checkoutId}`, {
      method: "POST",
      body: JSON.stringify({
        quantity_used: quantityUsed,
        notes,
      }),
    })
  }

  /**
   * Mark item as lost
   */
  async markAsLost(checkoutId, notes = "Marked as lost") {
    return this.request(`${this.endpoint}/mark-lost/${checkoutId}`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    })
  }

  // ============================================================================
  // PUT Operations
  // ============================================================================

  /**
   * Update checkout details
   */
  async updateCheckout(checkoutId, updateData) {
    const allowedFields = [
      "expected_return_date",
      "purpose",
      "project_name",
      "checkout_notes",
      "return_notes",
      "unit_cost",
      "replacement_cost",
      "accountability_status",
    ]

    const filteredData = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    }

    if (Object.keys(filteredData).length === 0) {
      throw new Error("No valid fields to update")
    }

    return this.request(`${this.endpoint}/${checkoutId}`, {
      method: "PUT",
      body: JSON.stringify(filteredData),
    })
  }

  // ============================================================================
  // DELETE Operations
  // ============================================================================

  /**
   * Delete checkout
   */
  async deleteCheckout(checkoutId) {
    return this.request(`${this.endpoint}/${checkoutId}`, {
      method: "DELETE",
    })
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Calculate current balance for a checkout
   */
  calculateBalance(checkout) {
    return checkout.quantity_checked_out - checkout.quantity_returned - checkout.quantity_used
  }

  /**
   * Check if checkout is overdue
   */
  isOverdue(checkout) {
    if (!checkout.expected_return_date) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expectedDate = new Date(checkout.expected_return_date)
    expectedDate.setHours(0, 0, 0, 0)
    
    return expectedDate < today && !checkout.is_completed
  }

  /**
   * Calculate days overdue
   */
  getDaysOverdue(checkout) {
    if (!this.isOverdue(checkout)) return 0
    
    const today = new Date()
    const expectedDate = new Date(checkout.expected_return_date)
    const diffTime = Math.abs(today - expectedDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  /**
   * Format checkout status for display
   */
  formatStatus(status) {
    const statusMap = {
      checked_out: "Checked Out",
      partially_returned: "Partially Returned",
      fully_returned: "Fully Returned",
      completed: "Completed",
      overdue: "Overdue",
      lost: "Lost",
    }

    return statusMap[status] || status
  }

  /**
   * Get status color class
   */
  getStatusColor(status) {
    const colorMap = {
      checked_out: "blue",
      partially_returned: "yellow",
      fully_returned: "green",
      completed: "green",
      overdue: "red",
      lost: "red",
    }

    return colorMap[status] || "gray"
  }

  /**
   * Format accountability status
   */
  formatAccountabilityStatus(status) {
    const statusMap = {
      pending: "Pending",
      cleared: "Cleared",
      overdue: "Overdue",
      lost: "Lost",
    }

    return statusMap[status] || status
  }

  /**
   * Get accountability status color
   */
  getAccountabilityColor(status) {
    const colorMap = {
      pending: "yellow",
      cleared: "green",
      overdue: "red",
      lost: "red",
    }

    return colorMap[status] || "gray"
  }

  /**
   * Format return condition
   */
  formatReturnCondition(condition) {
    const conditionMap = {
      good: "Good Condition",
      damaged: "Damaged",
      partial: "Partial Return",
      not_returned: "Not Returned",
    }

    return conditionMap[condition] || condition
  }

  /**
   * Validate checkout data before submission
   */
  validateCheckoutData(data) {
    const errors = []

    if (!data.employee_uid) errors.push("Employee UID is required")
    if (!data.employee_barcode) errors.push("Employee barcode is required")
    if (!data.employee_name) errors.push("Employee name is required")
    if (!data.material_name) errors.push("Material name is required")
    if (!data.quantity_checked_out || data.quantity_checked_out <= 0) {
      errors.push("Valid quantity is required")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Generate checkout report data
   */
  generateReportData(checkouts) {
    const report = {
      total_checkouts: checkouts.length,
      total_quantity: checkouts.reduce((sum, c) => sum + parseFloat(c.quantity_checked_out || 0), 0),
      total_value: checkouts.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0),
      active_count: checkouts.filter((c) => !c.is_completed).length,
      completed_count: checkouts.filter((c) => c.is_completed).length,
      overdue_count: checkouts.filter((c) => this.isOverdue(c)).length,
      by_status: {},
      by_employee: {},
      by_material: {},
    }

    // Group by status
    checkouts.forEach((checkout) => {
      report.by_status[checkout.status] = (report.by_status[checkout.status] || 0) + 1
    })

    // Group by employee
    checkouts.forEach((checkout) => {
      if (!report.by_employee[checkout.employee_name]) {
        report.by_employee[checkout.employee_name] = {
          count: 0,
          total_quantity: 0,
          total_value: 0,
        }
      }
      report.by_employee[checkout.employee_name].count++
      report.by_employee[checkout.employee_name].total_quantity += parseFloat(checkout.quantity_checked_out || 0)
      report.by_employee[checkout.employee_name].total_value += parseFloat(checkout.total_cost || 0)
    })

    // Group by material
    checkouts.forEach((checkout) => {
      if (!report.by_material[checkout.material_name]) {
        report.by_material[checkout.material_name] = {
          count: 0,
          total_quantity: 0,
          total_value: 0,
        }
      }
      report.by_material[checkout.material_name].count++
      report.by_material[checkout.material_name].total_quantity += parseFloat(checkout.quantity_checked_out || 0)
      report.by_material[checkout.material_name].total_value += parseFloat(checkout.total_cost || 0)
    })

    return report
  }

  /**
   * Export checkouts to CSV
   */
  exportToCSV(checkouts, filename = "employee_inventory_checkouts.csv") {
    const headers = [
      "ID",
      "Employee",
      "Barcode",
      "Material",
      "Qty Checked Out",
      "Qty Returned",
      "Qty Used",
      "Balance",
      "Unit",
      "Status",
      "Checkout Date",
      "Expected Return",
      "Purpose",
    ]

    const rows = checkouts.map((c) => [
      c.id,
      c.employee_name,
      c.employee_barcode,
      c.material_name,
      c.quantity_checked_out,
      c.quantity_returned,
      c.quantity_used,
      this.calculateBalance(c),
      c.unit_of_measure,
      this.formatStatus(c.status),
      new Date(c.checkout_date).toLocaleDateString(),
      c.expected_return_date ? new Date(c.expected_return_date).toLocaleDateString() : "N/A",
      c.purpose || "",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }
}

// Create singleton instance
export const employeeInventoryService = new EmployeeInventoryService()