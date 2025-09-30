// ============================================================================
// services/items-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class ItemsService extends BaseAPIService {
  // GET /api/items - Retrieve all items with optional filtering and pagination
  async getItems(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/items?${queryParams}`)
  }

  // GET /api/items/:id - Get a specific item by item_no
  async getItem(id) {
    return this.request(`/api/items/${id}`)
  }

  // POST /api/items - Create a new item
  async createItem(itemData) {
    return this.request("/api/items", {
      method: "POST",
      body: JSON.stringify(itemData),
    })
  }

  // PUT /api/items/:id - Update an existing item
  async updateItem(id, itemData) {
    return this.request(`/api/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    })
  }

  // DELETE /api/items/:id - Delete an item
  async deleteItem(id) {
    return this.request(`/api/items/${id}`, {
      method: "DELETE",
    })
  }

  // PATCH /api/items/:id/stock - Update item stock (quick stock adjustment)
  async updateItemStock(id, stockData) {
    return this.request(`/api/items/stock/${id}`, {
      method: "PATCH",
      body: JSON.stringify(stockData),
    })
  }

  // POST /api/items/bulk - Bulk create items
  async bulkCreateItems(items) {
    return this.request("/api/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
  }

  // POST /api/items/:id/stock-insert - Insert stock for existing item
  async insertStock(id, stockData) {
    return this.request(`/api/items/stock/${id}/insert`, {
      method: "POST",
      body: JSON.stringify(stockData),
    })
  }

  // GET /api/items/supplier/:supplier - Get items by supplier
  async getItemsBySupplier(supplier) {
    const encodedSupplier = encodeURIComponent(supplier)
    return this.request(`/api/items/supplier/${encodedSupplier}`)
  }

  // GET /api/items/dashboard/stats - Get dashboard statistics
  async getDashboardStats() {
    return this.request("/api/items/dashboard/stats")
  }

  // GET /api/items/filters/options - Get filter options for dropdowns
  async getFilterOptions() {
    return this.request("/api/items/filters/options")
  }

  // GET /api/items/reports/inventory-summary - Generate inventory summary report
  async getInventorySummary() {
    return this.request("/api/items/reports/inventory-summary")
  }

  // PUT /api/items/:id/quantity - For direct quantity updates
  async updateItemQuantity(id, quantityData) {
    return this.request(`/api/items/${id}/quantity`, {
      method: "PUT",
      body: JSON.stringify(quantityData),
    })
  }

  // POST /api/items/:id/out - For recording items going out
  async recordItemOut(id, outData) {
    return this.request(`/api/items/stock/${id}/out`, {
      method: "POST",
      body: JSON.stringify(outData),
    })
  }

  // POST /api/checkout - For processing checkout transactions
  async processCheckout(checkoutData) {
    return this.request("/api/stock/checkout", {
      method: "POST",
      body: JSON.stringify(checkoutData),
    })
  }

  // Export methods (these return URLs or trigger downloads)
  
  // GET /api/items/export/csv - Export items to CSV format
  getExportCsvUrl() {
    return `${this.baseURL}/api/items/export/csv`
  }

  // GET /api/items/export/supplier-report/:supplier - Export supplier report
  getSupplierReportUrl(supplier) {
    const encodedSupplier = encodeURIComponent(supplier)
    return `${this.baseURL}/api/items/stock/export/supplier-report/${encodedSupplier}`
  }

  // Helper methods for common operations

  // Search items with pagination
  async searchItems(searchTerm, page = 1, limit = 50, filters = {}) {
    const params = {
      search: searchTerm,
      offset: (page - 1) * limit,
      limit,
      ...filters
    }
    return this.getItems(params)
  }

  // Get low stock items
  async getLowStockItems(limit = 50) {
    return this.getItems({
      item_status: "Low In Stock",
      sort_by: "deficit",
      sort_order: "DESC",
      limit
    })
  }

  // Get out of stock items
  async getOutOfStockItems(limit = 50) {
    return this.getItems({
      item_status: "Out Of Stock",
      sort_by: "deficit",
      sort_order: "DESC",
      limit
    })
  }

  // Get items by location
  async getItemsByLocation(location, params = {}) {
    return this.getItems({
      location,
      ...params
    })
  }

  // Get items by type
  async getItemsByType(itemType, params = {}) {
    return this.getItems({
      item_type: itemType,
      ...params
    })
  }

  // Adjust stock balance directly
  async adjustStockBalance(id, newBalance, reason = "Manual adjustment") {
    return this.updateItemStock(id, {
      balance: newBalance,
      adjustment_reason: reason
    })
  }

  // Add stock to existing item
  async addStock(id, quantity, reason = "Stock addition") {
    return this.insertStock(id, {
      quantity,
      reason
    })
  }

  // Remove stock from item (checkout single item)
  async removeStock(id, quantity, notes = "", outBy = "") {
    return this.recordItemOut(id, {
      quantity,
      notes,
      out_by: outBy
    })
  }

  // Batch checkout multiple items
  async batchCheckout(items, checkoutBy = "", notes = "") {
    return this.processCheckout({
      items,
      checkout_by: checkoutBy,
      notes
    })
  }

  // Update item quantities with specific update type
  async updateQuantities(id, quantityData, updateType = "manual", updatedBy = "") {
    return this.updateItemQuantity(id, {
      ...quantityData,
      update_type: updateType,
      updated_by: updatedBy
    })
  }

  // Set balance directly
  async setBalance(id, balance, updatedBy = "", notes = "") {
    return this.updateQuantities(id, { balance }, "set_balance", updatedBy)
  }

  // Adjust in quantity
  async adjustInQuantity(id, inQty, updatedBy = "", notes = "") {
    return this.updateQuantities(id, { in_qty: inQty }, "adjust_in", updatedBy)
  }

  // Adjust out quantity
  async adjustOutQuantity(id, outQty, updatedBy = "", notes = "") {
    return this.updateQuantities(id, { out_qty: outQty }, "adjust_out", updatedBy)
  }

  // Download export files (these methods handle file downloads)
  async downloadCsvExport() {
    try {
      const response = await fetch(this.getExportCsvUrl(), {
        headers: this.headers,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response.blob()
    } catch (error) {
      console.error("Error downloading CSV export:", error)
      throw error
    }
  }

  async downloadSupplierReport(supplier) {
    try {
      const response = await fetch(this.getSupplierReportUrl(supplier), {
        headers: this.headers,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response.blob()
    } catch (error) {
      console.error("Error downloading supplier report:", error)
      throw error
    }
  }

  // Utility method to trigger file download in browser
  triggerDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Combined methods for easy file downloads
  async exportAndDownloadCsv(filename = null) {
    const blob = await this.downloadCsvExport()
    const defaultFilename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`
    this.triggerDownload(blob, filename || defaultFilename)
  }

  async exportAndDownloadSupplierReport(supplier, filename = null) {
    const blob = await this.downloadSupplierReport(supplier)
    const defaultFilename = `supplier_report_${supplier.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split('T')[0]}.csv`
    this.triggerDownload(blob, filename || defaultFilename)
  }
}