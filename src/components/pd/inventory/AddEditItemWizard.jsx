import { useEffect, useState } from "react"
import ModalPortal from "../shared/ModalPortal"
import apiService, { items as itemsService } from "../../../utils/api/api-service.js"

// Reusable Combobox component that allows both dropdown selection and manual typing
function Combobox({ value, onChange, options, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || "")
  const [filteredOptions, setFilteredOptions] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [typingValue, setTypingValue] = useState("")
  const [debounceTimer, setDebounceTimer] = useState(null)

  // Utility: rank-and-filter options by input (startsWith > includes)
  const computeFiltered = (text, opts) => {
    const term = (text || "").trim().toLowerCase()
    if (!term) return opts

    const base = opts.filter(opt => opt !== '─────────')
    const ranked = base
      .map(opt => {
        const lower = opt.toLowerCase()
        const starts = lower.startsWith(term)
        const contains = !starts && lower.includes(term)
        const score = starts ? 0 : (contains ? 1 : 2)
        return { opt, score }
      })
      .filter(x => x.score !== 2)
      .sort((a, b) => a.score - b.score || a.opt.localeCompare(b.opt))
      .map(x => x.opt)

    // Ensure special option is available when appropriate
    if ('+ Add New Supplier'.toLowerCase().includes(term) || ranked.length === 0) {
      ranked.push('+ Add New Supplier')
    }
    return ranked
  }

  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  useEffect(() => {
    // When options change (new suppliers loaded), recompute filtered based on current input
    setFilteredOptions(prev => computeFiltered(inputValue, options))
  }, [options, inputValue])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setTypingValue(newValue)
    setIsOpen(true)

    // Debounce updating parent and filtering to reduce churn for large lists
    if (debounceTimer) clearTimeout(debounceTimer)
    const t = setTimeout(() => {
      onChange(newValue)
      const newFiltered = computeFiltered(newValue, options)
      setFilteredOptions(newFiltered)
      const firstValidIndex = newFiltered.findIndex(option => option !== '─────────' && option !== '+ Add New Supplier')
      setHighlightedIndex(firstValidIndex >= 0 ? firstValidIndex : -1)
    }, 180)
    setDebounceTimer(t)
  }

  const handleOptionSelect = (option) => {
    // Don't select separator or special options
    if (option === '─────────' || option === '+ Add New Supplier') {
      if (option === '+ Add New Supplier') {
        onChange('__add_custom')
      }
      setIsOpen(false)
      setHighlightedIndex(-1)
      return
    }

    setInputValue(option)
    onChange(option)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleFocus = () => {
    setIsOpen(true)
    setFilteredOptions(computeFiltered(inputValue, options))
    // Find first valid option (skip separator) in current filtered list
    const firstValidIndex = (computeFiltered(inputValue, options)).findIndex(option => option !== '─────────' && option !== '+ Add New Supplier')
    setHighlightedIndex(firstValidIndex >= 0 ? firstValidIndex : -1)
  }

  const handleBlur = () => {
    // Delay closing to allow option selection
    setTimeout(() => {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }, 150)
  }

  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          let next = prev + 1
          // Skip separator and find next valid option
          while (next < filteredOptions.length && (filteredOptions[next] === '─────────' || filteredOptions[next] === '+ Add New Supplier')) {
            next++
          }
          return next < filteredOptions.length ? next : prev
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          let next = prev - 1
          // Skip separator and find previous valid option
          while (next >= 0 && (filteredOptions[next] === '─────────' || filteredOptions[next] === '+ Add New Supplier')) {
            next--
          }
          return next >= 0 ? next : prev
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredOptions.slice(0, 8).map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionSelect(option)}
              className={`px-3 py-2 text-sm cursor-pointer text-gray-900 dark:text-white transition-colors ${
                option === '─────────' 
                  ? 'cursor-default bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 select-none' 
                  : option === '+ Add New Supplier'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium'
                  : index === highlightedIndex 
                  ? 'bg-blue-50 dark:bg-blue-900/30' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {option}
            </div>
          ))}
          {filteredOptions.length > 8 && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
              +{filteredOptions.length - 8} more options
            </div>
          )}
        </div>
      )}
    </div>
  )
}function AddEditItemWizard({ isOpen, onClose, onSave, selectedItem = null }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState({})

  const [wizardData, setWizardData] = useState({
    // Step 1: Basic Information
    item_name: "",
    brand: "",
    item_type: "",
  supplier: "",
  supplier_id: null,
  custom_supplier: "",

    // Step 2: Stock & Pricing
    balance: 0,
    min_stock: 0,
    moq: 0,
    unit_of_measure: "",
    price_per_unit: 0,

    // Step 3: Location & Images
    location: "",
    item_status: "In Stock",

    // Step 4: Review (images handled separately)
  })

  // Images state
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [currentImageUrl, setCurrentImageUrl] = useState("")
  const [existingImages, setExistingImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // New state for auto-upload queue
  const [uploadQueue, setUploadQueue] = useState([])
  const [uploadingImages, setUploadingImages] = useState(new Set())

  // Load suppliers for dropdown
  const [suppliersList, setSuppliersList] = useState([])
  
  // Load filter options for comboboxes
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    item_types: [],
    unit_of_measures: [],
    locations: []
  })

  const steps = [
    { number: 1, title: "Basic Info", description: "Item details", icon: "📦" },
    { number: 2, title: "Stock & Price", description: "Inventory & pricing", icon: "💰" },
    { number: 3, title: "Location & Media", description: "Storage & images", icon: "📍" },
    { number: 4, title: "Review", description: "Confirm details", icon: "✓" }
  ]

  // Load data when editing
  useEffect(() => {
    if (isOpen && selectedItem) {
      setWizardData({
        item_name: selectedItem?.item_name || "",
        brand: selectedItem?.brand || "",
        item_type: selectedItem?.item_type || "",
  supplier: selectedItem?.supplier || "",
  supplier_id: selectedItem?.supplier_id || null,
  custom_supplier: "",
        balance: selectedItem?.balance || 0,
        min_stock: selectedItem?.min_stock || 0,
        moq: selectedItem?.moq || 0,
        unit_of_measure: selectedItem?.unit_of_measure || "",
        price_per_unit: selectedItem?.price_per_unit || 0,
        location: selectedItem?.location || "",
        item_status: selectedItem?.item_status || "In Stock",
      })

      // Load images if editing
      if (selectedItem?.item_no) {
        ;(async () => {
          try {
            const res = await itemsService.getItemImages(selectedItem.item_no)
            const list = (res?.data || []).map(img => ({
              ...img,
              url: `${itemsService.getItemImageUrl(selectedItem.item_no, img.filename)}?t=${Date.now()}`,
            }))
            setExistingImages(list)
            const latest = itemsService.getItemLatestImageUrl(selectedItem.item_no)
            setCurrentImageUrl(`${latest}?t=${Date.now()}`)
          } catch {
            setExistingImages([])
            const latest = itemsService.getItemLatestImageUrl(selectedItem.item_no)
            setCurrentImageUrl(`${latest}?t=${Date.now()}`)
          }
        })()
      }
    }
  }, [isOpen, selectedItem])

  // Load suppliers for dropdown
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const opts = await apiService.suppliers.getSuppliersForSelect()
        if (mounted) setSuppliersList(opts || [])
      } catch (e) {
        console.error('Failed to load suppliers list', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load filter options for comboboxes
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const response = await itemsService.getFilterOptions()
        if (mounted && response.success) {
          setFilterOptions(response.data || {
            brands: [],
            item_types: [],
            unit_of_measures: [],
            locations: []
          })
        }
      } catch (e) {
        console.error('Failed to load filter options', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Auto-upload when queue changes and item exists
  useEffect(() => {
    if (selectedItem?.item_no && uploadQueue.length > 0) {
      uploadQueue.forEach((item, index) => {
        if (!item.error && !uploadingImages.has(index)) {
          autoUploadImage(item.file, index)
        }
      })
    }
  }, [uploadQueue, selectedItem?.item_no])

  // Step guards used by footer/navigation to enable/disable Next/Create
  const canProceedFromStep1 = (wizardData.item_name || "").trim().length > 0
  const canProceedFromStep2 = (Number(wizardData.balance) || 0) >= 0 && (Number(wizardData.min_stock) || 0) >= 0 && (Number(wizardData.price_per_unit) || 0) >= 0

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!wizardData.item_name.trim()) {
        newErrors.item_name = "Item name is required"
      }
    }

    if (step === 2) {
      if (wizardData.balance < 0) {
        newErrors.balance = "Balance cannot be negative"
      }
      if (wizardData.min_stock < 0) {
        newErrors.min_stock = "Minimum stock cannot be negative"
      }
      if (wizardData.price_per_unit < 0) {
        newErrors.price_per_unit = "Price cannot be negative"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      const payload = { ...wizardData }

      // Resolve supplier name: backend items endpoints expect `supplier` as a string.
      if (wizardData.supplier_id === '__custom') {
        payload.supplier = (wizardData.custom_supplier || '').trim()
      } else if (wizardData.supplier_id) {
        // Find selected supplier in suppliersList and use its label/name
        const found = suppliersList.find(s => s.id === wizardData.supplier_id)
        payload.supplier = found?.label || wizardData.supplier || ''
      } else {
        payload.supplier = (wizardData.supplier || '').trim()
      }

      // Clean up temporary fields not required by API - ALWAYS delete these
      delete payload.supplier_id
      delete payload.custom_supplier

      onSave(payload)
      handleClose()
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setWizardData({
      item_name: "",
      brand: "",
      item_type: "",
      supplier: "",
      balance: 0,
      min_stock: 0,
      moq: 0,
      unit_of_measure: "",
      price_per_unit: 0,
      location: "",
      item_status: "In Stock",
    })
    setErrors({})
    setSelectedImage(null)
    setPreviewUrl("")
    setCurrentImageUrl("")
    setExistingImages([])
    setUploadError("")
    // Clean up upload queue
    uploadQueue.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    setUploadQueue([])
    setUploadingImages(new Set())
    onClose()
  }

  const handleImageUpload = async (replace = false) => {
    if (!selectedImage || !selectedItem?.item_no) return
    try {
      setUploading(true)
      if (replace) {
        await itemsService.replaceItemImage(selectedItem.item_no, selectedImage)
      } else {
        await itemsService.uploadItemImage(selectedItem.item_no, selectedImage)
      }
      const latest = itemsService.getItemLatestImageUrl(selectedItem.item_no)
      setCurrentImageUrl(`${latest}?t=${Date.now()}`)
      const fres = await itemsService.getItemImages(selectedItem.item_no)
      const list = (fres?.data || []).map(img => ({
        ...img,
        url: `${itemsService.getItemImageUrl(selectedItem.item_no, img.filename)}?t=${Date.now()}`,
      }))
      setExistingImages(list)
      setSelectedImage(null)
      setPreviewUrl("")
      setUploadError("")
    } catch (e) {
      setUploadError(e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  // Auto-upload function for queued images
  const autoUploadImage = async (file, index) => {
    if (!selectedItem?.item_no) return

    try {
      setUploadingImages(prev => new Set(prev).add(index))
      
      await itemsService.uploadItemImage(selectedItem.item_no, file)
      
      // Refresh images list
      const fres = await itemsService.getItemImages(selectedItem.item_no)
      const list = (fres?.data || []).map(img => ({
        ...img,
        url: `${itemsService.getItemImageUrl(selectedItem.item_no, img.filename)}?t=${Date.now()}`,
      }))
      setExistingImages(list)
      
      // Remove from queue
      setUploadQueue(prev => prev.filter((_, i) => i !== index))
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
      
    } catch (e) {
      console.error('Auto-upload failed:', e)
      // Mark as failed but keep in queue for retry
      setUploadQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, error: e.message } : item
      ))
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  // Handle file selection with auto-upload
  const handleFileSelect = (files) => {
    setUploadError("")
    
    Array.from(files).forEach(file => {
      // Validate file
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp"]
      if (!allowed.includes(file.type)) {
        setUploadError("Invalid file type. Use JPG, PNG, GIF, WEBP, or BMP.")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File too large (max 10MB).")
        return
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      
      // Add to upload queue
      const queueItem = {
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        error: null
      }
      
      setUploadQueue(prev => [...prev, queueItem])
    })
  }

  // Remove image from queue
  const removeQueuedImage = (index) => {
    setUploadQueue(prev => {
      const newQueue = [...prev]
      const removed = newQueue.splice(index, 1)[0]
      // Revoke object URL to free memory
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return newQueue
    })
  }

  // Retry failed upload
  const retryUpload = (index) => {
    const item = uploadQueue[index]
    if (item) {
      setUploadQueue(prev => prev.map((q, i) => 
        i === index ? { ...q, error: null } : q
      ))
      autoUploadImage(item.file, index)
    }
  }

  // Check if can jump to step (for breadcrumbs)
  const canJumpToStep = (targetStep) => {
    if (targetStep <= currentStep) return true
    if (targetStep === 2 && canProceedFromStep1) return true
    if (targetStep === 3) return canProceedFromStep1 && canProceedFromStep2
    if (targetStep === 4) return canProceedFromStep1 && canProceedFromStep2
    return false
  }

  // Handle image deletion
  const handleImageDelete = async (filename) => {
    if (!selectedItem?.item_no) return
    try {
      await itemsService.deleteItemImage(selectedItem.item_no, filename)
      const fres = await itemsService.getItemImages(selectedItem.item_no)
      const list = (fres?.data || []).map(img => ({
        ...img,
        url: `${itemsService.getItemImageUrl(selectedItem.item_no, img.filename)}?t=${Date.now()}`,
      }))
      setExistingImages(list)
      const latest = itemsService.getItemLatestImageUrl(selectedItem.item_no)
      setCurrentImageUrl(`${latest}?t=${Date.now()}`)
    } catch (e) {
      console.error('Failed to delete image:', e)
    }
  }

  if (!isOpen) return null
    return (
      <ModalPortal>
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-1000">
          <div className="bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-slate-200 dark:border-slate-700">
            {/* Enhanced Header with Industrial Theme */}
            <div className="bg-linear-to-r from-slate-800 via-zinc-800 to-slate-800 dark:from-slate-900 dark:via-zinc-900 dark:to-slate-900 p-4 sm:p-6 text-white relative overflow-hidden">
              {/* Clickable step breadcrumbs */}
              <div className="max-w-3xl mx-auto mb-4">
                <div className="flex items-center gap-3">
                  {steps.map((step, idx) => (
                    <div key={step.number} className="flex items-center flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canJumpToStep(step.number)) {
                            setErrors(prev => ({ ...prev, global: 'Please complete the required fields before jumping ahead.' }))
                            return
                          }
                          setErrors({})
                          setCurrentStep(step.number)
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-200 ${currentStep >= step.number ? 'bg-white text-slate-800 shadow-md' : 'bg-white/10 text-white'}`}
                        aria-current={currentStep === step.number}
                        aria-label={`Go to step ${step.number}: ${step.title}`}
                      >
                        {currentStep > step.number ? '✓' : step.icon}
                      </button>
                      <div className="ml-3 text-sm">
                        <div className={`${currentStep >= step.number ? 'font-semibold text-white' : 'text-white/80'}`}>{step.title}</div>
                        <div className="text-xs text-white/60">{step.description}</div>
                      </div>
                      {idx < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${currentStep > step.number ? 'bg-white' : 'bg-white/20'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">📦</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Let's start with the essential details about this item
                  </p>
                </div>

                <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wizardData.item_name}
                      onChange={(e) => setWizardData({ ...wizardData, item_name: e.target.value })}
                      className={`w-full border ${errors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                      placeholder="Enter the item name"
                    />
                    {errors.item_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.item_name}</p>
                    )}
                  </div>

                  {/* Brand & Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Brand
                      </label>
                      <Combobox
                        value={wizardData.brand}
                        onChange={(value) => setWizardData({ ...wizardData, brand: value })}
                        options={filterOptions.brands}
                        placeholder="e.g., Samsung, Nike"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Item Type
                      </label>
                      <Combobox
                        value={wizardData.item_type}
                        onChange={(value) => setWizardData({ ...wizardData, item_type: value })}
                        options={filterOptions.item_types}
                        placeholder="e.g., Electronics, Tools"
                      />
                    </div>
                  </div>

                  {/* Supplier - using Combobox for consistency */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Supplier</label>
                    <Combobox
                      value={wizardData.supplier_id === '__custom' ? (wizardData.custom_supplier || '') : (wizardData.supplier || '')}
                      onChange={(value) => {
                        if (value === '__add_custom') {
                          // Special option to add custom supplier
                          setWizardData({ ...wizardData, supplier_id: '__custom', custom_supplier: '', supplier: '' })
                        } else {
                          // Check if it's an existing supplier
                          const existingSupplier = suppliersList.find(s => s.label === value)
                          if (existingSupplier) {
                            setWizardData({ ...wizardData, supplier_id: existingSupplier.id, supplier: existingSupplier.label, custom_supplier: '' })
                          } else {
                            // Custom supplier
                            setWizardData({ ...wizardData, supplier: value, custom_supplier: value, supplier_id: '__custom' })
                          }
                        }
                      }}
                      options={[
                        ...suppliersList.map(s => s.label),
                        '─────────', // Separator
                        '+ Add New Supplier'
                      ]}
                      placeholder="Select or type supplier"
                    />
                    {wizardData.supplier_id === '__custom' && (
                      <p className="text-xs text-gray-500 mt-2">💡 Custom supplier will be saved with the item</p>
                    )}
                  </div>

                  {/* Quick Preview */}
                  {wizardData.item_name && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-200">Quick Preview</h4>
                      </div>
                      <p className="text-blue-800 dark:text-blue-300 text-sm">
                        <strong>{wizardData.item_name}</strong>
                        {wizardData.brand && ` by ${wizardData.brand}`}
                        {wizardData.item_type && ` • ${wizardData.item_type}`}
                        {wizardData.supplier && ` • From ${wizardData.supplier}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Stock & Pricing */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">💰</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Stock & Pricing</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Set inventory levels and pricing information
                  </p>
                </div>

                <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Balance, ROP & MOQ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!selectedItem ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Initial Balance <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.balance}
                          onChange={(e) => setWizardData({ ...wizardData, balance: parseInt(e.target.value) || 0 })}
                          className={`w-full border ${errors.balance ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                          placeholder="Enter initial quantity"
                        />
                        {errors.balance && (
                          <p className="text-red-500 text-sm mt-1">{errors.balance}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Current Balance (Read Only)
                        </label>
                        <input
                          type="text"
                          value={`${selectedItem.balance}`}
                          disabled
                          className="w-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Use "Stock Management" to modify inventory levels
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        ROP (Re-Order Point) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wizardData.min_stock}
                        onChange={(e) => setWizardData({ ...wizardData, min_stock: parseInt(e.target.value) || 0 })}
                        className={`w-full border ${errors.min_stock ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                        placeholder="Alert threshold"
                      />
                      {errors.min_stock && (
                        <p className="text-red-500 text-sm mt-1">{errors.min_stock}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">System still stores this as <code>min_stock</code>.</p>
                    </div>
                  </div>

                  {/* MOQ Field */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        MOQ (Minimum Order Quantity)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wizardData.moq}
                        onChange={(e) => setWizardData({ ...wizardData, moq: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="e.g., 10"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional. If set &gt; 0, purchase orders will enforce at least this quantity.</p>
                    </div>
                  </div>

                  {/* Unit of Measure & Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Unit of Measure
                      </label>
                      <Combobox
                        value={wizardData.unit_of_measure}
                        onChange={(value) => setWizardData({ ...wizardData, unit_of_measure: value })}
                        options={filterOptions.unit_of_measures}
                        placeholder="e.g., pcs, kg, ltr, box"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Price per Unit
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={wizardData.price_per_unit}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value)
                            setWizardData({ ...wizardData, price_per_unit: value })
                          }}
                          className={`w-full border ${errors.price_per_unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.price_per_unit && (
                        <p className="text-red-500 text-sm mt-1">{errors.price_per_unit}</p>
                      )}
                    </div>
                  </div>

                  {/* Stock Status Indicator */}
                  {wizardData.balance >= 0 && wizardData.min_stock >= 0 && (
                    <div className={`rounded-xl p-4 border-2 ${
                      wizardData.balance === 0 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                        : wizardData.balance < wizardData.min_stock
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <svg className={`w-5 h-5 ${
                          wizardData.balance === 0 
                            ? 'text-red-600 dark:text-red-400'
                            : wizardData.balance < wizardData.min_stock
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <h4 className={`font-semibold ${
                          wizardData.balance === 0 
                            ? 'text-red-900 dark:text-red-200'
                            : wizardData.balance < wizardData.min_stock
                            ? 'text-yellow-900 dark:text-yellow-200'
                            : 'text-green-900 dark:text-green-200'
                        }`}>
                          {wizardData.balance === 0 
                            ? '⚠️ Out of Stock'
                            : wizardData.balance < wizardData.min_stock
                            ? '⚡ Low Stock Alert'
                            : '✓ Stock Level Good'
                          }
                        </h4>
                      </div>
                      <p className={`text-sm mt-1 ${
                        wizardData.balance === 0 
                          ? 'text-red-800 dark:text-red-300'
                          : wizardData.balance < wizardData.min_stock
                          ? 'text-yellow-800 dark:text-yellow-300'
                          : 'text-green-800 dark:text-green-300'
                      }`}>
                        Current: {wizardData.balance} {wizardData.unit_of_measure || 'units'} | 
                        Min Required: {wizardData.min_stock} {wizardData.unit_of_measure || 'units'}
                        {wizardData.price_per_unit > 0 && ` | Value: ₱${(wizardData.balance * wizardData.price_per_unit).toFixed(2)}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Location & Images */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">📍</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Location & Media</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Where is it stored and what does it look like?
                  </p>
                </div>

                <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Storage Location
                    </label>
                    <Combobox
                      value={wizardData.location}
                      onChange={(value) => setWizardData({ ...wizardData, location: value })}
                      options={filterOptions.locations}
                      placeholder="e.g., Warehouse A, Shelf 1-A, Bin 23"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Item Status
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "In Stock", color: "green", icon: "✓" },
                        { value: "Low In Stock", color: "yellow", icon: "⚡" },
                        { value: "Out Of Stock", color: "red", icon: "×" }
                      ].map((status) => (
                        <label
                          key={status.value}
                          className={`
                            cursor-pointer rounded-xl p-4 border-2 transition-all text-center
                            ${wizardData.item_status === status.value
                              ? status.color === 'green' ? 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-4 ring-green-500/20'
                              : status.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 ring-4 ring-yellow-500/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-4 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'
                            }
                          `}
                        >
                          <div className="text-2xl mb-1">{status.icon}</div>
                          <div className={`text-sm font-semibold ${
                            wizardData.item_status === status.value
                              ? status.color === 'green' ? 'text-green-900 dark:text-green-200'
                              : status.color === 'yellow' ? 'text-yellow-900 dark:text-yellow-200'
                              : 'text-red-900 dark:text-red-200'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {status.value}
                          </div>
                          <input
                            type="radio"
                            name="item_status"
                            value={status.value}
                            checked={wizardData.item_status === status.value}
                            onChange={(e) => setWizardData({ ...wizardData, item_status: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Images Section */}
                  <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Item Images
                    </h4>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-48 h-48 bg-white dark:bg-black/40 rounded-xl overflow-hidden flex items-center justify-center border-2 border-gray-300 dark:border-gray-700 shrink-0">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="object-contain w-full h-full" />
                        ) : currentImageUrl ? (
                          <img
                            src={currentImageUrl}
                            alt="Current"
                            className="object-contain w-full h-full"
                            onError={() => setCurrentImageUrl("")}
                          />
                        ) : (
                          <div className="text-center p-4">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">No Image</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <label className="block mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                            Select or Drop Images
                          </span>
                          <div
                            className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 hover:border-violet-400 dark:hover:border-violet-500 bg-slate-50 dark:bg-slate-800/50 transition-colors"
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add('border-violet-400', 'dark:border-violet-500')
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.remove('border-violet-400', 'dark:border-violet-500')
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.remove('border-violet-400', 'dark:border-violet-500')
                              handleFileSelect(e.dataTransfer.files)
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                handleFileSelect(e.target.files)
                                e.target.value = '' // Reset input
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center">
                              <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Drop images here or click to select
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                Supports JPG, PNG, GIF, WEBP, BMP (max 10MB each)
                              </p>
                            </div>
                          </div>
                        </label>
                        
                        {/* Queued Images Preview */}
                        {uploadQueue.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              Uploading ({uploadQueue.length})
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {uploadQueue.map((item, index) => (
                                <div key={index} className="relative group border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-black/30">
                                  <img 
                                    src={item.previewUrl} 
                                    alt={item.name} 
                                    className="w-full h-20 object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                                    {uploadingImages.has(index) ? (
                                      <div className="text-white text-xs">
                                        <svg className="animate-spin w-4 h-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Uploading...</span>
                                      </div>
                                    ) : item.error ? (
                                      <div className="text-center">
                                        <button
                                          type="button"
                                          onClick={() => retryUpload(index)}
                                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded mb-1"
                                        >
                                          Retry
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeQueuedImage(index)}
                                          className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => removeQueuedImage(index)}
                                        className="opacity-0 group-hover:opacity-100 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                  {item.error && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-xs p-1 text-center">
                                      Failed
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
                        
                        {!selectedItem?.item_no && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                  ℹ️ New Item - Images Disabled
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                  Images will be uploaded automatically once the item is saved. Select images now and they will upload after creating the item.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Existing Images Gallery */}
                    {existingImages.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Existing Images ({existingImages.length})
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {existingImages.map((img) => (
                            <div key={img.filename} className="relative group border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-black/30">
                              <img src={img.url} alt={img.filename} className="w-full h-24 object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleImageDelete(img.filename)}
                                  className="opacity-0 group-hover:opacity-100 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">✓</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Confirm</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Please review all details before submitting
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-2xl">
                        📦
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Basic Info</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <p><strong>Name:</strong> {wizardData.item_name}</p>
                      {wizardData.brand && <p><strong>Brand:</strong> {wizardData.brand}</p>}
                      {wizardData.item_type && <p><strong>Type:</strong> {wizardData.item_type}</p>}
                      { (wizardData.supplier_id && wizardData.supplier_id !== '__custom') && <p><strong>Supplier:</strong> {wizardData.supplier}</p>}
                      { wizardData.supplier_id === '__custom' && wizardData.custom_supplier && <p><strong>Supplier:</strong> {wizardData.custom_supplier}</p>}
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-2xl">
                        💰
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Stock & Price</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <p><strong>Balance:</strong> {wizardData.balance} {wizardData.unit_of_measure || 'units'}</p>
                      <p><strong>ROP:</strong> {wizardData.min_stock} {wizardData.unit_of_measure || 'units'}</p>
                      <p><strong>MOQ:</strong> {wizardData.moq} {wizardData.unit_of_measure || 'units'}</p>
                      <p><strong>Price:</strong> ₱{(Number(wizardData.price_per_unit) || 0).toFixed(2)}</p>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        <strong>Total Value:</strong> ₱{((wizardData.balance || 0) * (Number(wizardData.price_per_unit) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-2xl">
                        📍
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Location & Status</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <p><strong>Location:</strong> {wizardData.location || 'Not specified'}</p>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          wizardData.item_status === 'In Stock'
                            ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                            : wizardData.item_status === 'Low In Stock'
                            ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                        }`}>
                          {wizardData.item_status}
                        </span>
                      </p>
                      <p><strong>Images:</strong> {existingImages.length} uploaded</p>
                    </div>
                  </div>
                </div>

                {/* Full Details Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">Complete Item Details</h4>
                  </div>
                  <div className="p-6 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Item Name:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.item_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Brand:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.brand || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Item Type:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.item_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.supplier_id === '__custom' ? (wizardData.custom_supplier || 'N/A') : (wizardData.supplier || 'N/A')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.balance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ROP:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.min_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">MOQ:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.moq}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Unit of Measure:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.unit_of_measure || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Price per Unit:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₱{(Number(wizardData.price_per_unit) || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Location:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.location || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.item_status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Images Preview */}
                {existingImages.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Attached Images ({existingImages.length})</h4>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {existingImages.map((img) => (
                        <img key={img.filename} src={img.url} alt={img.filename} className="w-full h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep > 1) handlePrevious()
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
                if (currentStep < 4) handleNext()
                else handleSubmit()
              }}
              disabled={
                (currentStep === 1 && !canProceedFromStep1) ||
                (currentStep === 2 && !canProceedFromStep2)
              }
              className="px-8 py-2.5 bg-linear-to-r from-zinc-600 to-gray-700 hover:from-zinc-700 hover:to-gray-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all font-semibold shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 4 ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {selectedItem ? 'Update Item' : 'Create Item'}
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

export default AddEditItemWizard
