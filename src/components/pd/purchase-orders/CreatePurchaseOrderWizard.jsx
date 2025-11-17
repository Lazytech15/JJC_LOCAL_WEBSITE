import { useState, useEffect } from "react"
import { ModalPortal } from "../shared"
import apiService from "../../../utils/api/api-service"
import { exportPurchaseOrderToPDF } from "../../../utils/purchase-order-export"

function CreatePurchaseOrderWizard({ isOpen, onClose, onSuccess, editingOrder = null }) {
  // If editingOrder is provided, start at step 2 (skip PO Number & Supplier)
  const [currentStep, setCurrentStep] = useState(editingOrder ? 2 : 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Input mode toggles for flexibility
  const [supplierInputMode, setSupplierInputMode] = useState('inventory') // 'inventory' or 'custom'
  const [itemInputMode, setItemInputMode] = useState('inventory') // 'inventory' or 'custom'
  const [customItemCounter, setCustomItemCounter] = useState(0) // For generating unique IDs for custom items
  
  // Available data from API
  const [suppliers, setSuppliers] = useState([])
  // Map supplier name => full supplier record (from API) for exact lookup by name or id
  const [supplierLookup, setSupplierLookup] = useState({})
  const [availableItems, setAvailableItems] = useState([])
  const [poPrefix, setPoPrefix] = useState("")
  // Unit of measure options populated from /api/items (unique values)
  const [unitOptions, setUnitOptions] = useState([])

  // Close any open unit dropdowns when clicking outside
  useEffect(() => {
    const handleDocClick = () => {
      setFormData(prev => ({
        ...prev,
        selectedItems: (prev.selectedItems || []).map(i => ({ ...i, unit_dropdown_open: false }))
      }))
    }

    document.addEventListener('click', handleDocClick)
    return () => document.removeEventListener('click', handleDocClick)
  }, [])
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1 - PO Number & Supplier
    supplier_name: "",
    supplier_id: "",
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
    discount_type: "percentage", // "percentage" or "fixed"
    discount_value: 0, // Value for discount (percentage 0-100 or fixed amount in pesos)
    discount_percentage: 0, // Kept for backward compatibility
  // Priority levels: P0..P4 (P2 = Moderate default)
  priority: 'P2',
    
    // Step 4 - Details
    attention_person: "",
    terms: "",
    po_date: new Date().toISOString().split('T')[0],
    prepared_by: [''], // Changed to array for multiple people, initialize with one empty string
    verified_by: "",
    approved_by: "",
    notes: "",
    attached_images: [] // Array of base64 image data
  })

  // Custom item entry form state
  const [customItemForm, setCustomItemForm] = useState({
    item_name: '',
    description: '',
    quantity: 1,
    unit: '',
    price_per_unit: 0
  })

  // Helper to safely format currency numbers
  const formatAmount = (v, decimals = 2) => {
    const n = Number(v)
    if (!isFinite(n)) return (0).toFixed(decimals)
    return n.toFixed(decimals)
  }

  // Track which fields were auto-filled so we can show a badge and clear it on user edit
  const [autofilledFields, setAutofilledFields] = useState({
    supplier_address: false,
    attention_person: false,
    terms: false,
    notes: false
  })
  
  // Validation states
  const [poNumberStatus, setPoNumberStatus] = useState({
    checking: false,
    exists: false,
    message: ""
  })
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [existingPO, setExistingPO] = useState(null)
  const [showImagePreview, setShowImagePreview] = useState(false)

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
        
        console.log("🔍 Total items fetched:", allItems.length)
        console.log("🔍 Sample item structure:", allItems[0])
        
        // FIXED: Check actual stock levels instead of relying on item_status field
        // An item needs restocking if balance < min_stock OR balance = 0
        const restockItems = allItems.filter(i => {
          const balance = parseInt(i.balance) || 0
          const minStock = parseInt(i.min_stock) || 0
          
          // Item needs restock if: out of stock (balance = 0) OR low stock (balance < min_stock and min_stock > 0)
          const isOutOfStock = balance === 0
          const isLowStock = minStock > 0 && balance < minStock
          const needsRestock = isOutOfStock || isLowStock
          
          if (needsRestock) {
            console.log(`🔴 Item needing restock: ${i.item_no} - ${i.item_name} - Supplier: ${i.supplier} - Balance: ${balance} - Min: ${minStock}`)
          }
          
          return needsRestock
        })
        
        console.log("📊 Total items needing restock:", restockItems.length)
        console.log("📦 Restock items:", restockItems)
        
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
        let suppliersList = Array.from(supplierMap.values())
          .filter(s => s.item_count > 0)
          .sort((a, b) => b.item_count - a.item_count)

        console.log("🏢 Suppliers needing restock:", suppliersList.length, "suppliers")
        console.log("🏢 Supplier details:", suppliersList)
        console.log("🏷️ Supplier names from itemsdb:", suppliersList.map(s => s.name))

        // Fetch full suppliers from API to get IDs and additional info, then merge IDs where names match exactly
        try {
          console.log("🔵 Fetching suppliers from API...")
          const apiSuppliersResp = await apiService.suppliers.getSuppliers({ limit: 500 })
          console.log("🔵 API Response:", apiSuppliersResp)
          
          if (apiSuppliersResp.success && Array.isArray(apiSuppliersResp.suppliers)) {
            const apiSuppliers = apiSuppliersResp.suppliers
            console.log("✅ Suppliers from API:", apiSuppliers.length, "suppliers")
            console.log("📋 Supplier names from API:", apiSuppliers.map(s => s.name))
            
            const lookup = {}
            apiSuppliers.forEach(s => {
              if (s && s.name) {
                // Case-insensitive lookup for better matching
                lookup[s.name.toLowerCase().trim()] = s
              }
            })

            // Attach id (if available) to suppliersList entries using case-insensitive matching
            suppliersList = suppliersList.map(s => {
              const matchedSupplier = lookup[s.name.toLowerCase().trim()]
              if (matchedSupplier) {
                console.log(`✓ Matched: "${s.name}" with supplier ID ${matchedSupplier.id}`)
                return {
                  ...s,
                  id: matchedSupplier.id,
                  contact_person: matchedSupplier.contact_person,
                  email: matchedSupplier.email
                }
              } else {
                console.warn(`✗ No match found for supplier: "${s.name}"`)
                return s
              }
            })

            setSupplierLookup(lookup)
          } else {
            console.error("❌ API response not successful or suppliers not an array:", apiSuppliersResp)
          }
        } catch (err) {
          console.error('❌ Failed to fetch full suppliers for lookup:', err)
        }

        console.log("Final suppliers list:", suppliersList)
        setSuppliers(suppliersList)
        // Derive unique unit_of_measure values from all items and set as options
        try {
          const units = Array.from(new Set(allItems.map(i => (i.unit_of_measure || '').trim()).filter(u => u))).sort()
          // Add a couple sensible defaults if none present
          if (units.length === 0) {
            setUnitOptions(['pcs', 'sets', 'box'])
          } else {
            setUnitOptions(units)
          }
          console.log('Unit options initialized:', units)
        } catch (err) {
          console.warn('Failed to derive unit options', err)
        }
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

  // When editing, prefill the formData from the provided editingOrder
  useEffect(() => {
    if (editingOrder) {
      try {
        const po = editingOrder
        setFormData(prev => ({
          ...prev,
          supplier_name: po.supplier_name || po.supplier || prev.supplier_name,
          supplier_id: po.supplier_id || prev.supplier_id,
          supplier_address: po.supplier_address || po.supplier_address || prev.supplier_address,
          supplier_details: po.supplier_details || prev.supplier_details,
          // PO number fields retained but not editable in edit mode
          po_number: po.id || po.po_number || prev.po_number,
          po_sequence: (po.id || '').split('-')[1] || prev.po_sequence,
          // Items
          selectedItems: (po.items || []).map(i => {
            const qty = Number(i.quantity) || 0
            const price = Number(i.price_per_unit || i.unit_price || i.price) || 0
            const amt = qty * price
            return {
              item_no: i.item_no,
              item_name: i.item_name,
              quantity: qty,
              unit: i.unit || i.unit_of_measure || 'pcs',
              // normalize field names used elsewhere in the wizard
              price_per_unit: price,
              amount: amt,
              recommended_quantity: Number(i.recommended_quantity) || qty,
              delivery_method: i.delivery_method || 'delivery',
              unit_dropdown_open: false,
              custom_unit_active: false,
              custom_unit_value: ''
            }
          }),
          // Step 3 & 4 fields
          apply_tax: po.apply_tax ?? prev.apply_tax,
          tax_type: po.tax_type || prev.tax_type,
          has_discount: po.has_discount ?? prev.has_discount,
          discount_type: po.discount_type ?? prev.discount_type ?? "percentage",
          discount_value: po.discount_value ?? po.discount_percentage ?? prev.discount_value,
          discount_percentage: po.discount_percentage ?? prev.discount_percentage,
          attention_person: po.attention_person || prev.attention_person,
          terms: po.terms || prev.terms,
          po_date: po.po_date || prev.po_date,
          prepared_by: po.prepared_by ? (Array.isArray(po.prepared_by) ? po.prepared_by : [po.prepared_by]) : prev.prepared_by,
          verified_by: po.verified_by || prev.verified_by,
          approved_by: po.approved_by || prev.approved_by,
          notes: po.notes || prev.notes,
          attached_images: po.attached_images ? (typeof po.attached_images === 'string' ? JSON.parse(po.attached_images) : po.attached_images) : [],
          // preserve priority when editing if present (support legacy values too)
          priority: po.priority || po.priority_level || prev.priority
        }))

        // If editing, ensure we start at step 2
        setCurrentStep(2)
      } catch (e) {
        console.warn('Failed to prefill edit form from editingOrder', e)
      }
    }
  }, [editingOrder])

  // Fetch items when supplier is selected
  useEffect(() => {
    const supplierForFetch = formData.supplier_name || formData.supplier_id
    if (supplierForFetch) {
      // fetchSupplierItems expects supplier name; prefer supplier_name if available
      fetchSupplierItems(formData.supplier_name || supplierForFetch)
    } else {
      setAvailableItems([])
    }
  }, [formData.supplier_name, formData.supplier_id])

  const fetchSupplierItems = async (supplier) => {
    try {
      // Fetch all items
      const data = await apiService.items.getItems({ limit: 10000 })
      
      if (data.success) {
        const allItems = data.data || data.items || []
        
        console.log(`🔍 Fetching items for supplier: ${supplier}`)
        console.log(`🔍 Total items in database: ${allItems.length}`)
        
        // FIXED: Check actual stock levels instead of item_status field
        const filteredItems = allItems
          .map(i => {
            const balance = parseInt(i.balance) || 0
            const minStock = parseInt(i.min_stock) || 0
            const isOutOfStock = balance === 0
            const isLowStock = minStock > 0 && balance < minStock
            const needsRestock = isOutOfStock || isLowStock
            
            return {
              ...i,
              __status: isOutOfStock ? "Out Of Stock" : isLowStock ? "Low In Stock" : "In Stock",
              __shortage: Math.max(minStock - balance, 0),
              __recommended_order: Math.max(Math.max(minStock - balance, 0), 1),
              __needsRestock: needsRestock
            }
          })
          .filter(item => {
            const itemSupplier = item.supplier || item.supplier_name || 'N/A'
            const matchesSupplier = itemSupplier === supplier
            
            if (matchesSupplier && item.__needsRestock) {
              console.log(`✅ Item match: ${item.item_no} - ${item.item_name} - Balance: ${item.balance} - Min: ${item.min_stock}`)
            }
            
            return matchesSupplier && item.__needsRestock
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
        
        console.log(`📦 Items needing restock from ${supplier}:`, filteredItems.length)
        console.log(`📦 Items:`, filteredItems)
        setAvailableItems(filteredItems)
        // Update unit options from this fetch too (merge with existing)
        try {
          const units = Array.from(new Set(allItems.map(i => (i.unit_of_measure || '').trim()).filter(u => u))).sort()
          if (units.length > 0) {
            // Merge while preserving existing order (simple union)
            setUnitOptions(prev => {
              const set = new Set([...(prev || []), ...units])
              return Array.from(set)
            })
          }
        } catch (err) {
          console.warn('Failed to update unit options from supplier items', err)
        }
      }
    } catch (err) {
      console.error("Error fetching supplier items:", err)
    }
  }

  // Check PO number availability (debounced)
  useEffect(() => {
    // Only trigger PO number check when the sequence is exactly 3 digits (e.g. 001..999)
    const isValidSeq = /^\d{3}$/.test(formData.po_sequence)
    if (isValidSeq) {
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

      // If server returned a validation error or other non-success response (suppressErrors), handle it gracefully
      if (data && data.success === false) {
        setPoNumberStatus({ checking: false, exists: false, message: data.error || data.message || 'Invalid PO number' })
        return
      }

      if (data && data.success) {
        setPoNumberStatus({ checking: false, exists: data.exists, message: data.message })
        if (data.exists) setExistingPO(data.po_data)
      }
    } catch (err) {
      console.error("Error checking PO number:", err)
      const msg = (err && err.message) ? err.message : "Error checking availability"
      setPoNumberStatus({ checking: false, exists: false, message: msg })
    }
  }

  const handleSupplierSelect = async (selectedValue) => {
    // selectedValue may be an id (if available) or a supplier name
    let supplier = null
    if (!selectedValue) {
      supplier = null
    } else {
      // Try to find by id first
      supplier = suppliers.find(s => String(s.id) === String(selectedValue))
      if (!supplier) {
        // fallback to name match
        supplier = suppliers.find(s => s.name === selectedValue)
      }
    }

    // Prepare placeholders
    let supplierAddress = ""
    let attentionPerson = ""
    let terms = ""
    let notes = ""

    try {
      let supplierDetails = null

      // Prefer fetching by ID when available (most precise)
      if (supplier && supplier.id) {
        const resp = await apiService.suppliers.getSupplier(supplier.id)
        if (resp && resp.success) supplierDetails = resp
        // Some services return object directly
        if (resp && resp.data) supplierDetails = resp.data
      }

      // Fallback: try supplierLookup (populated during init) by name
      const lookupKey = supplier && supplier.name ? supplier.name : selectedValue
      if (!supplierDetails && supplierLookup[lookupKey]) {
        supplierDetails = supplierLookup[lookupKey]
      }

      // Final fallback: query by name (less reliable)
      if (!supplierDetails) {
        const queryName = supplier && supplier.name ? supplier.name : selectedValue
        const suppliersData = await apiService.suppliers.getSuppliers({ name: queryName })
        if (suppliersData.success && suppliersData.suppliers && suppliersData.suppliers.length > 0) {
          supplierDetails = suppliersData.suppliers.find(s => s.name === queryName) || suppliersData.suppliers[0]
        }
      }

      if (supplierDetails) {
        // supplierDetails may be wrapped or raw depending on API service; normalize
        const s = supplierDetails.data || supplierDetails || {}
        supplierAddress = apiService.suppliers.getFullAddress(s)
        attentionPerson = s.contact_person || s.attention_person || ""
        terms = s.payment_terms || s.terms || ""
        notes = s.notes || s.additional_information || s.notes || ""

        setFormData(prev => ({ ...prev, supplier_details: s }))
      }
    } catch (err) {
      console.error("Error fetching supplier details:", err)
      supplierAddress = supplier?.supplier_address || ""
    }

    setFormData(prev => ({
      ...prev,
      supplier_id: supplier && supplier.id ? supplier.id : (supplierDetails && (supplierDetails.id || (supplierDetails.data && supplierDetails.data.id))) || '',
      supplier_name: (supplier && supplier.name) || (supplierDetails && (supplierDetails.name || (supplierDetails.data && supplierDetails.data.name))) || selectedValue,
      supplier_address: supplierAddress,
      // Only overwrite attention_person/terms/notes if we have values from supplier details
      attention_person: attentionPerson || prev.attention_person,
      terms: terms || prev.terms,
      notes: notes || prev.notes,
      selectedItems: [] // Clear items when changing supplier
    }))

    // Update autofilled flags depending on which values were applied
    setAutofilledFields(prev => ({
      ...prev,
      supplier_address: !!supplierAddress,
      attention_person: !!attentionPerson,
      terms: !!terms,
      notes: !!notes
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

    // Calculate initial quantity based on MOQ
    const moq = Number(item.moq) || 0
    const initialQuantity = moq > 0 ? moq : 1
    const pricePerUnit = Number(item.price_per_unit) || 0
    const initialAmount = initialQuantity * pricePerUnit

    setFormData(prev => ({
      ...prev,
      selectedItems: [...prev.selectedItems, {
        item_no: item.item_no,
        item_name: item.item_name,
        description: item.description || "",
        // Respect MOQ if present; default to 1 when not set
        moq: moq,
        quantity: initialQuantity,
        // Prefer unit recorded on the item; fallback to first known option or pcs
        unit: (item.unit_of_measure && String(item.unit_of_measure).trim()) || (unitOptions && unitOptions[0]) || 'pcs',
        // If the unit is not in unitOptions, treat it as a custom unit
        custom_unit_active: !!(item.unit_of_measure && unitOptions && !unitOptions.includes(String(item.unit_of_measure).trim())),
  custom_unit_value: item.unit_of_measure && String(item.unit_of_measure).trim() || '',
  unit_dropdown_open: false,
  price_per_unit: pricePerUnit,
        amount: initialAmount
      }]
    }))
  }

  const handleAddCustomItem = () => {
    // Validate custom item form
    if (!customItemForm.item_name.trim()) {
      setError('Item name is required')
      return
    }
    if (customItemForm.quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }
    if (customItemForm.price_per_unit < 0) {
      setError('Price cannot be negative')
      return
    }

    // Generate unique ID for custom item
    const customId = `custom-${customItemCounter + 1}`
    setCustomItemCounter(prev => prev + 1)

    const pricePerUnit = Number(customItemForm.price_per_unit) || 0
    const quantity = Number(customItemForm.quantity) || 1
    const amount = quantity * pricePerUnit

    setFormData(prev => ({
      ...prev,
      selectedItems: [...prev.selectedItems, {
        item_no: customId, // Custom ID for non-inventory items
        item_name: customItemForm.item_name,
        description: customItemForm.description || "",
        moq: 0, // No MOQ for custom items
        quantity: quantity,
        unit: customItemForm.unit || 'pcs',
        custom_unit_active: false,
        custom_unit_value: '',
        unit_dropdown_open: false,
        price_per_unit: pricePerUnit,
        amount: amount,
        is_custom: true // Flag to identify custom items
      }]
    }))

    // Reset custom item form
    setCustomItemForm({
      item_name: '',
      description: '',
      quantity: 1,
      unit: '',
      price_per_unit: 0
    })

    setError(null)
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
          let updated = { ...item }

          if (field === 'quantity' || field === 'price_per_unit') {
            if (field === 'quantity') {
              const raw = Number(value) || 0
              const minQty = (Number(updated.moq) || 0) > 0 ? Number(updated.moq) : 1
              updated.quantity = Math.max(minQty, raw)
            } else {
              updated.price_per_unit = Number(value) || 0
            }
            updated.amount = (Number(updated.quantity) || 0) * (Number(updated.price_per_unit) || 0)
            return updated
          }

          // Handle toggling custom unit active flag
          if (field === 'custom_unit_active') {
            updated.custom_unit_active = !!value
            // if deactivating custom unit and no custom_unit_value, clear custom unit
            if (!updated.custom_unit_active) {
              updated.custom_unit_value = ''
            }
            return updated
          }

          if (field === 'custom_unit_value') {
            updated.custom_unit_value = value
            updated.unit = value // keep unit in sync
            return updated
          }

          if (field === 'unit') {
            // If value is a known option, ensure custom flag is false
            updated.unit = value
            if (unitOptions && unitOptions.includes(value)) {
              updated.custom_unit_active = false
              updated.custom_unit_value = ''
            }
            return updated
          }

          // Fallback for other fields
          updated[field] = value
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
    
    // Calculate discount based on type
    let discountAmount = 0
    if (formData.has_discount) {
      if (formData.discount_type === "percentage") {
        discountAmount = totalAfterWithholdingTax * (Number(formData.discount_value) / 100)
      } else if (formData.discount_type === "fixed") {
        discountAmount = Number(formData.discount_value)
      }
    }
    
    const grandTotal = totalAfterWithholdingTax - discountAmount

    return {
      totalBeforeWithholdingTax,
      subtotal,
      taxRate: taxRate * 100, // Convert to percentage for display
      withholdingTax,
      totalAfterWithholdingTax,
      discountType: formData.discount_type,
      discountValue: formData.has_discount ? Number(formData.discount_value) : 0,
      discountPercentage: formData.has_discount && formData.discount_type === "percentage" ? Number(formData.discount_value) : 0,
      discountAmount,
      grandTotal,
      applyTax: formData.apply_tax // Include flag for export functions
    }
  }

  const handleNext = () => {
    // Validate current step before proceeding
      if (currentStep === 1) {
      if (!(formData.supplier_id || formData.supplier_name)) {
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
      if (formData.apply_tax && formData.has_discount && (!formData.discount_value || formData.discount_value <= 0)) {
        setError("Please enter a valid discount value")
        return
      }
    }
    
    if (currentStep === 4) {
      if (!formData.prepared_by) {
        setError("Please fill in the 'Prepared By' field")
        return
      }
    }
    
    setError(null)
    setCurrentStep(prev => prev + 1)
  }

  // Validation helper used for guarded breadcrumb navigation
  const validateForStep = (step) => {
    if (step === 1) {
      if (!(formData.supplier_id || formData.supplier_name)) return false
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

  const handleSubmit = async (overwriteExisting = false, saveAsDraft = false) => {
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
        // Priority level included
        priority: formData.priority,
        po_date: formData.po_date,
        prepared_by: formData.prepared_by.filter(p => p.trim()).join(', '), // Convert array to comma-separated string
        verified_by: formData.verified_by,
        approved_by: formData.approved_by,
        notes: formData.notes,
        attached_images: JSON.stringify(formData.attached_images), // Serialize images array
        // Add status field - 'draft' if saveAsDraft, otherwise 'requested'
        status: saveAsDraft ? 'draft' : 'requested',
        // Tax and discount information
        apply_tax: formData.apply_tax,
        tax_type: formData.tax_type,
        has_discount: formData.has_discount,
        discount_type: formData.discount_type, // "percentage" or "fixed"
        discount_value: formData.has_discount ? formData.discount_value : 0,
        discount_percentage: formData.has_discount && formData.discount_type === "percentage" ? formData.discount_value : 0, // For backward compatibility
        // Tax breakdown
        subtotal: taxBreakdown.subtotal,
        withholding_tax_amount: taxBreakdown.withholdingTax,
        discount_amount: taxBreakdown.discountAmount,
        grand_total: taxBreakdown.grandTotal,
        items: formData.selectedItems.map(item => ({
          item_no: item.item_no,
          quantity: item.quantity,
          unit: item.custom_unit_active ? (item.custom_unit_value || item.unit) : item.unit,
          price_per_unit: item.price_per_unit
        })),
        overwrite_existing: overwriteExisting
      }
      let data
      if (editingOrder) {
        // Update existing PO (replace strategy) - editingOrder.id is authoritative
        data = await apiService.purchaseOrders.updatePurchaseOrder(editingOrder.id, orderData)
      } else {
        data = await apiService.purchaseOrders.createPurchaseOrder(orderData)
      }

      if (data.success) {
        if (editingOrder) {
          onSuccess(`Purchase Order ${editingOrder.id} updated successfully!`)
        } else {
          const statusText = saveAsDraft ? 'saved as draft' : 'created'
          onSuccess(`Purchase Order ${formData.po_number} ${statusText} successfully!`)
        }
        handleClose()
      } else {
        throw new Error(data.message || (editingOrder ? "Failed to update purchase order" : "Failed to create purchase order"))
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
      priority: 'P2',
      attention_person: "",
      terms: "",
      po_date: new Date().toISOString().split('T')[0],
      prepared_by: [''],
      verified_by: "",
      approved_by: "",
      notes: "",
      attached_images: []
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

  // For the progress UI, if editing an existing PO, hide step 1 visually
  const progressSteps = editingOrder ? steps.filter(s => s.number !== 1) : steps

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-6xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
                {editingOrder ? (
                  <p className="text-blue-100 text-sm mt-1">Editing PO: {editingOrder.id}</p>
                ) : (
                  <p className="text-blue-100 text-sm mt-1">JJC Engineering Receipt Format</p>
                )}
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
              {progressSteps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      // Map displayed step back to real step number when editing
                      const targetStep = editingOrder && step.number > 1 ? step.number : step.number
                      if (!canJumpToStep(targetStep)) {
                        setError('Please complete required fields before jumping ahead')
                        return
                      }
                      setError(null)
                      setCurrentStep(targetStep)
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
                      
                      {/* Input Mode Toggle */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setSupplierInputMode('inventory')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            supplierInputMode === 'inventory'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          📦 From Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => setSupplierInputMode('custom')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            supplierInputMode === 'custom'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          ✏️ Custom Supplier
                        </button>
                      </div>

                      {/* Dropdown for inventory mode */}
                      {supplierInputMode === 'inventory' && (
                        <select
                          value={formData.supplier_id || formData.supplier_name}
                          onChange={(e) => handleSupplierSelect(e.target.value)}
                          disabled={!!editingOrder}
                          className={`w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${editingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="">-- Choose a supplier --</option>
                          {suppliers.map((supplier, index) => (
                            <option key={`${supplier.name}-${index}`} value={supplier.id || supplier.name}>
                              {supplier.name} ({supplier.item_count} items)
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Text input for custom mode */}
                      {supplierInputMode === 'custom' && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={formData.supplier_name}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              supplier_name: e.target.value,
                              supplier_id: '' // Clear ID when using custom supplier
                            }))}
                            placeholder="Enter supplier name..."
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          />
                          <textarea
                            value={formData.supplier_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, supplier_address: e.target.value }))}
                            placeholder="Supplier address (optional)..."
                            rows="2"
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* PO Number Generation */}
                    {(formData.supplier_id || formData.supplier_name) && (
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
                        📦 Add Items to Purchase Order
                      </h3>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        {supplierInputMode === 'inventory' 
                          ? `Items from ${formData.supplier_name} in inventory`
                          : 'Add items from inventory or create custom items'}
                      </p>
                    </div>

                    {/* Selected Items */}
                    {formData.selectedItems.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-visible">
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            Selected Items ({formData.selectedItems.length})
                          </h4>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {formData.selectedItems.map((item, idx) => (
                            <div key={`${item.item_no}-${idx}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                                        min={(Number(item.moq) || 0) > 0 ? Number(item.moq) : 1}
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(item.item_no, 'quantity', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                      />
                                      {(Number(item.moq) || 0) > 0 && (
                                        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">MOQ: {Number(item.moq)}</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400">Unit</label>
                                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleUpdateItem(item.item_no, 'unit_dropdown_open', !item.unit_dropdown_open)
                                          }}
                                          className="w-full text-left px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                        >
                                          {item.unit || (item.custom_unit_active ? item.custom_unit_value || 'Other' : 'Select unit')}
                                        </button>

                                        {item.unit_dropdown_open && (
                                          <ul
                                            className="absolute z-40 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg overflow-y-auto"
                                            style={{ maxHeight: '9rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {(unitOptions && unitOptions.length > 0 ? unitOptions : ['pcs','sets']).map(u => (
                                              <li
                                                key={u}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleUpdateItem(item.item_no, 'custom_unit_active', false)
                                                  handleUpdateItem(item.item_no, 'unit', u)
                                                  handleUpdateItem(item.item_no, 'unit_dropdown_open', false)
                                                }}
                                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                              >
                                                {u}
                                              </li>
                                            ))}
                                            <li
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleUpdateItem(item.item_no, 'custom_unit_active', true)
                                                handleUpdateItem(item.item_no, 'unit', item.custom_unit_value || '')
                                                handleUpdateItem(item.item_no, 'unit_dropdown_open', false)
                                              }}
                                              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                            >
                                              Other (specify)
                                            </li>
                                          </ul>
                                        )}

                                        {item.custom_unit_active && (
                                          <input
                                            type="text"
                                            value={item.custom_unit_value || item.unit || ''}
                                            onChange={(e) => {
                                              handleUpdateItem(item.item_no, 'custom_unit_value', e.target.value)
                                              // keep unit in sync with custom value for downstream usage
                                              handleUpdateItem(item.item_no, 'unit', e.target.value)
                                            }}
                                            placeholder="Enter custom unit (e.g., rolls, liters)"
                                            className="mt-2 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                          />
                                        )}
                                      </div>
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
                                        ₱{formatAmount(item.amount, 2)}
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
                              ₱{formatAmount(calculateTotal(), 2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Available Items */}
                    <div>
                      {/* Item Input Mode Toggle */}
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setItemInputMode('inventory')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            itemInputMode === 'inventory'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          📦 Add from Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemInputMode('custom')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            itemInputMode === 'custom'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          ✏️ Add Custom Item
                        </button>
                      </div>

                      {/* Inventory Items Section */}
                      {itemInputMode === 'inventory' && (
                        <>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Available Items ({availableItems.length})
                          </h4>
                          {supplierInputMode === 'custom' && availableItems.length === 0 && (
                            <div className="text-center py-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-blue-800 dark:text-blue-300 mb-2">
                                💡 No inventory items available for custom supplier
                              </p>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                Switch to "Add Custom Item" to manually add items to this purchase order
                              </p>
                            </div>
                          )}
                          {availableItems.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                              {availableItems.map((item, idx) => {
                                const isAdded = formData.selectedItems.some(i => i.item_no === item.item_no)
                                return (
                                  <div
                                    key={`${item.item_no}-${idx}`}
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
                                            ₱{formatAmount(item.price_per_unit || 0, 2)}
                                          </span>
                                          {(Number(item.min_stock) || 0) > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                              ROP: {Number(item.min_stock)}
                                            </span>
                                          )}
                                          {(Number(item.moq) || 0) > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                              MOQ: {Number(item.moq)}
                                            </span>
                                          )}
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
                            </div>
                          )}
                          {supplierInputMode === 'inventory' && availableItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              No items needing restock from this supplier
                            </div>
                          )}
                        </>
                      )}

                      {/* Custom Item Form */}
                      {itemInputMode === 'custom' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            ✏️ Add Custom Item
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Item Name *
                              </label>
                              <input
                                type="text"
                                value={customItemForm.item_name}
                                onChange={(e) => setCustomItemForm(prev => ({ ...prev, item_name: e.target.value }))}
                                placeholder="Enter item name..."
                                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                              </label>
                              <textarea
                                value={customItemForm.description}
                                onChange={(e) => setCustomItemForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter item description (optional)..."
                                rows="2"
                                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Quantity *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={customItemForm.quantity}
                                  onChange={(e) => setCustomItemForm(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                    focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Unit
                                </label>
                                <input
                                  type="text"
                                  value={customItemForm.unit}
                                  onChange={(e) => setCustomItemForm(prev => ({ ...prev, unit: e.target.value }))}
                                  placeholder="pcs, kg, etc."
                                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                    focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Price/Unit
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={customItemForm.price_per_unit}
                                  onChange={(e) => setCustomItemForm(prev => ({ ...prev, price_per_unit: Number(e.target.value) || 0 }))}
                                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                    focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setCustomItemForm({
                                  item_name: '',
                                  description: '',
                                  quantity: 1,
                                  unit: '',
                                  price_per_unit: 0
                                })}
                                className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={handleAddCustomItem}
                                className="px-4 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-all"
                              >
                                + Add Item
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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
                                <span className="font-semibold text-gray-900 dark:text-gray-100">₱{formatAmount(breakdown.totalBeforeWithholdingTax, 2)}</span>
                              </div>
                              
                              {formData.apply_tax && (
                                <>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">÷ 1.12 (Remove 12% VAT)</span>
                                    <span></span>
                                  </div>
                                  <div className="flex justify-between items-center pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal (Gross Total)</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">₱{formatAmount(breakdown.subtotal, 2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Withholding Tax ({breakdown.taxRate}%)</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">- ₱{formatAmount(breakdown.withholdingTax, 2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pb-2 border-b-2 border-gray-400 dark:border-gray-500">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total After Withholding Tax</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">₱{formatAmount(breakdown.totalAfterWithholdingTax, 2)}</span>
                                  </div>
                                </>
                              )}
                              
                              {breakdown.discountAmount > 0 && (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      Discount {breakdown.discountType === "percentage" 
                                        ? `(${breakdown.discountPercentage}%)` 
                                        : "(Fixed Amount)"}
                                    </span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">- ₱{formatAmount(breakdown.discountAmount, 2)}</span>
                                  </div>
                                </>
                              )}
                              
                              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400 dark:border-gray-500">
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">₱{formatAmount(breakdown.grandTotal, 2)}</span>
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
                            discount_value: e.target.checked ? prev.discount_value : 0
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="hasDiscount" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
                          Apply Discount
                        </label>
                      </div>
                      
                      {formData.has_discount && (
                        <div className="space-y-4 mt-4">
                          {/* Discount Type Selector */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Discount Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ 
                                  ...prev, 
                                  discount_type: "percentage",
                                  discount_value: 0
                                }))}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  formData.discount_type === "percentage"
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-xl">%</span>
                                  <span className="font-semibold">Percentage</span>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ 
                                  ...prev, 
                                  discount_type: "fixed",
                                  discount_value: 0
                                }))}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  formData.discount_type === "fixed"
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-xl">₱</span>
                                  <span className="font-semibold">Fixed Amount</span>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Discount Value Input */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              {formData.discount_type === "percentage" 
                                ? "Discount Percentage (%)" 
                                : "Discount Amount (₱)"}
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="0"
                                max={formData.discount_type === "percentage" ? "100" : undefined}
                                step={formData.discount_type === "percentage" ? "0.01" : "0.01"}
                                value={formData.discount_value}
                                onChange={(e) => {
                                  const value = Number(e.target.value)
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    discount_value: formData.discount_type === "percentage" 
                                      ? Math.max(0, Math.min(100, value))
                                      : Math.max(0, value)
                                  }))
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg font-semibold
                                  focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder={formData.discount_type === "percentage" 
                                  ? "Enter discount percentage (0-100)" 
                                  : "Enter discount amount in pesos"}
                              />
                              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                {formData.discount_type === "percentage" ? "%" : "₱"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {formData.discount_type === "percentage" 
                                ? "Enter a percentage value between 0 and 100" 
                                : "Enter a fixed discount amount in Philippine Pesos"}
                            </p>
                          </div>
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

                    {/* Priority Selection (P0 - P4) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Priority</label>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {[
                          { id: 'P0', title: 'P0 (Critical)', desc: 'Immediate emergency response' },
                          { id: 'P1', title: 'P1 (High)', desc: 'High urgency and impact' },
                          { id: 'P2', title: 'P2 (Moderate)', desc: 'Moderate urgency (default)' },
                          { id: 'P3', title: 'P3 (Low)', desc: 'Low urgency' },
                          { id: 'P4', title: 'P4 (Negligible)', desc: 'No urgency, backlog' }
                        ].map(option => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, priority: option.id }))}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${formData.priority === option.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{option.title}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                              </div>
                              <div className="text-sm font-bold text-blue-600">{option.id}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Attention Person
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.attention_person}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, attention_person: e.target.value }))
                              // clear autofill badge when user edits
                              setAutofilledFields(prev => ({ ...prev, attention_person: false }))
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            placeholder="Contact person name"
                          />
                          {autofilledFields.attention_person && (
                            <span className="absolute top-1 right-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">Autofilled</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Terms *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.terms}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, terms: e.target.value }))
                              setAutofilledFields(prev => ({ ...prev, terms: false }))
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            placeholder="e.g., 30-DAYS, 60-DAYS, 90-DAYS, COD"
                          />
                          {autofilledFields.terms && (
                            <span className="absolute top-1 right-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">Autofilled</span>
                          )}
                        </div>
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
                          Prepared By (Multiple people allowed)
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
                          Verified By
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
                          Approved By
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
                      <div className="relative">
                        <textarea
                          value={formData.notes}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, notes: e.target.value }))
                            setAutofilledFields(prev => ({ ...prev, notes: false }))
                          }}
                          rows="4"
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="Any additional notes or special instructions..."
                        />
                        {autofilledFields.notes && (
                          <span className="absolute top-1 right-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">Autofilled</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Attach Images (Drawings, Photos, etc.)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || [])
                          const imagePromises = files.map(file => {
                            return new Promise((resolve, reject) => {
                              const reader = new FileReader()
                              reader.onload = (event) => resolve({
                                data: event.target.result,
                                name: file.name,
                                type: file.type
                              })
                              reader.onerror = reject
                              reader.readAsDataURL(file)
                            })
                          })
                          try {
                            const newImages = await Promise.all(imagePromises)
                            setFormData(prev => ({
                              ...prev,
                              attached_images: [...prev.attached_images, ...newImages]
                            }))
                          } catch (err) {
                            console.error('Error loading images:', err)
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                          file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                          file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100 cursor-pointer"
                      />
                      
                      {/* Image Previews */}
                      {formData.attached_images.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setShowImagePreview(true)}
                            className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 border-2 border-blue-200 dark:border-blue-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview How Images Will Appear in PDF
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {formData.attached_images.map((img, idx) => (
                              <div key={idx} className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2">
                                <img
                                  src={img.data}
                                  alt={img.name}
                                  className="w-full h-32 object-contain rounded"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{img.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      attached_images: prev.attached_images.filter((_, i) => i !== idx)
                                    }))
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                            <tr key={`${item.item_no}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-900 px-3 py-2 text-sm text-gray-900">#{item.item_no}</td>
                              <td className="border border-gray-900 px-3 py-2 text-center text-sm text-gray-900">{item.quantity}</td>
                              <td className="border border-gray-900 px-3 py-2 text-center text-sm text-gray-900">{item.unit}</td>
                              <td className="border border-gray-900 px-3 py-2 text-sm text-gray-900">{item.item_name}</td>
                              <td className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-900">{formatAmount(item.price_per_unit, 2)}</td>
                              <td className="border border-gray-900 px-3 py-2 text-right text-sm font-semibold text-gray-900">{formatAmount(item.amount, 2)}</td>
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
                                        ₱{formatAmount(breakdown.totalBeforeWithholdingTax, 2)}
                                      </td>
                                    </tr>
                                    {/* Subtotal after VAT removal */}
                                    <tr className="bg-white">
                                      <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-700">
                                        Subtotal (Gross Total ÷ 1.12):
                                      </td>
                                      <td className="border border-gray-900 px-3 py-2 text-right font-semibold text-gray-900">
                                        ₱{formatAmount(breakdown.subtotal, 2)}
                                      </td>
                                    </tr>
                                    {/* Withholding Tax */}
                                    <tr className="bg-white">
                                      <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right text-sm text-gray-700">
                                        Less: Withholding Tax ({breakdown.taxRate}% - {formData.tax_type.charAt(0).toUpperCase() + formData.tax_type.slice(1)}):
                                      </td>
                                      <td className="border border-gray-900 px-3 py-2 text-right font-semibold text-red-700">
                                        (₱{formatAmount(breakdown.withholdingTax, 2)})
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <tr className="bg-gray-100">
                                    <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right font-semibold text-gray-900">
                                      TOTAL AMOUNT:
                                    </td>
                                    <td className="border border-gray-900 px-3 py-2 text-right font-bold text-gray-900">
                                      ₱{formatAmount(breakdown.totalBeforeWithholdingTax, 2)}
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
                                      (₱{formatAmount(breakdown.discountAmount, 2)})
                                    </td>
                                  </tr>
                                )}
                                {/* Grand Total */}
                                <tr className="bg-gray-200">
                                  <td colSpan="5" className="border border-gray-900 px-3 py-2 text-right font-bold text-gray-900">
                                    GRAND TOTAL:
                                  </td>
                                  <td className="border border-gray-900 px-3 py-2 text-right font-bold text-lg text-green-700">
                                    ₱{formatAmount(breakdown.grandTotal, 2)}
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
                            {formData.prepared_by.filter(p => p.trim()).length > 0 ? (
                              formData.prepared_by.filter(p => p.trim()).map((person, idx) => (
                                <div key={idx}>
                                  <div className="font-semibold text-gray-900">{person}</div>
                                  <div className="border-t border-gray-400 mt-6"></div>
                                  <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 italic">Not specified</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Verified by:</div>
                          {formData.verified_by ? (
                            <>
                              <div className="font-semibold text-gray-900">{formData.verified_by}</div>
                              <div className="border-t border-gray-400 mt-8"></div>
                              <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                            </>
                          ) : (
                            <div className="text-gray-500 italic">Not specified</div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Approved by:</div>
                          {formData.approved_by ? (
                            <>
                              <div className="font-semibold text-gray-900">{formData.approved_by}</div>
                              <div className="border-t border-gray-400 mt-8"></div>
                              <div className="text-xs text-gray-600 text-center mt-1">Signature</div>
                            </>
                          ) : (
                            <div className="text-gray-500 italic">Not specified</div>
                          )}
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

                      {/* Attached Images */}
                      {formData.attached_images && formData.attached_images.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-300">
                          <div className="text-sm font-semibold text-gray-800 mb-3">Attached Images:</div>
                          <div className="grid grid-cols-2 gap-4">
                            {formData.attached_images.map((img, idx) => (
                              <div key={idx} className="border border-gray-300 rounded p-2">
                                <img
                                  src={img.data}
                                  alt={img.name || `Attachment ${idx + 1}`}
                                  className="w-full h-32 object-contain rounded"
                                />
                                <p className="text-xs text-gray-600 mt-1 text-center truncate">
                                  {img.name || `Image ${idx + 1}`}
                                </p>
                              </div>
                            ))}
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
                        onClick={() => handleSubmit(false, true)}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Save as Draft
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleSubmit(false, false)}
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
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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

        {/* Image Preview Modal */}
        {showImagePreview && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF Image Preview
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    This shows how your images will appear in the Notes section of the PDF
                  </p>
                </div>
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                  {/* Simulated PDF Notes Container */}
                  <div className="border-2 border-gray-400 rounded p-4 min-h-[500px]">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-400">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="font-bold text-gray-900 text-sm">NOTES:</span>
                    </div>
                    
                    {/* Notes Text */}
                    {formData.notes && formData.notes.trim() && (
                      <div className="mb-6 text-sm text-gray-800 whitespace-pre-wrap">
                        {formData.notes}
                      </div>
                    )}
                    
                    {/* Images in PDF Layout - 2 per row */}
                    <div className="grid grid-cols-2 gap-4">
                      {formData.attached_images.map((img, idx) => (
                        <div key={idx} className="border border-gray-300 rounded p-3 bg-gray-50">
                          <div className="relative w-full bg-white rounded" style={{ minHeight: '200px', maxHeight: '280px' }}>
                            <img
                              src={img.data}
                              alt={img.name || `Image ${idx + 1}`}
                              className="w-full h-full object-contain rounded"
                              style={{ maxHeight: '280px' }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-2 text-center truncate font-medium">
                            {img.name || `Image ${idx + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-semibold mb-1">PDF Layout Information:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Images are displayed in a 2-column grid layout</li>
                          <li>Each image maintains its original aspect ratio</li>
                          <li>Images are scaled to fit properly within the notes container</li>
                          <li>Maximum height: ~80mm to ensure proper page layout</li>
                          <li>All {formData.attached_images.length} image{formData.attached_images.length !== 1 ? 's' : ''} will appear in the PDF</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.attached_images.length} image{formData.attached_images.length !== 1 ? 's' : ''} attached
                </div>
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}

export default CreatePurchaseOrderWizard
