// ============================================================================
// services/purchase-orders-service.js
// ============================================================================
import { BaseAPIService } from "../core/base-api.js"

export class PurchaseOrdersService extends BaseAPIService {
  // GET /api/purchase-orders - Retrieve all purchase orders with optional filtering
  async getPurchaseOrders(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.request(`/api/purchase-orders?${queryParams}`)
  }

  // GET /api/purchase-orders/:id - Get a specific purchase order
  async getPurchaseOrder(id) {
    return this.request(`/api/items/purchase-orders/${id}`)
  }

  // POST /api/purchase-orders - Create a new purchase order
  async createPurchaseOrder(orderData) {
    return this.request("/api/items/purchase-orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    })
  }

  // PUT /api/purchase-orders/:id/status - Update purchase order status
  async updatePurchaseOrderStatus(id, statusData) {
    return this.request(`/api/items/purchase-orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    })
  }

  // DELETE /api/purchase-orders/:id - Delete a purchase order
  async deletePurchaseOrder(id) {
    return this.request(`/api/items/purchase-orders/${id}`, {
      method: "DELETE",
    })
  }
}