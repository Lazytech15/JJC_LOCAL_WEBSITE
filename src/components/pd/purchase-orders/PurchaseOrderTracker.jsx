import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../../contexts/AuthContext"
import apiService from "../../../utils/api/api-service"
import { ModalPortal, useToast } from "../shared"
import CreatePurchaseOrderWizard from "./CreatePurchaseOrderWizard"
import { PurchaseOrderTrackerSkeleton } from "../../skeletons/ProcurementSkeletons"
import { exportPurchaseOrderToPDF, exportPurchaseOrderToExcel } from "../../../utils/purchase-order-export"
// Realtime imports for live updates
import { pollingManager } from "../../../utils/api/websocket/polling-manager.jsx"
import { SOCKET_EVENTS, SOCKET_ROOMS } from "../../../utils/api/websocket/constants/events.js"
import { ProcurementEventHandler } from "../../../utils/api/websocket/handlers/procurement-handler.js"
//comment test

function PurchaseOrderTracker() {
  const { isDarkMode } = useAuth()
  const { success, error: showError } = useToast()
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  // Reuse CreatePurchaseOrderWizard for editing by passing editingOrder prop
  const [restockItems, setRestockItems] = useState([])
  
  // Sorting state
  const [sortField, setSortField] = useState("priority") // Default sort by priority
  const [sortDirection, setSortDirection] = useState("desc") // desc = highest first

  // Form states
  const [orderForm, setOrderForm] = useState({
    supplier: "",
    items: [],
    expected_delivery_date: "",
    notes: "",
    // Default to moderate priority
    priority: "P2",
    multi_supplier_mode: false // New field for handling multiple suppliers
  })
  
  const [orderSplitMode, setOrderSplitMode] = useState("single") // "single", "split", "mixed"

  const [statusUpdate, setStatusUpdate] = useState({
    order_id: "",
    new_status: "",
    notes: "",
    actual_delivery_date: ""
  })

  // Realtime setup flag and unsubs storage
  const handlersRegistered = useRef(false)
  const unsubscribers = useRef([])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchRestockItems()
    // Initialize realtime subscriptions for procurement updates (once)
    if (!handlersRegistered.current) {
      // Register procurement handlers (they emit generic procurement:refresh events)
      new ProcurementEventHandler(pollingManager)
      // Start polling and join the procurement room
      pollingManager.initialize()
      pollingManager.joinRoom(SOCKET_ROOMS.PROCUREMENT)

      // Subscribe to refresh signal and important PO events
      const unsubRefresh = pollingManager.subscribeToUpdates('procurement:refresh', () => {
        fetchPurchaseOrders()
      })

      const poEvents = [
        SOCKET_EVENTS.PROCUREMENT.PO_CREATED,
        SOCKET_EVENTS.PROCUREMENT.PO_UPDATED,
        SOCKET_EVENTS.PROCUREMENT.PO_DELETED,
        SOCKET_EVENTS.PROCUREMENT.PO_STATUS_CHANGED,
        SOCKET_EVENTS.PROCUREMENT.PO_APPROVED,
        SOCKET_EVENTS.PROCUREMENT.PO_REJECTED,
        SOCKET_EVENTS.PROCUREMENT.PO_RECEIVED,
      ]
      const unsubs = poEvents.map(evt => pollingManager.subscribeToUpdates(evt, () => fetchPurchaseOrders()))

      unsubscribers.current.push(unsubRefresh, ...unsubs)
      handlersRegistered.current = true
    }

    return () => {
      // Clean up listeners on unmount
      if (unsubscribers.current.length) {
        unsubscribers.current.forEach((fn) => { try { fn && fn() } catch(_){} })
        unsubscribers.current = []
      }
    }
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
        case "priority":
          aVal = getPriorityRank(a.priority)
          bVal = getPriorityRank(b.priority)
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
    // Support new P0..P4 codes; fallback to legacy strings
    const map = {
      'P0': 'bg-red-100 text-red-800',    // Critical
      'P1': 'bg-orange-100 text-orange-800',
      'P2': 'bg-yellow-100 text-yellow-800',
      'P3': 'bg-green-100 text-green-800',
      'P4': 'bg-gray-100 text-gray-800',
      // legacy
      low: 'bg-green-100 text-green-800',
      normal: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return map[priority] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityRank = (priority) => {
    // Higher number = higher priority for sorting
    if (!priority) return 0
    const p = String(priority).toUpperCase()
    const rankMap = {
      'P0': 5,
      'P1': 4,
      'P2': 3,
      'P3': 2,
      'P4': 1,
      // legacy mapping (in case some rows still use legacy values)
      'URGENT': 5,
      'HIGH': 4,
      'NORMAL': 3,
      'LOW': 2
    }
    return rankMap[p] || 0
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
      priority: "P2"
    })
    setSelectedOrder(null)
    setShowCreateModal(true)
  }

  const handleExportPDF = (order) => {
    try {
      exportPurchaseOrderToPDF(order)
    } catch (err) {
      showError('Export Error', err.message || 'Failed to export PDF')
    }
  }

  const handleExportExcel = (order) => {
    try {
      exportPurchaseOrderToExcel(order)
    } catch (err) {
      showError('Export Error', err.message || 'Failed to export Excel')
    }
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
            priority: "P2",
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
            priority: "P2",
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
      if (!selectedOrder) {
        showError('No Order Selected', 'Please open a purchase order to update its status.')
        return
      }

      const payload = {
        status: (statusUpdate.new_status || 'received').toLowerCase(),
        actual_delivery_date: statusUpdate.actual_delivery_date || undefined,
        notes: statusUpdate.notes || undefined
      }

      const result = await apiService.purchaseOrders.updatePurchaseOrderStatus(selectedOrder.id, payload)

      if (result && result.success) {
        success('Updated', result.message || 'Purchase order status updated')
        // Refresh orders and selected order
        fetchPurchaseOrders()
        // Close details modal (optional)
        setShowOrderDetails(false)
      } else {
        showError('Failed', (result && (result.message || result.error)) || 'Failed to update purchase order status')
      }
    } catch (err) {
      showError('Error', err.message || 'Failed to update purchase order status')
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

  // Open edit modal and prefill form
  const handleOpenEdit = (order) => {
    // Open the create wizard in editing mode with the selected order
    setSelectedOrder(order)
    setShowCreateModal(true)
  }

  // Note: editing uses CreatePurchaseOrderWizard by passing `editingOrder={selectedOrder}`

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

  if (loading) {
    return <PurchaseOrderTrackerSkeleton />
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
                <th 
                  onClick={() => handleSort("priority")}
                  className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Priority</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === "priority" && sortDirection === "asc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                      </svg>
                      <svg className={`w-3 h-3 -mt-2 ${sortField === "priority" && sortDirection === "desc" ? "text-amber-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </th>
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
                              {order.priority?.toUpperCase()}
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
                      {/* Edit removed - editing purchase orders is no longer supported */}
                      <button
                        onClick={() => handleExportPDF(order)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleOpenEdit(order)}
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleExportExcel(order)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Excel
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
        onClose={() => { setShowCreateModal(false); setSelectedOrder(null); }}
        onSuccess={(msg) => { handleWizardSuccess(msg); }}
        editingOrder={selectedOrder}
      />

      {/* Editing uses CreatePurchaseOrderWizard - open create modal with editingOrder prop */}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-1000">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header with Gradient */}
              <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">Purchase Order Details</h3>
                  <p className="text-blue-100 text-sm mt-1">{selectedOrder.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenEdit(selectedOrder)}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-white hover:text-blue-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6 bg-gray-50 dark:bg-gray-800">
                <div className="space-y-6">
                  {/* Order Information Section */}
                  <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Order Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Supplier</label>
                        <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{selectedOrder.supplier}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusText(selectedOrder.status)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</label>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedOrder.priority)}`}>
                          {selectedOrder.priority?.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order Date</label>
                        <div className="text-gray-800 dark:text-gray-200 font-medium">{formatDate(selectedOrder.order_date)}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expected Delivery</label>
                        <div className="text-gray-800 dark:text-gray-200 font-medium">{formatDate(selectedOrder.expected_delivery_date)}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Value</label>
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">{formatCurrency(selectedOrder.total_value)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Order Items ({selectedOrder.items?.length || 0})
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-linear-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">Item</th>
                              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">Quantity</th>
                              <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">Unit Price</th>
                              <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">Total</th>
                              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {selectedOrder.items.map((item, idx) => (
                              <tr key={`${item.item_no}-${idx}`} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">{item.item_name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">#{item.item_no}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
                                    {item.quantity} {item.unit_of_measure || ''}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(item.quantity * item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                                    {getStatusText(item.status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 font-bold">
                              <td colSpan="3" className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 uppercase text-sm">
                                Total Amount:
                              </td>
                              <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 text-lg font-bold">
                                {formatCurrency(selectedOrder.total_value)}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Update Status Section */}
                  <div className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Update Order Status
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">New Status</label>
                          <select
                            value={statusUpdate.new_status}
                            onChange={(e) => setStatusUpdate({ ...statusUpdate, new_status: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          >
                            <option value="">Select new status...</option>
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
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Actual Delivery Date</label>
                            <input
                              type="date"
                              value={statusUpdate.actual_delivery_date}
                              onChange={(e) => setStatusUpdate({ ...statusUpdate, actual_delivery_date: e.target.value })}
                              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Update Notes</label>
                        <textarea
                          value={statusUpdate.notes}
                          onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                          placeholder="Add notes about this status update..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Action Buttons */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 flex gap-3">
                <button
                  onClick={handleUpdateStatus}
                  disabled={!statusUpdate.new_status}
                  className="flex-1 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update Status
                  </span>
                </button>
                <button
                  onClick={() => handleExportPDF(selectedOrder)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => handleExportExcel(selectedOrder)}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default PurchaseOrderTracker