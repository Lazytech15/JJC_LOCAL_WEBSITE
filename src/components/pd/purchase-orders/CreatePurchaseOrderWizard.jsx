import { useState, useEffect } from "react"
import { ModalPortal } from "../shared"
import apiService from "../../../utils/api/api-service"
import { exportPurchaseOrderToPDF, exportPurchaseOrderToExcel } from "../../../utils/purchase-order-export"

function CreatePurchaseOrderWizard({ isOpen, onClose, onSuccess, editingOrder = null }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Available data from API
  const [suppliers, setSuppliers] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [poPrefix, setPoPrefix] = useState("")
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1 - PO Number & Supplier
    supplier_name: "",
    supplier_address: "",
  supplier_details: null,
    po_number: "",
    po_sequence: "",
    
    // Step 2 - Items
    selectedItems: [],
    
    // Step 3 - Tax & Discount
    apply_tax: true, // New: Tax checkbox - defaults to true for backward compatibility
    tax_type: "goods", // goods (1%), services (2%), rental (5%)
    has_discount: false,
    discount_percentage: 0,
    
    // Step 4 - Details
    attention_person: "",
    terms: "",
    po_date: new Date().toISOString().split('T')[0],
    prepared_by: [''], // Changed to array for multiple people, initialize with one empty string
    verified_by: "",
    approved_by: "",
    notes: ""
  })
  
  // Validation states
  const [poNumberStatus, setPoNumberStatus] = useState({
    checking: false,
    exists: false,
    message: ""
  })
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [existingPO, setExistingPO] = useState(null)

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeWizard()
    }
  }, [isOpen])

  // Editing purchase orders was removed; this wizard always creates new POs now.

  const initializeWizard = async () => {
    try {
      setLoading(true)
      
      // Fetch ALL items to identify restock needs (same logic as RestockList)
      const allItemsData = await apiService.items.getItems({ limit: 10000 })
      
      console.log("Raw API response:", allItemsData)
      
      if (allItemsData.success) {
        const allItems = allItemsData.data || allItemsData.items || []
        
        console.log("Total items fetched:", allItems.length)
        console.log("Sample item structure:", allItems[0])
        
        // Trust the database trigger - it automatically sets item_status
        const normalizeStatus = (dbStatus) => {
          if (!dbStatus) return "In Stock"
          const status = String(dbStatus).trim()
          // Database returns: "Out of Stock", "Low in Stock", "In Stock"
          if (status === "Out of Stock") return "Out Of Stock"
          if (status === "Low in Stock") return "Low In Stock"
          if (status === "In Stock") return "In Stock"
          return "In Stock"
        }
        
        // Filter items needing restock (Out of Stock or Low in Stock)
        const restockItems = allItems
          .map(i => ({
            ...i,
            __status: normalizeStatus(i.item_status) // Trust database trigger
          }))
          .filter(i => {
            const needsRestock = i.__status === "Out Of Stock" || i.__status === "Low In Stock"
            if (needsRestock) {
              console.log(`Item needing restock: ${i.item_no} - ${i.item_name} (${i.__status}) - DB status: ${i.item_status}`)
            }
            return needsRestock
          })
        
        console.log("Total items needing restock:", restockItems.length)
        console.log("Restock items:", restockItems)
        
        // Group by supplier and count items
        const supplierMap = new Map()
        restockItems.forEach(item => {
          const supplier = item.supplier || item.supplier_name || 'N/A'
          if (!supplierMap.has(supplier)) {
            supplierMap.set(supplier, {
              name: supplier,
              item_count: 0
            })
          }
          supplierMap.get(supplier).item_count++
        })
        
        // Convert to array, filter out zero counts, and sort by item count
        const suppliersList = Array.from(supplierMap.values())
          .filter(s => s.item_count > 0)
          .sort((a, b) => b.item_count - a.item_count)
        
        console.log("Suppliers needing restock:", suppliersList)
        setSuppliers(suppliersList)
      }
      
      // Fetch PO prefix (MMYY) using apiService
      const prefixData = await apiService.purchaseOrders.generatePOPrefix()
      
      if (prefixData.success) {
        setPoPrefix(prefixData.prefix)
      }
      
      setLoading(false)
    } catch (err) {
      console.error("Error initializing wizard:", err)
      setError("Failed to load data. Please try again.")
      setLoading(false)
    }
  }

  // Fetch items when supplier is selected
  useEffect(() => {
    if (formData.supplier_name) {
      fetchSupplierItems(formData.supplier_name)
    } else {
      setAvailableItems([])
    }
  }, [formData.supplier_name])

  const fetchSupplierItems = async (supplier) => {
    try {
      // Fetch all items and trust database trigger for status
      const data = await apiService.items.getItems({ limit: 10000 })
      
      if (data.success) {
        const allItems = data.data || data.items || []
        
        // Trust the database trigger - it automatically sets item_status
        const normalizeStatus = (dbStatus) => {
          if (!dbStatus) return "In Stock"
          const status = String(dbStatus).trim()
          // Database returns: "Out of Stock", "Low in Stock", "In Stock"
          if (status === "Out of Stock") return "Out Of Stock"
          if (status === "Low in Stock") return "Low In Stock"
          if (status === "In Stock") return "In Stock"
          return "In Stock"
        }
        
        // Filter items: matching supplier AND needing restock
        const filteredItems = allItems
          .map(i => ({
            ...i,
            __status: normalizeStatus(i.item_status), // Trust database trigger
            __shortage: Math.max((Number(i.min_stock) || 0) - (Number(i.balance) || 0), 0),
            __recommended_order: Math.max(Math.max((Number(i.min_stock) || 0) - (Number(i.balance) || 0), 0), 1)
          }))
          .filter(item => {
            const itemSupplier = item.supplier || item.supplier_name || 'N/A'
            const needsRestock = item.__status === "Out Of Stock" || item.__status === "Low In Stock"
            return itemSupplier === supplier && needsRestock
          })
          .sort((a, b) => {
            // Out of stock first
            const pri = (s) => (s === "Out Of Stock" ? 0 : s === "Low In Stock" ? 1 : 2)
            const pA = pri(a.__status)
            const pB = pri(b.__status)
            if (pA !== pB) return pA - pB
            // Then by highest shortage
            if (b.__shortage !== a.__shortage) return b.__shortage - a.__shortage
            return 0
          })
        
        console.log(`Items needing restock from ${supplier}:`, filteredItems.length)
        setAvailableItems(filteredItems)
      }
    } catch (err) {
      console.error("Error fetching supplier items:", err)
    }
  }

  // Check PO number availability (debounced)
  useEffect(() => {
    if (formData.po_sequence && formData.po_sequence.length === 3) {
      const timer = setTimeout(() => {
        checkPONumber(`${poPrefix}-${formData.po_sequence}`)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setPoNumberStatus({ checking: false, exists: false, message: "" })
    }
  }, [formData.po_sequence, poPrefix])

  const checkPONumber = async (poNumber) => {
    try {
      setPoNumberStatus({ checking: true, exists: false, message: "Checking..." })
      
      const data = await apiService.purchaseOrders.checkPONumber(poNumber)
      
      if (data.success) {
        setPoNumberStatus({
          checking: false,
          exists: data.exists,
          message: data.message
        })
        
        if (data.exists) {
          setExistingPO(data.po_data)
        }
      }
    } catch (err) {
      console.error("Error checking PO number:", err)
      setPoNumberStatus({ checking: false, exists: false, message: "Error checking availability" })
    }
  }

  const handleSupplierSelect = async (supplierName) => {
    const supplier = suppliers.find(s => s.name === supplierName)
    
    // Fetch full supplier details from suppliers API
    let supplierAddress = ""
    try {
      const suppliersData = await apiService.suppliers.getSuppliers({ name: supplierName })
      if (suppliersData.success && suppliersData.suppliers && suppliersData.suppliers.length > 0) {
        const supplierDetails = suppliersData.suppliers[0]
        // Build full address from supplier record
        supplierAddress = apiService.suppliers.getFullAddress(supplierDetails)
        // Save supplier details into form data
        setFormData(prev => ({ ...prev, supplier_details: supplierDetails }))
      }
    } catch (err) {
      console.error("Error fetching supplier details:", err)
      // Fallback to supplier object if available
      supplierAddress = supplier?.supplier_address || ""
    }
    
    setFormData(prev => ({
      ...prev,
      supplier_name: supplierName,
      supplier_address: supplierAddress,
      selectedItems: [] // Clear items when changing supplier
    }))
  }

  const handleSequenceChange = (value) => {
    // Only allow 3 digits
    const cleaned = value.replace(/\D/g, '').slice(0, 3)
    setFormData(prev => ({
      ...prev,
      po_sequence: cleaned,
      po_number: cleaned.length === 3 ? `${poPrefix}-${cleaned}` : ""
    }))
  }

  const handleAddItem = (item) => {
    const isAlreadyAdded = formData.selectedItems.some(i => i.item_no === item.item_no)
    if (isAlreadyAdded) return

    setFormData(prev => ({
      ...prev,
      selectedItems: [...prev.selectedItems, {
        item_no: item.item_no,
        item_name: item.item_name,
        description: item.description || "",
        quantity: 1,
        unit: "pcs",
        price_per_unit: Number(item.price_per_unit) || 0,
        amount: Number(item.price_per_unit) || 0
      }]
    }))
  }

  const handleRemoveItem = (itemNo) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(i => i.item_no !== itemNo)
    }))
  }

  const handleUpdateItem = (itemNo, field, value) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(item => {
        if (item.item_no === itemNo) {
          // Convert numeric fields to numbers
          let processedValue = value
          if (field === 'quantity' || field === 'price_per_unit') {
            processedValue = Number(value) || 0
          }
          
          const updated = { ...item, [field]: processedValue }
          
          // Recalculate amount if quantity or price changes
          if (field === 'quantity' || field === 'price_per_unit') {
            updated.amount = (Number(updated.quantity) || 0) * (Number(updated.price_per_unit) || 0)
          }
          
          return updated
        }
        return item
      })
    }))
  }

  const calculateTotal = () => {
    return formData.selectedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }

  // Tax calculation functions
  const getTaxRate = () => {
    if (!formData.apply_tax) return 0 // No tax when apply_tax is false
    switch(formData.tax_type) {
      case 'goods': return 0.01 // 1%
      case 'services': return 0.02 // 2%
      case 'rental': return 0.05 // 5%
      default: return 0.01
    }
  }

  const calculateTaxBreakdown = () => {
    const totalBeforeWithholdingTax = calculateTotal() // TBWT
    const subtotal = formData.apply_tax ? totalBeforeWithholdingTax / 1.12 : totalBeforeWithholdingTax // Remove 12% VAT only if tax is applied
    const taxRate = getTaxRate()
    const withholdingTax = subtotal * taxRate
    const totalAfterWithholdingTax = totalBeforeWithholdingTax - withholdingTax
    
    // Calculate discount
    const discountAmount = formData.has_discount 
      ? totalAfterWithholdingTax * (Number(formData.discount_percentage) / 100)
      : 0
    
    const grandTotal = totalAfterWithholdingTax - discountAmount

    return {
      totalBeforeWithholdingTax,
      subtotal,
      taxRate: taxRate * 100, // Convert to percentage for display
      withholdingTax,
      totalAfterWithholdingTax,
      discountPercentage: formData.has_discount ? Number(formData.discount_percentage) : 0,
      discountAmount,
      grandTotal,
      applyTax: formData.apply_tax // Include flag for export functions
    }
  }

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.supplier_name) {
        setError("Please select a supplier")
        return
      }
      if (!formData.po_number) {
        setError("Please enter a valid 3-digit PO sequence")
        return
      }
      if (poNumberStatus.exists) {
        setShowOverwriteModal(true)
        return
      }
    }
    
    if (currentStep === 2) {
      if (formData.selectedItems.length === 0) {
        setError("Please add at least one item")
        return
      }
    }
    
    if (currentStep === 3) {
      // Tax & discount validation - only validate tax type if tax is applied
      if (formData.apply_tax && formData.has_discount && (!formData.discount_percentage || formData.discount_percentage <= 0)) {
        setError("Please enter a valid discount percentage")
        return
      }
    }
    
    if (currentStep === 4) {
      if (!formData.prepared_by || !formData.verified_by || !formData.approved_by) {
        setError("Please fill in all signature fields")
        return
      }
    }
    
    setError(null)
    setCurrentStep(prev => prev + 1)
  }

  // Validation helper used for guarded breadcrumb navigation
  const validateForStep = (step) => {
    if (step === 1) {
      if (!formData.supplier_name) return false
      if (!formData.po_number) return false
      if (poNumberStatus.exists) return false
    }
    if (step === 2) {
      if (!formData.selectedItems || formData.selectedItems.length === 0) return false
    }
    if (step === 3) {
      // Tax & discount step - always valid as defaults are set
      return true
    }
    if (step === 4) {
      // partial checks for details
      // allow navigation if prepared_by exists (array) and terms present
      if (!formData.prepared_by || formData.prepared_by.filter(p => p && p.trim()).length === 0) return false
    }
    return true
  }

  const canJumpToStep = (target) => {
    if (target <= currentStep) return true
    for (let s = currentStep; s < target; s++) {
      if (!validateForStep(s)) return false
    }
    return true
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async (overwriteExisting = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate tax breakdown for submission
      const taxBreakdown = calculateTaxBreakdown()
      
      const orderData = {
        po_number: formData.po_number,
        supplier_name: formData.supplier_name,
        supplier_address: formData.supplier_address,
        supplier_details: formData.supplier_details || null,
        attention_person: formData.attention_person,
        terms: formData.terms,
        po_date: formData.po_date,
        prepared_by: formData.prepared_by.filter(p => p.trim()).join(', '), // Convert array to comma-separated string
        verified_by: formData.verified_by,
        approved_by: formData.approved_by,
        notes: formData.notes,
        // Tax and discount information
        apply_tax: formData.apply_tax,
        tax_type: formData.tax_type,
        has_discount: formData.has_discount,
        discount_percentage: formData.has_discount ? formData.discount_percentage : 0,
        // Tax breakdown
        subtotal: taxBreakdown.subtotal,
        withholding_tax_amount: taxBreakdown.withholdingTax,
        discount_amount: taxBreakdown.discountAmount,
        grand_total: taxBreakdown.grandTotal,
        items: formData.selectedItems.map(item => ({
          item_no: item.item_no,
          quantity: item.quantity,
          unit: item.unit,
          price_per_unit: item.price_per_unit
        })),
        overwrite_existing: overwriteExisting
      }
      let data
      data = await apiService.purchaseOrders.createPurchaseOrder(orderData)
      
      if (data.success) {
        onSuccess(`Purchase Order ${formData.po_number} created successfully!`)
        handleClose()
      } else {
        throw new Error(data.message || "Failed to create purchase order")
      }
    } catch (err) {
      console.error("Error submitting PO:", err)
      
      // Check if it's a conflict error (PO already exists)
      if (err.message && err.message.includes('already exists')) {
        setError(err.message)
        setShowOverwriteModal(true)
      } else {
        setError(err.message || "Failed to create purchase order")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setFormData({
      supplier_name: "",
      supplier_address: "",
      po_number: "",
      po_sequence: "",
      selectedItems: [],
      apply_tax: true,
      tax_type: "goods",
      has_discount: false,
      discount_percentage: 0,
      attention_person: "",
      terms: "",
      po_date: new Date().toISOString().split('T')[0],
      prepared_by: [''],
      verified_by: "",
      approved_by: "",
      notes: ""
    })
    setPoNumberStatus({ checking: false, exists: false, message: "" })
    setError(null)
    setShowOverwriteModal(false)
    setExistingPO(null)
    onClose()
  }

  if (!isOpen) return null

  const steps = [
    { number: 1, title: "PO Number & Supplier", icon: "🏭" },
    { number: 2, title: "Select Items", icon: "📦" },
    { number: 3, title: "Tax & Discount", icon: "💰" },
    { number: 4, title: "PO Details", icon: "📝" },
    { number: 5, title: "Review & Submit", icon: "✅" }
  ]

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Create Purchase Order</h2>
                <p className="text-blue-100 text-sm mt-1">JJC Engineering Receipt Format</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Step Progress */}
            <div className="mt-6 flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!canJumpToStep(step.number)) {
                        setError('Please complete required fields before jumping ahead')
                        return
                      }
                      setError(null)
                      setCurrentStep(step.number)
                    }}
                    className="flex flex-col items-center flex-1"
                    aria-current={currentStep === step.number}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold
                      transition-all duration-300
                      ${currentStep >= step.number 
                        ? 'bg-white text-blue-600 shadow-lg' 
                        : 'bg-blue-500/30 text-white'
                      }
                    `}>
                      {currentStep > step.number ? '✓' : step.icon}
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium text-center
                      ${currentStep >= step.number ? 'text-white' : 'text-blue-200'}
                    `}>
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-2 rounded-full transition-all duration-300
                      ${currentStep > step.number ? 'bg-white' : 'bg-blue-500/30'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <span className="text-red-600 dark:text-red-400 text-2xl">⚠️</span>
              <span className="text-red-800 dark:text-red-300 font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Step 1: PO Number & Supplier */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 PO Number Format</h3>
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        Purchase Orders must follow the <strong>MMYY-XXX</strong> format (e.g., 1025-015)
                      </p>
                    </div>

                    {/* Supplier Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Select Supplier *
                      </label>
                      <select
                        value={formData.supplier_name}
                        onChange={(e) => handleSupplierSelect(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">-- Choose a supplier --</option>
                        {suppliers.map((supplier, index) => (
                          <option key={`${supplier.name}-${index}`} value={supplier.name}>
                            {supplier.name} ({supplier.item_count} items)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PO Number Generation */}
                    {formData.supplier_name && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Purchase Order Number *
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600">
                              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {poPrefix}-
                              </span>
                            </div>
                            <input
                              type="text"
                              value={formData.po_sequence}
                              onChange={(e) => handleSequenceChange(e.target.value)}
                              placeholder="000"
                              maxLength="3"
                              className="w-32 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-2xl font-bold text-center
                                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                            {poNumberStatus.checking && (
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                            )}
                            {!poNumberStatus.checking && formData.po_sequence.length === 3 && (
                              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                                poNumberStatus.exists 
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              }`}>
                                <span className="text-xl">
                                  {poNumberStatus.exists ? '⚠️' : '✅'}
                                </span>
                                <span className="font-medium text-sm">
                                  {poNumberStatus.message}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Enter a 3-digit sequence number (001-999)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Supplier Address
                          </label>
                          <textarea
                            value={formData.supplier_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, supplier_address: e.target.value }))}
                            rows="3"
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            placeholder="Enter supplier's complete address..."
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-start gap-1">
                            <span className="mt-0.5">ℹ️</span>
                            <span>
                              This address will be saved for future reference. You can edit or update it anytime when creating new purchase orders.
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Items */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        📦 Items from {formData.supplier_name}
                      </h3>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Only items from this supplier can be added to this purchase order
                      </p>
                    </div>

                    {/* Selected Items */}
                    {formData.selectedItems.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            Selected Items ({formData.selectedItems.length})
                          </h4>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {formData.selectedItems.map(item => (
                            <div key={item.item_no} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                                    #{item.item_no} - {item.item_name}
                                  </div>
                                  {item.description && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {item.description}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-4 gap-3 mt-3">
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Quantity</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(item.item_no, 'quantity', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Unit</label>
                                      <select
                                        value={item.unit}
                                        onChange={(e) => handleUpdateItem(item.item_no, 'unit', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                      >
                                        <option value="pcs">pcs</option>
                                        <option value="pc5">pc5</option>
                                        <option value="sets">sets</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Price/Unit</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.price_per_unit}
                                        onChange={(e) => handleUpdateItem(item.item_no, 'price_per_unit', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Amount</label>
                                      <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        ₱{item.amount.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveItem(item.item_no)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Total Amount:</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ₱{calculateTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Available Items */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Available Items ({availableItems.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {availableItems.map(item => {
                          const isAdded = formData.selectedItems.some(i => i.item_no === item.item_no)
                          return (
                            <div
                              key={item.item_no}
                              className={`p-4 border-2 rounded-lg transition-all ${
                                isAdded
                                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    #{item.item_no} - {item.item_name}
                                  </div>
                                  {item.description && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                      {item.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      item.status === 'Out Of Stock'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        : item.status === 'Low In Stock'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                      {item.status}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      ₱{Number(item.price_per_unit || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => !isAdded && handleAddItem(item)}
                                  disabled={isAdded}
                                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                                    isAdded
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {isAdded ? '✓ Added' : '+ Add'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        {availableItems.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                            No items available from this supplier
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Tax & Discount */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                        💰 Tax Calculation & Discounts
                      </h3>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                        Configure withholding tax type and optional discounts for this purchase order
                      </p>
                    </div>

                    {/* Apply Tax Checkbox */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="applyTax"
                          checked={formData.apply_tax}
                          onChange={(e) => setFormData(prev => ({ ...prev, apply_tax: e.target.checked }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="applyTax" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
                          Apply Withholding Tax
                        </label>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.apply_tax 
                          ? "Tax calculations will be applied (12% VAT removal + withholding tax)" 
                          : "No tax calculations will be applied - simple total only"
                        }
                      </p>
                    </div>

                    {/* Tax Type Selection - Only show if tax is applied */}
                    {formData.apply_tax && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Withholding Tax Type *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { value: 'goods', label: 'Goods', rate: '1%', description: 'For physical goods and materials' },
                            { value: 'services', label: 'Services', rate: '2%', description: 'For service-based transactions' },
                            { value: 'rental', label: 'Rental', rate: '5%', description: 'For rental and lease agreements' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, tax_type: option.value }))}
                              className={`p-4 rounded-lg border-2 transition-all text-left ${
                                formData.tax_type === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{option.label}</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{option.rate}</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
                              {formData.tax_type === option.value && (
                                <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Selected
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}                    {/* Tax Calculation Preview */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {formData.apply_tax ? "Tax Calculation Breakdown" : "Total Calculation"}
                      </h4>
                      <div className="space-y-3">
                        {(() => {
                          const breakdown = calculateTaxBreakdown()
                          return (
                            <>
                              <div className="flex justify-between items-center pb-2 border-b border-gray-300 dark:border-gray-600">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {formData.apply_tax ? "Total Before Withholding Tax (TBWT)" : "Total Amount"}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">₱{breakdown.totalBeforeWithholdingTax.toFixed(2)}</span>
                              </div>
                              
                              {formData.apply_tax && (
                                <>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">÷ 1.12 (Remove 12% VAT)</span>
                                    <span></span>
                                  </div>
                                  <div className="flex justify-between items-center pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal (Gross Total)</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">₱{breakdown.subtotal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Withholding Tax ({breakdown.taxRate}%)</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">- ₱{breakdown.withholdingTax.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pb-2 border-b-2 border-gray-400 dark:border-gray-500">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total After Withholding Tax</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">₱{breakdown.totalAfterWithholdingTax.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                              
                              {breakdown.discountAmount > 0 && (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Discount ({breakdown.discountPercentage}%)</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">- ₱{breakdown.discountAmount.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                              
                              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400 dark:border-gray-500">
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">₱{breakdown.grandTotal.toFixed(2)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Discount Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="hasDiscount"
                          checked={formData.has_discount}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            has_discount: e.target.checked,
                            discount_percentage: e.target.checked ? prev.discount_percentage : 0
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="hasDiscount" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
                          Apply Discount
                        </label>
                      </div>
                      
                      {formData.has_discount && (
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Discount Percentage (%)
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.discount_percentage}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                discount_percentage: Math.max(0, Math.min(100, Number(e.target.value)))
                              }))}
                              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg font-semibold
                                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                              placeholder="Enter discount percentage (0-100)"
                            />
                            <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">%</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Enter a value between 0 and 100
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: PO Details */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        📝 Purchase Order Details
                      </h3>
                      <p className="text-purple-700 dark:text-purple-300 text-sm">
                        Fill in the required details for the purchase order
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Attention Person
                        </label>
                        <input
                          type="text"
                          value={formData.attention_person}
                          onChange={(e) => setFormData(prev => ({ ...prev, attention_person: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="Contact person name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Terms *
                        </label>
                        <input
                          type="text"
                          value={formData.terms}
                          onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="e.g., 30-DAYS, 60-DAYS, 90-DAYS, COD"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          PO Date *
                        </label>
                        <input
                          type="date"
                          value={formData.po_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Prepared By * (Multiple people allowed)
                        </label>
                        <div className="space-y-2">
                          {formData.prepared_by.map((person, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={person}
                                onChange={(e) => {
                                  const newPreparedBy = [...formData.prepared_by]
                                  newPreparedBy[index] = e.target.value
                                  setFormData(prev => ({ ...prev, prepared_by: newPreparedBy }))
                                }}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder={`Person ${index + 1} name`}
                              />
                              {formData.prepared_by.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPreparedBy = formData.prepared_by.filter((_, i) => i !== index)
                                    setFormData(prev => ({ ...prev, prepared_by: newPreparedBy }))
                                  }}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, prepared_by: [...prev.prepared_by, ''] }))
                            }}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm"
                          >
                            + Add Another Person
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Verified By *
                        </label>
                        <input
                          type="text"
                          value={formData.verified_by}
                          onChange={(e) => setFormData(prev => ({ ...prev, verified_by: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="Name of person verifying"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Approved By *
                        </label>
                        <input
                          type="text"
                          value={formData.approved_by}
                          onChange={(e) => setFormData(prev => ({ ...prev, approved_by: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="Name of person approving"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Notes / Additional Information
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows="4"
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Any additional notes or special instructions..."
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Review & Submit */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    {/* Receipt Preview */}
                    <div className="bg-white border-4 border-gray-900 rounded-lg p-8 shadow-lg">
                      {/* Header */}
                      <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
                        <h2 className="text-3xl font-bold text-gray-900">JJC ENGINEERING</h2>
                        <p className="text-sm text-gray-700 mt-1">Purchase Order</p>
                      </div>

                      {/* PO Info */}
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <div className="text-sm text-gray-700">P.O.#</div>
                          <div className="text-2xl font-bold text-gray-900">{formData.po_number}</div>
                          <div className="text-sm text-gray-800 mt-2">Date: {formData.po_date}</div>
                          <div className="text-sm text-gray-800">Terms: {formData.terms}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">SUPPLIER:</div>
                          <div className="font-bold text-gray-900">{formData.supplier_name}</div>
                          <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                            {formData.supplier_address}
                          </div>
                          {formData.supplier_details && (
                            <div className="mt-3 text-sm text-gray-700 space-y-1">
                              <div><strong>Contact:</strong> {formData.supplier_details.contact_person || formData.supplier_details.contact || 'N/A'}</div>
                              <div><strong>Email:</strong> {formData.supplier_details.email || 'N/A'}</div>
                              <div><strong>Phone:</strong> {formData.supplier_details.phone || 'N/A'}</div>
                              <div><strong>Payment Terms:</strong> {formData.supplier_details.payment_terms || 'N/A'}</div>
                              <div><strong>Tax ID:</strong> {formData.supplier_details.tax_id || 'N/A'}</div>
                              <div><strong>Website:</strong> {formData.supplier_details.website || 'N/A'}</div>
                            </div>
                          )}
                          {formData.attention_person && (
                            <div className="text-sm text-gray-800 mt-2">
                              Attn: {formData.attention_person}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items Table */}
                      <table className="w-full border-collapse border-2 border-gray-900 mb-6">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-900 px-3 py-2 text-left text-sm font-bold text-gray-900">ITEM</th>
                            <th className="border border-gray-900 px-3 py-2 text-center text-sm font-bold text-gray-900">QTY</th>
                            <th className="border border-gray-900 px-3 py-2 text-center text-sm font-bold text-gray-900">UNIT</th>
                            <th className="border border-gray-900 px-3 py-2 text-left text-sm font-bold text-gray-900">DESCRIPTION</th>
                            <th className="border border-gray-900 px-3 py-2 text-right text-sm font-bold text-gray-900">UNIT PRICE</th>
                            <th className="border border-gray-900 px-3 py-2 text-right text-sm font-bold text-gray-900">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.selectedItems.map((item, index) => (
                            <tr key={item.item_no} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-900 px-3 py-2 text-sm text-gray-900">#{item.item_no}</td>
                              <td className="border border-gray-900 px-3 py-2 text-center text-sm text-gray-900">{item.quantity}</td>
                              <td className="border border-gray-900 px-3 py-2 text-center text-sm text-gray-900">{item.unit}</td>
                              <td className="border border-gray-900 px-3 py-2 text-sm text-gray-900">{item.item_name}</td>
                              <td className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-900">{item.price_per_unit.toFixed(2)}</td>
                              <td className="border border-gray-900 px-3 py-2 text-right text-sm font-semibold text-gray-900">{item.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                          {(() => {
                            const breakdown = calculateTaxBreakdown()
                            return (
                              <>
                                {/* Subtotal Row - Different based on tax application */}
                                {formData.apply_tax ? (
                                  <>
                                    <tr className="bg-gray-100">
                                      <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right font-semibold text-gray-900">
                                        GROSS TOTAL (with 12% VAT):
                                      </td>
                                      <td className="border border-gray-900 px-3 py-2 text-right font-bold text-gray-900">
                                        ₱{breakdown.totalBeforeWithholdingTax.toFixed(2)}
                                      </td>
                                    </tr>
                                    {/* Subtotal after VAT removal */}
                                    <tr className="bg-white">
                                      <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-700">
                                        Subtotal (Gross Total ÷ 1.12):
                                      </td>
                                      <td className="border border-gray-900 px-3 py-2 text-right font-semibold text-gray-900">
                                        ₱{breakdown.subtotal.toFixed(2)}
                                      </td>
                                    </tr>
                                    {/* Withholding Tax */}
                                    <tr className="bg-white">
                                      <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-700">
                                        Less: Withholding Tax ({breakdown.taxRate}% - {formData.tax_type.charAt(0).toUpperCase() + formData.tax_type.slice(1)}):
                                      </td>
                                      <td className="border border-gray-900 px-3 py-2 text-right font-semibold text-red-700">
                                        (₱{breakdown.withholdingTax.toFixed(2)})
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <tr className="bg-gray-100">
                                    <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right font-semibold text-gray-900">
                                      TOTAL AMOUNT:
                                    </td>
                                    <td className="border border-gray-900 px-3 py-2 text-right font-bold text-gray-900">
                                      ₱{breakdown.totalBeforeWithholdingTax.toFixed(2)}
                                    </td>
                                  </tr>
                                )}
                                {/* Discount if applicable */}
                                {breakdown.discountAmount > 0 && (
                                  <tr className="bg-white">
                                    <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-700">
                                      Less: Discount ({breakdown.discountPercentage}%):
                                    </td>
                                    <td className="border border-gray-900 px-3 py-2 text-right font-semibold text-red-700">
                                      (₱{breakdown.discountAmount.toFixed(2)})
                                    </td>
                                  </tr>
                                )}
                                {/* Grand Total */}
                                <tr className="bg-gray-200">
                                  <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right font-bold text-gray-900">
                                    GRAND TOTAL:
                                  </td>
                                  <td className="border border-gray-900 px-3 py-2 text-right font-bold text-lg text-green-700">
                                    ₱{breakdown.grandTotal.toFixed(2)}
                                  </td>
                                </tr>
                              </>
                            )
                          })()}
                        </tbody>
                      </table>

                      {/* Signatures */}
                      <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-gray-900">
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Prepared by:</div>
                          <div className="space-y-2">
                            {formData.prepared_by.filter(p => p.trim()).map((person, idx) => (
                              <div key={idx}>
                                <div className="font-semibold text-gray-900">{person}</div>
                                <div className="border-t border-gray-400 mt-6"></div>
                                <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Verified by:</div>
                          <div className="font-semibold text-gray-900">{formData.verified_by}</div>
                          <div className="border-t border-gray-400 mt-8"></div>
                          <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Approved by:</div>
                          <div className="font-semibold text-gray-900">{formData.approved_by}</div>
                          <div className="border-t border-gray-400 mt-8"></div>
                          <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                        </div>
                      </div>

                      {/* Notes */}
                      {formData.notes && (
                        <div className="mt-6 pt-4 border-t border-gray-300">
                          <div className="text-sm font-semibold text-gray-800">Notes:</div>
                          <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                            {formData.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Export Buttons */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <button
                        onClick={() => exportPurchaseOrderToPDF(formData)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Export PDF
                      </button>
                      <button
                        onClick={() => exportPurchaseOrderToExcel(formData)}
                        className="px-6 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        ← Edit Details
                      </button>
                      <button
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Submit Purchase Order
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Navigation */}
          {currentStep < 5 && !loading && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <button
                onClick={currentStep === 1 ? handleClose : handleBack}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {currentStep === 1 ? 'Cancel' : '← Back'}
              </button>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep} of 5
              </div>
              
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Overwrite Confirmation Modal */}
        {showOverwriteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Purchase Order Already Exists
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  PO# <strong>{formData.po_number}</strong> already exists. What would you like to do?
                </p>
              </div>
              
              {existingPO && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                  <div className="text-sm text-yellow-900 dark:text-yellow-100">
                    <div><strong>Supplier:</strong> {existingPO.supplier_name}</div>
                    <div><strong>Date:</strong> {existingPO.po_date}</div>
                    <div><strong>Items:</strong> {existingPO.item_count} item(s)</div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOverwriteModal(false)
                    setFormData(prev => ({ ...prev, po_sequence: "", po_number: "" }))
                    setCurrentStep(1)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Change Number
                </button>
                <button
                  onClick={() => {
                    setShowOverwriteModal(false)
                    handleSubmit(true)
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Overwrite Existing
                </button>
              </div>
              
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="w-full mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}

export default CreatePurchaseOrderWizard
