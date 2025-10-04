import { useState, useEffect } from "react"
import ModalPortal from "./ModalPortal"
import apiService from "../../utils/api/api-service"

function CreatePurchaseOrderWizard({ isOpen, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [restockItems, setRestockItems] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [orderSplitMode, setOrderSplitMode] = useState("split")
  
  const [wizardData, setWizardData] = useState({
    // Step 1 - Items selection
    selectedItems: [],
    multiSupplierMode: false,
    
    // Step 2 - Priority & Delivery
    priority: "normal",
    expectedDeliveryDate: "",
    notes: "",
    
    // Step 3 - Summary (read-only)
  })

  useEffect(() => {
    if (isOpen) {
      fetchRestockItems()
    }
  }, [isOpen])

  const fetchRestockItems = async () => {
    try {
      const result = await apiService.items.getItems({ limit: 1000 })
      const items = result.data || []

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
            status,
            custom_quantity: Math.max(shortage, 1),
            delivery_method: "delivery"  // Fixed: Use short value that matches database
          }
        })
        .filter(item => item.status === "Out Of Stock" || item.status === "Low In Stock")
        .sort((a, b) => {
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

  const steps = [
    { number: 1, title: "Select Items", description: "Add items from restock list" },
    { number: 2, title: "Set Details", description: "Priority & delivery date" },
    { number: 3, title: "Review & Submit", description: "Order summary" }
  ]

  const getUniqueSuppliers = (items) => {
    const suppliers = items.map(i => i.supplier || "Unknown").filter(s => s && s !== "Unknown")
    return [...new Set(suppliers)]
  }

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

  const handleAddItem = (item) => {
    const isAlreadyAdded = wizardData.selectedItems.some(i => i.item_no === item.item_no)
    if (isAlreadyAdded) return

    const newItems = [...wizardData.selectedItems, { ...item }]
    const suppliers = getUniqueSuppliers(newItems)
    
    setWizardData(prev => ({
      ...prev,
      selectedItems: newItems,
      multiSupplierMode: suppliers.length > 1
    }))
  }

  const handleRemoveItem = (itemNo) => {
    const newItems = wizardData.selectedItems.filter(i => i.item_no !== itemNo)
    const suppliers = getUniqueSuppliers(newItems)
    
    setWizardData(prev => ({
      ...prev,
      selectedItems: newItems,
      multiSupplierMode: suppliers.length > 1
    }))
  }

  const handleUpdateQuantity = (itemNo, quantity) => {
    setWizardData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(item =>
        item.item_no === itemNo ? { ...item, custom_quantity: quantity } : item
      )
    }))
  }

  const handleUpdateDeliveryMethod = (itemNo, method) => {
    setWizardData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(item =>
        item.item_no === itemNo ? { ...item, delivery_method: method } : item
      )
    }))
  }

  const calculateTotal = () => {
    return wizardData.selectedItems.reduce((sum, item) => {
      const price = Number(item.price_per_unit) || 0
      const qty = Number(item.custom_quantity) || 0
      return sum + (price * qty)
    }, 0)
  }

  const handleSubmit = async () => {
    try {
      if (wizardData.multiSupplierMode && orderSplitMode === "split") {
        // Split into separate orders by supplier
        const supplierGroups = groupItemsBySupplier(wizardData.selectedItems)
        const createPromises = []
        
        for (const [supplier, items] of Object.entries(supplierGroups)) {
          const orderData = {
            supplier: supplier,
            items: items.map(item => ({
              item_no: item.item_no,
              quantity: item.custom_quantity,
              price_per_unit: Number(item.price_per_unit) || 0,
              delivery_method: item.delivery_method
            })),
            expected_delivery_date: wizardData.expectedDeliveryDate || null,
            notes: `${wizardData.notes}${wizardData.notes ? ' | ' : ''}Multi-supplier order - Part of batch`,
            priority: wizardData.priority,
            created_by: "Current User"
          }
          
          const orderPromise = apiService.purchaseOrders.createPurchaseOrder(orderData, { deduplicate: false })
            .then(result => result)
            .catch(error => ({ success: false, error: error.message }))
          
          createPromises.push(orderPromise)
        }
        
        const results = await Promise.all(createPromises)
        const successCount = results.filter(r => r && r.success).length
        
        if (successCount > 0) {
          onSuccess(`Successfully created ${successCount} purchase order(s)`)
          handleClose()
        } else {
          throw new Error("Failed to create any purchase orders")
        }
      } else {
        // Single order
        const orderData = {
          supplier: wizardData.multiSupplierMode ? "Multiple Suppliers" : getUniqueSuppliers(wizardData.selectedItems)[0] || "Unknown",
          items: wizardData.selectedItems.map(item => ({
            item_no: item.item_no,
            quantity: item.custom_quantity,
            price_per_unit: Number(item.price_per_unit) || 0,
            delivery_method: item.delivery_method
          })),
          expected_delivery_date: wizardData.expectedDeliveryDate || null,
          notes: wizardData.notes,
          priority: wizardData.priority,
          created_by: "Current User"
        }

        const result = await apiService.purchaseOrders.createPurchaseOrder(orderData)

        if (result.success) {
          onSuccess("Purchase order created successfully!")
          handleClose()
        } else {
          throw new Error(result.message || "Failed to create purchase order")
        }
      }
    } catch (err) {
      alert(err.message || "Failed to create purchase order")
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSearchTerm("")
    setOrderSplitMode("split")
    setWizardData({
      selectedItems: [],
      multiSupplierMode: false,
      priority: "normal",
      expectedDeliveryDate: "",
      notes: ""
    })
    onClose()
  }

  // Export functions
  const exportToPDF = () => {
    const orderData = {
      items: wizardData.selectedItems,
      priority: wizardData.priority,
      deliveryDate: wizardData.expectedDeliveryDate,
      notes: wizardData.notes,
      total: calculateTotal()
    }

    // Create printable content
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
          .info { margin: 20px 0; background: #f3f4f6; padding: 15px; border-radius: 8px; }
          .info-row { margin: 8px 0; }
          .label { font-weight: bold; color: #555; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #4F46E5; color: white; padding: 12px; text-align: left; }
          td { border: 1px solid #ddd; padding: 10px; }
          tr:nth-child(even) { background: #f9fafb; }
          .total { font-size: 18px; font-weight: bold; text-align: right; padding: 15px; background: #e0e7ff; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📦 Purchase Order</h1>
        <div class="info">
          <div class="info-row"><span class="label">Date:</span> ${new Date().toLocaleString()}</div>
          <div class="info-row"><span class="label">Priority:</span> ${wizardData.priority.toUpperCase()}</div>
          <div class="info-row"><span class="label">Expected Delivery:</span> ${wizardData.expectedDeliveryDate || 'Not specified'}</div>
          ${wizardData.notes ? `<div class="info-row"><span class="label">Notes:</span> ${wizardData.notes}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Item No.</th>
              <th>Item Name</th>
              <th>Supplier</th>
              <th>Quantity</th>
              <th>Delivery</th>
              <th>Price/Unit</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${wizardData.selectedItems.map(item => `
              <tr>
                <td>#${item.item_no}</td>
                <td>${item.item_name}</td>
                <td>${item.supplier || 'N/A'}</td>
                <td>${item.custom_quantity}</td>
                <td>${item.delivery_method === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}</td>
                <td>₱${(Number(item.price_per_unit) || 0).toFixed(2)}</td>
                <td>₱${((item.custom_quantity || 0) * (Number(item.price_per_unit) || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">Grand Total: ₱${calculateTotal().toFixed(2)}</div>
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['Item No.', 'Item Name', 'Supplier', 'Quantity', 'Delivery Method', 'Price per Unit', 'Subtotal']
    const rows = wizardData.selectedItems.map(item => [
      item.item_no,
      item.item_name,
      item.supplier || 'N/A',
      item.custom_quantity,
      item.delivery_method === 'pickup' ? 'Pickup' : 'Delivery',
      (Number(item.price_per_unit) || 0).toFixed(2),
      ((item.custom_quantity || 0) * (Number(item.price_per_unit) || 0)).toFixed(2)
    ])

    // Add summary rows
    rows.push([])
    rows.push(['', '', '', '', '', 'Grand Total:', calculateTotal().toFixed(2)])
    rows.push([])
    rows.push(['Priority:', wizardData.priority.toUpperCase()])
    rows.push(['Expected Delivery:', wizardData.expectedDeliveryDate || 'Not specified'])
    if (wizardData.notes) {
      rows.push(['Notes:', wizardData.notes])
    }

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `purchase_order_${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredRestockItems = restockItems.filter(item => {
    const search = searchTerm.toLowerCase()
    return (
      item.item_name?.toLowerCase().includes(search) ||
      item.item_no?.toString().includes(search) ||
      item.supplier?.toLowerCase().includes(search) ||
      item.brand?.toLowerCase().includes(search)
    )
  })

  const canProceedToStep2 = wizardData.selectedItems.length > 0
  const canProceedToStep3 = canProceedToStep2 && (wizardData.multiSupplierMode ? orderSplitMode : true)

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Create Purchase Order</h2>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <button
                    onClick={() => {
                      if (step.number < currentStep) setCurrentStep(step.number)
                      if (step.number === 2 && canProceedToStep2 && currentStep >= 2) setCurrentStep(2)
                      if (step.number === 3 && canProceedToStep3 && currentStep >= 3) setCurrentStep(3)
                    }}
                    disabled={
                      (step.number === 2 && !canProceedToStep2 && currentStep < 2) ||
                      (step.number === 3 && !canProceedToStep3 && currentStep < 3)
                    }
                    className={`
                      group flex items-center gap-3 px-4 py-2 rounded-lg transition-all
                      ${currentStep === step.number
                        ? 'bg-white/20 backdrop-blur-sm shadow-lg'
                        : currentStep > step.number
                        ? 'hover:bg-white/10 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all
                      ${currentStep === step.number
                        ? 'bg-white text-blue-600 shadow-md'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className={`font-semibold ${currentStep === step.number ? 'text-white' : 'text-white/90'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-white/70">{step.description}</div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <svg className="w-6 h-6 text-white/50 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Select Items */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Items from Restock List</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {wizardData.selectedItems.length} item(s) selected
                      {wizardData.multiSupplierMode && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">
                          • {getUniqueSuppliers(wizardData.selectedItems).length} suppliers detected
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-80">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search items, supplier, brand..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                      />
                      <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Multiple Supplier Warning */}
                {wizardData.multiSupplierMode && (
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-600 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-500 dark:bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">Multiple Suppliers Detected</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          You have selected items from <strong className="text-amber-700 dark:text-amber-400">{getUniqueSuppliers(wizardData.selectedItems).length} different suppliers</strong>. Choose how to handle this:
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`relative cursor-pointer group ${orderSplitMode === "split" ? 'ring-4 ring-emerald-500 dark:ring-emerald-400' : ''}`}>
                        <div className={`border-2 rounded-xl p-5 transition-all duration-200 ${orderSplitMode === "split" ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 shadow-md' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md'}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${orderSplitMode === "split" ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500 dark:bg-emerald-400' : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'}`}>
                                {orderSplitMode === "split" && (
                                  <svg className="w-4 h-4 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <input type="radio" name="supplierMode" value="split" checked={orderSplitMode === "split"} onChange={(e) => setOrderSplitMode(e.target.value)} className="sr-only" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className={`font-bold text-base ${orderSplitMode === "split" ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>
                                  Split into separate orders
                                </h5>
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-full">
                                  Recommended
                                </span>
                              </div>
                              <p className={`text-sm ${orderSplitMode === "split" ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                Create one order per supplier for easier tracking
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative cursor-pointer group ${orderSplitMode === "mixed" ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''}`}>
                        <div className={`border-2 rounded-xl p-5 transition-all duration-200 ${orderSplitMode === "mixed" ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-md' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${orderSplitMode === "mixed" ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400' : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'}`}>
                                {orderSplitMode === "mixed" && (
                                  <svg className="w-4 h-4 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <input type="radio" name="supplierMode" value="mixed" checked={orderSplitMode === "mixed"} onChange={(e) => setOrderSplitMode(e.target.value)} className="sr-only" />
                            </div>
                            <div className="flex-1">
                              <h5 className={`font-bold text-base mb-1 ${orderSplitMode === "mixed" ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                                Keep as mixed order
                              </h5>
                              <p className={`text-sm ${orderSplitMode === "mixed" ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                Single order with multiple suppliers
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Items Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Items */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      Available Items ({filteredRestockItems.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {filteredRestockItems.map((item) => {
                        const isAdded = wizardData.selectedItems.some(i => i.item_no === item.item_no)
                        return (
                          <div
                            key={item.item_no}
                            className={`bg-white dark:bg-gray-700 rounded-lg p-3 border-2 transition-all ${
                              isAdded
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white truncate">
                                  {item.item_name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">#{item.item_no}</span>
                                    {item.supplier && (
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                        {item.supplier}
                                      </span>
                                    )}
                                  </div>
                                  <div>Shortage: <span className="font-semibold text-red-600 dark:text-red-400">{item.shortage}</span></div>
                                  <div>Recommended: <span className="font-semibold">{item.recommended_quantity}</span></div>
                                  <div>Price: <span className="font-semibold">₱{(Number(item.price_per_unit) || 0).toFixed(2)}</span></div>
                                </div>
                              </div>
                              <button
                                onClick={() => isAdded ? handleRemoveItem(item.item_no) : handleAddItem(item)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                  isAdded
                                    ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                }`}
                              >
                                {isAdded ? 'Remove' : 'Add'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {filteredRestockItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          {searchTerm ? 'No items match your search' : 'No items need restocking'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Items */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Selected Items ({wizardData.selectedItems.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {wizardData.selectedItems.map((item) => (
                        <div
                          key={item.item_no}
                          className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                {item.item_name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                #{item.item_no}
                                {item.supplier && (
                                  <span className="ml-2 text-blue-600 dark:text-blue-400">• {item.supplier}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.item_no)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Editable Quantity with Suggested Value */}
                          <div className="space-y-1.5 mb-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Quantity (Suggested: {item.recommended_quantity})
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateQuantity(item.item_no, Math.max(1, item.custom_quantity - 1))}
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.custom_quantity}
                                onChange={(e) => handleUpdateQuantity(item.item_no, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.item_no, item.custom_quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleUpdateQuantity(item.item_no, item.recommended_quantity)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors ml-1"
                                title="Use suggested quantity"
                              >
                                Suggested
                              </button>
                            </div>
                          </div>

                          {/* Delivery Method Selector */}
                          <div className="space-y-1.5 mb-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Delivery Method
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() => handleUpdateDeliveryMethod(item.item_no, 'delivery')}
                                className={`px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                                  item.delivery_method === 'delivery'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                }`}
                              >
                                🚚 Delivery
                              </button>
                              <button
                                onClick={() => handleUpdateDeliveryMethod(item.item_no, 'pickup')}
                                className={`px-2 py-1.5 text-xs font-medium rounded border transition-all ${
                                  item.delivery_method === 'pickup'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                }`}
                              >
                                🏪 Pickup
                              </button>
                            </div>
                          </div>

                          {/* Price Summary */}
                          <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                            <div className="flex justify-between">
                              <span>Price per unit:</span>
                              <span>₱{(Number(item.price_per_unit) || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-900 dark:text-white mt-1">
                              <span>Subtotal:</span>
                              <span>₱{((item.custom_quantity || 0) * (Number(item.price_per_unit) || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {wizardData.selectedItems.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p>No items selected yet</p>
                          <p className="text-xs mt-1">Add items from the list to get started</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Set Priority & Delivery */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Set Order Details</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Configure priority level and expected delivery date for your order
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Priority Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      Priority Level <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'low', label: 'Low', icon: '📊', color: 'blue', desc: 'Standard processing' },
                        { value: 'normal', label: 'Normal', icon: '📋', color: 'gray', desc: 'Regular priority' },
                        { value: 'high', label: 'High', icon: '⚡', color: 'orange', desc: 'Expedited' },
                        { value: 'urgent', label: 'Urgent', icon: '🚨', color: 'red', desc: 'Critical need' }
                      ].map((priority) => (
                        <label
                          key={priority.value}
                          className={`
                            relative cursor-pointer group
                            ${wizardData.priority === priority.value ? 'ring-4 ring-offset-2' : ''}
                            ${priority.color === 'blue' && wizardData.priority === priority.value ? 'ring-blue-500' : ''}
                            ${priority.color === 'gray' && wizardData.priority === priority.value ? 'ring-gray-500' : ''}
                            ${priority.color === 'orange' && wizardData.priority === priority.value ? 'ring-orange-500' : ''}
                            ${priority.color === 'red' && wizardData.priority === priority.value ? 'ring-red-500' : ''}
                            rounded-xl
                          `}
                        >
                          <div className={`
                            border-2 rounded-xl p-4 transition-all duration-200 text-center
                            ${wizardData.priority === priority.value
                              ? priority.color === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : priority.color === 'gray' ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/30'
                              : priority.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/30'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md'
                            }
                          `}>
                            <div className="text-3xl mb-2">{priority.icon}</div>
                            <div className={`font-bold mb-1 ${wizardData.priority === priority.value ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {priority.label}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{priority.desc}</div>
                          </div>
                          <input
                            type="radio"
                            name="priority"
                            value={priority.value}
                            checked={wizardData.priority === priority.value}
                            onChange={(e) => setWizardData({ ...wizardData, priority: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Expected Delivery Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Expected Delivery Date <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={wizardData.expectedDeliveryDate}
                      onChange={(e) => setWizardData({ ...wizardData, expectedDeliveryDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg"
                    />
                  </div>

                  {/* Order Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Order Notes <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      value={wizardData.notes}
                      onChange={(e) => setWizardData({ ...wizardData, notes: e.target.value })}
                      rows={4}
                      maxLength={500}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      placeholder="Add any special instructions, requirements, or notes for this order..."
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                      {wizardData.notes.length}/500 characters
                    </div>
                  </div>

                  {/* Selected Items Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Order Summary</h4>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        ← Edit Items
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.selectedItems.length}</span>
                      </div>
                      {wizardData.multiSupplierMode && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Suppliers:</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {getUniqueSuppliers(wizardData.selectedItems).length} ({orderSplitMode === 'split' ? 'Will split' : 'Mixed'})
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t-2 border-gray-200 dark:border-gray-600">
                        <span className="text-gray-900 dark:text-white font-semibold">Estimated Total:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ₱{calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Review Your Order</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Please review all details before submitting
                  </p>
                </div>

                {/* Order Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Items</h4>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{wizardData.selectedItems.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {wizardData.selectedItems.reduce((sum, item) => sum + (item.custom_quantity || 0), 0)} total units
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Priority</h4>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 capitalize">{wizardData.priority}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {wizardData.expectedDeliveryDate ? new Date(wizardData.expectedDeliveryDate).toLocaleDateString() : 'No date set'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Total Value</h4>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">₱{calculateTotal().toFixed(2)}</p>
                  </div>
                </div>

                {/* Detailed Items Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">Order Items</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Item No.</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Item Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Supplier</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Order Qty</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Delivery</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Price/Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {wizardData.selectedItems.map((item, index) => (
                          <tr key={item.item_no} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-200">#{item.item_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 font-medium">{item.item_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.supplier || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900 dark:text-gray-200">{item.custom_quantity}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                              {item.delivery_method === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-200">₱{(Number(item.price_per_unit) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-200">
                              ₱{((item.custom_quantity || 0) * (Number(item.price_per_unit) || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                        <tr>
                          <td colSpan={6} className="px-4 py-4 text-right text-sm font-bold text-gray-900 dark:text-white uppercase">
                            Grand Total:
                          </td>
                          <td className="px-4 py-4 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                            ₱{calculateTotal().toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Notes Display */}
                {wizardData.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Order Notes
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{wizardData.notes}</p>
                  </div>
                )}

                {/* Export Options */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Options
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Preview and export this order before or after submitting:
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Export as PDF</span>
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Export as Excel/CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep > 1) setCurrentStep(currentStep - 1)
                else handleClose()
              }}
              className="px-6 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep} of {steps.length}
              </div>
            </div>

            <button
              onClick={() => {
                if (currentStep < 3) setCurrentStep(currentStep + 1)
                else handleSubmit()
              }}
              disabled={
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3)
              }
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all font-semibold shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 3 ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Order
                </>
              ) : (
                <>
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default CreatePurchaseOrderWizard
