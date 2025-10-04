import { useEffect, useState } from "react"
import ModalPortal from "/src/components/pd/ModalPortal"
import { items as itemsService } from "../../utils/api/api-service.js"

function AddEditItemWizard({ isOpen, onClose, onSave, selectedItem = null }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState({})

  const [wizardData, setWizardData] = useState({
    // Step 1: Basic Information
    item_name: "",
    brand: "",
    item_type: "",
    supplier: "",

    // Step 2: Stock & Pricing
    balance: 0,
    min_stock: 0,
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
        balance: selectedItem?.balance || 0,
        min_stock: selectedItem?.min_stock || 0,
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
      onSave(wizardData)
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

  const handleImageDelete = async (filename) => {
    if (!selectedItem?.item_no) return
    const confirmed = window.confirm(`Delete ${filename}?`)
    if (!confirmed) return
    try {
      await itemsService.deleteItemImage(selectedItem.item_no, filename)
      setExistingImages(prev => prev.filter(i => i.filename !== filename))
      if (currentImageUrl.includes(encodeURIComponent(filename))) {
        const latest = itemsService.getItemLatestImageUrl(selectedItem.item_no)
        setCurrentImageUrl(`${latest}?t=${Date.now()}`)
      }
    } catch (e) {
      alert(e.message || 'Failed to delete image')
    }
  }

  const canProceedFromStep1 = wizardData.item_name.trim().length > 0
  const canProceedFromStep2 = wizardData.balance >= 0 && wizardData.min_stock >= 0 && wizardData.price_per_unit >= 0

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-700 to-gray-800 dark:from-zinc-800 dark:to-gray-900 p-6 text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {selectedItem ? "Edit Item" : "Add New Item"}
              </h2>
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
                      if (step.number === 2 && canProceedFromStep1 && currentStep >= 2) setCurrentStep(2)
                      if (step.number === 3 && canProceedFromStep2 && currentStep >= 3) setCurrentStep(3)
                      if (step.number === 4 && currentStep >= 4) setCurrentStep(4)
                    }}
                    disabled={
                      (step.number === 2 && !canProceedFromStep1 && currentStep < 2) ||
                      (step.number === 3 && !canProceedFromStep2 && currentStep < 3) ||
                      (step.number === 4 && currentStep < 4)
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
                        ? 'bg-white text-zinc-700 shadow-md'
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
                        <span className="text-2xl">{step.icon}</span>
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

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wizardData.item_name}
                      onChange={(e) => setWizardData({ ...wizardData, item_name: e.target.value })}
                      className={`w-full border-2 ${errors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500 text-lg`}
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
                      <input
                        type="text"
                        value={wizardData.brand}
                        onChange={(e) => setWizardData({ ...wizardData, brand: e.target.value })}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500"
                        placeholder="e.g., Samsung, Nike"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Item Type
                      </label>
                      <input
                        type="text"
                        value={wizardData.item_type}
                        onChange={(e) => setWizardData({ ...wizardData, item_type: e.target.value })}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500"
                        placeholder="e.g., Electronics, Tools"
                      />
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={wizardData.supplier}
                      onChange={(e) => setWizardData({ ...wizardData, supplier: e.target.value })}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500"
                      placeholder="Enter supplier name"
                    />
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

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Balance & Min Stock */}
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
                          className={`w-full border-2 ${errors.balance ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500 text-lg`}
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
                          className="w-full border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Use "Stock Management" to modify inventory levels
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Stock <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wizardData.min_stock}
                        onChange={(e) => setWizardData({ ...wizardData, min_stock: parseInt(e.target.value) || 0 })}
                        className={`w-full border-2 ${errors.min_stock ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500 text-lg`}
                        placeholder="Alert threshold"
                      />
                      {errors.min_stock && (
                        <p className="text-red-500 text-sm mt-1">{errors.min_stock}</p>
                      )}
                    </div>
                  </div>

                  {/* Unit of Measure & Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Unit of Measure
                      </label>
                      <input
                        type="text"
                        value={wizardData.unit_of_measure}
                        onChange={(e) => setWizardData({ ...wizardData, unit_of_measure: e.target.value })}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500"
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
                          onChange={(e) => setWizardData({ ...wizardData, price_per_unit: parseFloat(e.target.value) || 0 })}
                          className={`w-full border-2 ${errors.price_per_unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500 text-lg`}
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

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 space-y-6">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={wizardData.location}
                      onChange={(e) => setWizardData({ ...wizardData, location: e.target.value })}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-zinc-500/20 focus:border-zinc-500"
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
                      <div className="w-48 h-48 bg-white dark:bg-black/40 rounded-xl overflow-hidden flex items-center justify-center border-2 border-gray-300 dark:border-gray-700 flex-shrink-0">
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
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            setUploadError("")
                            setSelectedImage(null)
                            setPreviewUrl("")
                            if (!file) return
                            const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp"]
                            if (!allowed.includes(file.type)) {
                              setUploadError("Invalid file type. Use JPG, PNG, GIF, WEBP, or BMP.")
                              return
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              setUploadError("File too large (max 10MB).")
                              return
                            }
                            setSelectedImage(file)
                            const reader = new FileReader()
                            reader.onload = () => setPreviewUrl(reader.result)
                            reader.readAsDataURL(file)
                          }}
                          className="w-full"
                        />
                        {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            disabled={!selectedImage || uploading || !selectedItem}
                            onClick={() => handleImageUpload(false)}
                            className="px-4 py-2 bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {uploading ? "Uploading..." : "Upload (Add)"}
                          </button>
                          <button
                            type="button"
                            disabled={!selectedImage || uploading || !selectedItem}
                            onClick={() => handleImageUpload(true)}
                            className="px-4 py-2 bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {uploading ? "Uploading..." : "Replace All"}
                          </button>
                        </div>
                        {!selectedItem && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Create the item first, then reopen to upload images.
                          </p>
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
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
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
                      {wizardData.supplier && <p><strong>Supplier:</strong> {wizardData.supplier}</p>}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-2xl">
                        💰
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Stock & Price</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <p><strong>Balance:</strong> {wizardData.balance} {wizardData.unit_of_measure || 'units'}</p>
                      <p><strong>Min Stock:</strong> {wizardData.min_stock} {wizardData.unit_of_measure || 'units'}</p>
                      <p><strong>Price:</strong> ₱{(Number(wizardData.price_per_unit) || 0).toFixed(2)}</p>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        <strong>Total Value:</strong> ₱{((wizardData.balance || 0) * (Number(wizardData.price_per_unit) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
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
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
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
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.supplier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.balance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Min Stock:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{wizardData.min_stock}</span>
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
              className="px-8 py-2.5 bg-gradient-to-r from-zinc-600 to-gray-700 hover:from-zinc-700 hover:to-gray-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all font-semibold shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
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
