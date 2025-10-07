import { useState, useEffect } from "react"
import apiService from "../../utils/api/api-service"
import ModalPortal from "./ModalPortal"
import CreatePurchaseOrderWizard from "./CreatePurchaseOrderWizard"
import { useToast } from "./ToastNotification"

function PurchaseOrderTracker() {
  const { success, error: showError } = useToast()
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [restockItems, setRestockItems] = useState([])
  
  // Sorting state
  const [sortField, setSortField] = useState("po_date") // Default sort by date
  const [sortDirection, setSortDirection] = useState("desc") // desc = latest first

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
        const orders = result.orders || []
        // Sort orders - latest first by default
        const sortedOrders = sortOrders(orders, sortField, sortDirection)
        setPurchaseOrders(sortedOrders)
      } else {
        setError(result.message || "Failed to fetch purchase orders")
      }
    } catch (err) {
      setError(err.message || "Failed to fetch purchase orders")
    } finally {
      setLoading(false)
    }
  }

  // Sorting function
  const sortOrders = (orders, field, direction) => {
    const sorted = [...orders].sort((a, b) => {
      let aVal, bVal

      switch(field) {
        case "po_number":
          aVal = parseInt(a.po_number) || 0
          bVal = parseInt(b.po_number) || 0
          break
        case "supplier":
          aVal = (a.supplier || "").toLowerCase()
          bVal = (b.supplier || "").toLowerCase()
          break
        case "po_date":
          aVal = new Date(a.po_date || 0)
          bVal = new Date(b.po_date || 0)
          break
        case "total_amount":
          aVal = parseFloat(a.total_amount) || 0
          bVal = parseFloat(b.total_amount) || 0
          break
        case "order_status":
          aVal = (a.order_status || "").toLowerCase()
          bVal = (b.order_status || "").toLowerCase()
          break
        default:
          return 0
      }

      if (direction === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    
    return sorted
  }

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, default to descending
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Re-sort when sort parameters change
  useEffect(() => {
    if (purchaseOrders.length > 0) {
      const sorted = sortOrders(purchaseOrders, sortField, sortDirection)
      setPurchaseOrders(sorted)
    }
  }, [sortField, sortDirection])

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

  const handleWizardSuccess = (message) => {
    success("Success", message)
    fetchPurchaseOrders()
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
          
          success("Purchase Orders Created", message)
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
          showError("Failed to Create Orders", `Attempted suppliers: ${failedSuppliers.join(', ')}`)
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
          success("Success", "Purchase order created successfully!")
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
          showError("Failed", result.message || "Failed to create purchase order")
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
        success("Success", "Order status updated successfully!")
        setShowOrderDetails(false)
        fetchPurchaseOrders()
      } else {
        showError("Failed", result.message || "Failed to update order status")
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
          success("Deleted", "Purchase order deleted successfully!")
          fetchPurchaseOrders()
        } else {
          showError("Failed", result.message || "Failed to delete purchase order")
        }
      } catch (err) {
        showError("Error", err.message || "Failed to delete purchase order")
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
                <th 
                  onClick={() => handleSort("po_number")}
                  className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>Order ID</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "po_number" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "po_number" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("supplier")}
                  className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Supplier</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "supplier" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "supplier" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("order_status")}
                  className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Status</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "order_status" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "order_status" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Priority</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Items</th>
                <th 
                  onClick={() => handleSort("total_amount")}
                  className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Total Value</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "total_amount" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "total_amount" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("po_date")}
                  className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Expected Delivery</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "po_date" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "po_date" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
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

      {/* Create Order Wizard */}
      <CreatePurchaseOrderWizard 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWizardSuccess}
      />

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
    </div>
  )
}

export default PurchaseOrderTracker