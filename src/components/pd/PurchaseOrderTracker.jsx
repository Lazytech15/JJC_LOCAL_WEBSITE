import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import ModalPortal from "./ModalPortal"

function PurchaseOrderTracker() {
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [restockItems, setRestockItems] = useState([])
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  // Form states
  const [orderForm, setOrderForm] = useState({
    supplier: "",
    items: [],
    expected_delivery_date: "",
    notes: "",
    priority: "normal",
    multi_supplier_mode: false // New field for handling multiple suppliers
  })
  
  const [orderSplitMode, setOrderSplitMode] = useState("single") // "single", "split", "mixed"

  const [statusUpdate, setStatusUpdate] = useState({
    order_id: "",
    new_status: "",
    notes: "",
    actual_delivery_date: ""
  })

  useEffect(() => {
    fetchPurchaseOrders()
    fetchRestockItems()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const result = await apiService.purchaseOrders.getPurchaseOrders()
      if (result.success) {
        setPurchaseOrders(result.orders || [])
      } else {
        setError(result.message || "Failed to fetch purchase orders")
      }
    } catch (err) {
      setError(err.message || "Failed to fetch purchase orders")
    } finally {
      setLoading(false)
    }
  }

  const fetchRestockItems = async () => {
    try {
      const result = await apiService.items.getItems({ limit: 1000 })
      const items = result.data || []

      // Filter items that need restocking
      const restockItems = items
        .map(item => {
          const balance = Number(item.balance) || 0
          const minStock = Number(item.min_stock) || 0
          const shortage = Math.max(minStock - balance, 0)
          const status = balance === 0 ? "Out Of Stock" : (minStock > 0 && balance < minStock ? "Low In Stock" : "In Stock")

          return {
            ...item,
            shortage,
            recommended_quantity: Math.max(shortage, 1),
            status
          }
        })
        .filter(item => item.status === "Out Of Stock" || item.status === "Low In Stock")
        .sort((a, b) => {
          // Sort by status priority, then by shortage
          const statusPriority = { "Out Of Stock": 0, "Low In Stock": 1 }
          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status]
          }
          return b.shortage - a.shortage
        })

      setRestockItems(restockItems)
    } catch (err) {
      console.error("Error fetching restock items:", err)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      requested: "bg-gray-100 text-gray-800 border-gray-200",
      ordered: "bg-blue-100 text-blue-800 border-blue-200",
      in_transit: "bg-yellow-100 text-yellow-800 border-yellow-200",
      ready_for_pickup: "bg-orange-100 text-orange-800 border-orange-200",
      received: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    }
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getStatusText = (status) => {
    const texts = {
      requested: "Requested",
      ordered: "Ordered",
      in_transit: "In Transit",
      ready_for_pickup: "Ready for Pickup",
      received: "Received",
      cancelled: "Cancelled"
    }
    return texts[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-red-100 text-red-800",
      urgent: "bg-purple-100 text-purple-800"
    }
    return colors[priority] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Helper function to group items by supplier
  const groupItemsBySupplier = (items) => {
    return items.reduce((groups, item) => {
      const supplier = item.supplier || "Unknown Supplier"
      if (!groups[supplier]) {
        groups[supplier] = []
      }
      groups[supplier].push(item)
      return groups
    }, {})
  }

  // Get unique suppliers from selected items
  const getUniqueSuppliers = (items) => {
    return [...new Set(items.map(item => item.supplier || "Unknown Supplier"))]
  }

  const formatDate = (dateString) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" })
    }, 3000)
  }

  const handleCreateOrder = () => {
    setOrderForm({
      supplier: "",
      items: [],
      expected_delivery_date: "",
      notes: "",
      priority: "normal"
    })
    setShowCreateModal(true)
  }

  const handleAddItemToOrder = (item) => {
    setOrderForm(prev => {
      const newItems = [...prev.items, {
        item_no: item.item_no,
        item_name: item.item_name,
        quantity: item.recommended_quantity, // This will be editable in UI
        custom_quantity: item.recommended_quantity, // User can override this
        recommended_quantity: item.recommended_quantity,
        unit_price: item.price_per_unit || 0,
        unit_of_measure: item.unit_of_measure || "",
        supplier: item.supplier || "",
        supplier_specific: item.supplier || "",
        delivery_method: "delivery" // Default delivery method
      }]

      // Smart supplier handling for multiple suppliers
      const uniqueSuppliers = getUniqueSuppliers(newItems)
      
      let newSupplier = prev.supplier
      let multiSupplierMode = false
      
      if (newItems.length === 1) {
        // First item added - set supplier from this item
        newSupplier = item.supplier || ""
      } else if (uniqueSuppliers.length === 1) {
        // All items from same supplier
        newSupplier = uniqueSuppliers[0]
      } else {
        // Multiple suppliers detected
        multiSupplierMode = true
        newSupplier = "Multiple Suppliers"
      }

      return {
        ...prev,
        items: newItems,
        supplier: newSupplier,
        multi_supplier_mode: multiSupplierMode
      }
    })
  }

  const handleUpdateItemQuantity = (itemNo, newQuantity) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.item_no === itemNo 
          ? { ...item, custom_quantity: newQuantity, quantity: newQuantity }
          : item
      )
    }))
  }

  const handleUpdateItemDeliveryMethod = (itemNo, deliveryMethod) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.item_no === itemNo 
          ? { ...item, delivery_method: deliveryMethod }
          : item
      )
    }))
  }

  const handleRemoveItemFromOrder = (itemNo) => {
    setOrderForm(prev => {
      const newItems = prev.items.filter(item => item.item_no !== itemNo)

      // Reset supplier if no items remain
      let newSupplier = prev.supplier
      if (newItems.length === 0) {
        newSupplier = ""
      } else {
        // Check if remaining items have the same supplier
        const suppliers = newItems.map(i => i.supplier || "").filter(s => s)
        const uniqueSuppliers = [...new Set(suppliers)]
        if (uniqueSuppliers.length === 1) {
          newSupplier = uniqueSuppliers[0]
        }
        // If multiple suppliers, keep current supplier
      }

      return {
        ...prev,
        items: newItems,
        supplier: newSupplier
      }
    })
  }

  const handleSubmitOrder = async () => {
    try {
      // Handle multiple suppliers based on user selection
      if (orderForm.multi_supplier_mode && orderSplitMode === "split") {
        // Split into separate orders by supplier
        const supplierGroups = groupItemsBySupplier(orderForm.items)
        const createPromises = []
        
        for (const [supplier, items] of Object.entries(supplierGroups)) {
          const orderData = {
            supplier: supplier,
            items: items,
            expected_delivery_date: orderForm.expected_delivery_date || null,
            notes: `${orderForm.notes}${orderForm.notes ? ' | ' : ''}Multi-supplier order - Part of batch`,
            priority: orderForm.priority,
            created_by: "Current User" // TODO: Get from auth context
          }
          
          // Wrap each API call to catch individual errors
          // Disable deduplication for multiple orders to same endpoint
          const orderPromise = apiService.purchaseOrders.createPurchaseOrder(orderData, { deduplicate: false })
            .then(result => {
              return result
            })
            .catch(error => {
              console.error(`Error creating order for supplier ${supplier}:`, error)
              return { success: false, error: error.message }
            })
          
          createPromises.push(orderPromise)
        }
        
        // Execute all order creation promises
        const results = await Promise.all(createPromises)
        const successCount = results.filter(r => r && r.success).length
        const failCount = results.length - successCount
        
        if (successCount > 0) {
          const successfulSuppliers = results
            .map((result, index) => result && result.success ? Object.keys(supplierGroups)[index] : null)
            .filter(Boolean)
          const failedSuppliers = results
            .map((result, index) => (!result || !result.success) ? Object.keys(supplierGroups)[index] : null)
            .filter(Boolean)
          
          let message = `Successfully created ${successCount} purchase order(s)`
          if (successfulSuppliers.length > 0) {
            message += ` for: ${successfulSuppliers.join(', ')}`
          }
          if (failCount > 0) {
            message += `. Failed for: ${failedSuppliers.join(', ')}`
          }
          
          showToast(message)
          setShowCreateModal(false)
          setOrderForm({
            supplier: "",
            items: [],
            expected_delivery_date: "",
            notes: "",
            priority: "normal",
            multi_supplier_mode: false
          })
          setOrderSplitMode("single")
          fetchPurchaseOrders()
        } else {
          const failedSuppliers = Object.keys(supplierGroups)
          showToast(`Failed to create any purchase orders. Attempted suppliers: ${failedSuppliers.join(', ')}`, "error")
        }
      } else {
        // Single order (traditional or mixed supplier)
        const orderData = {
          supplier: orderForm.multi_supplier_mode ? "Multiple Suppliers" : orderForm.supplier,
          items: orderForm.items,
          expected_delivery_date: orderForm.expected_delivery_date || null,
          notes: orderForm.notes,
          priority: orderForm.priority,
          created_by: "Current User" // TODO: Get from auth context
        }

        const result = await apiService.purchaseOrders.createPurchaseOrder(orderData)

        if (result.success) {
          showToast("Purchase order created successfully!")
          setShowCreateModal(false)
          setOrderForm({
            supplier: "",
            items: [],
            expected_delivery_date: "",
            notes: "",
            priority: "normal",
            multi_supplier_mode: false
          })
          setOrderSplitMode("single")
          fetchPurchaseOrders()
        } else {
          showToast(result.message || "Failed to create purchase order", "error")
        }
      }
    } catch (err) {
      setError(err.message || "Failed to create purchase order")
    }
  }

  const handleUpdateStatus = async () => {
    try {
      const statusData = {
        new_status: statusUpdate.new_status,
        notes: statusUpdate.notes,
        actual_delivery_date: statusUpdate.actual_delivery_date || undefined
      }

      const result = await apiService.purchaseOrders.updatePurchaseOrderStatus(statusUpdate.order_id, statusData)

      if (result.success) {
        showToast("Order status updated successfully!")
        setShowOrderDetails(false)
        fetchPurchaseOrders()
      } else {
        showToast(result.message || "Failed to update order status", "error")
      }
    } catch (err) {
      setError(err.message || "Failed to update order status")
    }
  }

  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order)
    setStatusUpdate({
      order_id: order.id,
      new_status: order.status,
      notes: "",
      actual_delivery_date: order.actual_delivery_date || ""
    })
    setShowOrderDetails(true)
  }

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this purchase order? This action cannot be undone.")) {
      try {
        const result = await apiService.purchaseOrders.deletePurchaseOrder(orderId)

        if (result.success) {
          showToast("Purchase order deleted successfully!")
          fetchPurchaseOrders()
        } else {
          showToast(result.message || "Failed to delete purchase order", "error")
        }
      } catch (err) {
        showToast(err.message || "Failed to delete purchase order", "error")
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Purchase Order Tracker</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track procurement orders from request to delivery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {purchaseOrders.length} active orders
          </div>
          <button
            onClick={handleCreateOrder}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Order
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {["requested", "ordered", "in_transit", "ready_for_pickup", "received", "cancelled"].map(status => {
          const count = purchaseOrders.filter(order => order.status === status).length
          return (
            <div key={status} className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/20">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{count}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{getStatusText(status)}</div>
            </div>
          )
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/10 dark:bg-black/20">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Supplier</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Priority</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Items</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Total Value</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Expected Delivery</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
              {purchaseOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 dark:hover:bg-black/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{order.id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(order.order_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.supplier}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {order.total_items} ({order.total_quantity} qty)
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(order.total_value)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {formatDate(order.expected_delivery_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleViewOrderDetails(order)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {purchaseOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">No purchase orders found.</div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Create Purchase Order</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Supplier</label>
                      <div className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200">
                        {orderForm.supplier || "Select items to auto-set supplier"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Expected Delivery Date <span className="text-xs text-gray-400">(Optional)</span></label>
                      <input
                        type="date"
                        value={orderForm.expected_delivery_date}
                        onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Priority</label>
                      <select
                        value={orderForm.priority}
                        onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Notes</label>
                    <textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes for this order..."
                    />
                  </div>

                  {/* Add Items from Restock List */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Add Items from Restock List</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {restockItems.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No items need restocking</p>
                      ) : (
                        <div className="space-y-2">
                          {restockItems.map((item) => (
                            <div key={item.item_no} className="flex items-center justify-between bg-white dark:bg-gray-700 rounded p-3">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 dark:text-gray-200">{item.item_name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  ID: {item.item_no} | Shortage: {item.shortage} | Recommended: {item.recommended_quantity}
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddItemToOrder(item)}
                                disabled={orderForm.items.some(i => i.item_no === item.item_no)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                              >
                                {orderForm.items.some(i => i.item_no === item.item_no) ? "Added" : "Add"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multiple Supplier Handling Options */}
                  {orderForm.multi_supplier_mode && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                      <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">Multiple Suppliers Detected</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        You have selected items from {getUniqueSuppliers(orderForm.items).length} different suppliers. Choose how to handle this:
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="supplierMode"
                            value="split"
                            checked={orderSplitMode === "split"}
                            onChange={(e) => setOrderSplitMode(e.target.value)}
                            className="text-yellow-600"
                          />
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Split into separate orders</strong> - Create one order per supplier (Recommended)
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="supplierMode"
                            value="mixed"
                            checked={orderSplitMode === "mixed"}
                            onChange={(e) => setOrderSplitMode(e.target.value)}
                            className="text-yellow-600"
                          />
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Keep as mixed order</strong> - Single order with multiple suppliers
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Selected Items - Grouped by Supplier */}
                  {orderForm.items.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Selected Items ({orderForm.items.length})
                        {orderForm.multi_supplier_mode && (
                          <span className="ml-2 text-sm text-yellow-600 dark:text-yellow-400">
                            from {getUniqueSuppliers(orderForm.items).length} suppliers
                          </span>
                        )}
                      </h4>
                      
                      {/* Group items by supplier */}
                      <div className="space-y-4">
                        {Object.entries(groupItemsBySupplier(orderForm.items)).map(([supplier, supplierItems]) => (
                          <div key={supplier} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                {supplier}
                              </h5>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {supplierItems.length} items • {formatCurrency(supplierItems.reduce((sum, item) => sum + ((item.custom_quantity || item.quantity) * item.unit_price), 0))}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {supplierItems.map((item, index) => (
                                <div key={`${item.item_no}-${index}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800 dark:text-gray-200">{item.item_name}</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">ID: {item.item_no}</div>
                                      <div className="text-sm text-blue-600 dark:text-blue-400">Recommended: {item.recommended_quantity} {item.unit_of_measure}</div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      {/* Quantity Input */}
                                      <div className="flex flex-col">
                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Order Qty</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.custom_quantity || item.quantity}
                                          onChange={(e) => handleUpdateItemQuantity(item.item_no, parseInt(e.target.value) || 1)}
                                          className="w-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                                        />
                                      </div>
                                      
                                      {/* Delivery Method */}
                                      <div className="flex flex-col">
                                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Method</label>
                                        <select
                                          value={item.delivery_method || "delivery"}
                                          onChange={(e) => handleUpdateItemDeliveryMethod(item.item_no, e.target.value)}
                                          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                                        >
                                          <option value="delivery">Delivery</option>
                                          <option value="pickup">Pickup</option>
                                        </select>
                                      </div>
                                      
                                      {/* Price Info */}
                                      <div className="flex flex-col text-right">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price)}/unit</div>
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency((item.custom_quantity || item.quantity) * item.unit_price)}</div>
                                      </div>
                                      
                                      {/* Remove Button */}
                                      <button
                                        onClick={() => handleRemoveItemFromOrder(item.item_no)}
                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Order Summary */}
                      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Order Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-gray-400">Suppliers</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{getUniqueSuppliers(orderForm.items).length}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-gray-400">Total Items</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{orderForm.items.length}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-gray-400">Total Qty</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{orderForm.items.reduce((sum, item) => sum + (item.custom_quantity || item.quantity), 0)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-gray-400">Delivery</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{orderForm.items.filter(item => (item.delivery_method || "delivery") === "delivery").length}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 dark:text-gray-400">Pickup</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{orderForm.items.filter(item => item.delivery_method === "pickup").length}</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            Total Value: {formatCurrency(orderForm.items.reduce((sum, item) => sum + ((item.custom_quantity || item.quantity) * item.unit_price), 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSubmitOrder}
                      disabled={orderForm.items.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {orderForm.multi_supplier_mode && orderSplitMode === "split" 
                        ? `Create ${getUniqueSuppliers(orderForm.items).length} Purchase Orders`
                        : "Create Purchase Order"
                      }
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Order Details - {selectedOrder.id}</h3>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Supplier</label>
                      <div className="text-gray-800 dark:text-gray-200 font-medium">{selectedOrder.supplier}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Order Date</label>
                      <div className="text-gray-800 dark:text-gray-200">{formatDate(selectedOrder.order_date)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Expected Delivery</label>
                      <div className="text-gray-800 dark:text-gray-200">{formatDate(selectedOrder.expected_delivery_date)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Priority</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedOrder.priority)}`}>
                        {selectedOrder.priority}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</label>
                      <div className="text-gray-800 dark:text-gray-200 font-bold">{formatCurrency(selectedOrder.total_value)}</div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Order Items</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Item</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">Quantity</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">Unit Price</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">Total</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedOrder.items.map((item) => (
                            <tr key={item.item_no}>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-800 dark:text-gray-200">{item.item_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.item_no}</div>
                              </td>
                              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                                {item.quantity} {item.unit_of_measure || ''}
                              </td>
                              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {getStatusText(item.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Update Status */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Update Order Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">New Status</label>
                        <select
                          value={statusUpdate.new_status}
                          onChange={(e) => setStatusUpdate({ ...statusUpdate, new_status: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="requested">Requested</option>
                          <option value="ordered">Ordered</option>
                          <option value="in_transit">In Transit</option>
                          <option value="ready_for_pickup">Ready for Pickup</option>
                          <option value="received">Received</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      {statusUpdate.new_status === "received" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Actual Delivery Date</label>
                          <input
                            type="date"
                            value={statusUpdate.actual_delivery_date}
                            onChange={(e) => setStatusUpdate({ ...statusUpdate, actual_delivery_date: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Update Notes</label>
                      <textarea
                        value={statusUpdate.notes}
                        onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes about this status update..."
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleUpdateStatus}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Update Status
                      </button>
                      <button
                        onClick={() => setShowOrderDetails(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[10000] animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-md transform transition-all duration-300 ease-in-out ${
            toast.type === "success"
              ? "bg-green-500/90 border-green-400 text-white"
              : "bg-red-500/90 border-red-400 text-white"
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseOrderTracker