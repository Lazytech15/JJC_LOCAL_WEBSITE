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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[1000]">
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-slate-200 dark:border-slate-700">
          {/* Enhanced Header with Industrial Theme */}
          <div className="bg-gradient-to-r from-slate-800 via-zinc-800 to-slate-800 dark:from-slate-900 dark:via-zinc-900 dark:to-slate-900 p-4 sm:p-6 text-white relative overflow-hidden">
            {/* Decorative gear pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
              </svg>
            </div>
            
            <div className="relative flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={selectedItem ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {selectedItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Enhanced Breadcrumbs - Responsive */}
            <div className="relative flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-1">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-shrink-0">
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
                      group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm
                      ${currentStep === step.number
                        ? 'bg-amber-500/20 backdrop-blur-sm shadow-lg border border-amber-500/30'
                        : currentStep > step.number
                        ? 'hover:bg-white/10 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0
                      ${currentStep === step.number
                        ? 'bg-amber-500 text-white shadow-md'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-lg sm:text-xl">{step.icon}</span>
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className={`font-semibold ${currentStep === step.number ? 'text-amber-400' : 'text-white'}`}>
                        {step.title}
                      </div>
                      <div className="text-white/70 text-xs">{step.description}</div>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-4 sm:w-8 mx-1 transition-colors ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                        <label className="block mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                            Select Image File
                          </span>
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
                            className="block w-full text-sm text-slate-600 dark:text-slate-400
                              file:mr-4 file:py-2.5 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-gradient-to-r file:from-violet-500 file:to-purple-600
                              file:text-white
                              hover:file:from-violet-600 hover:file:to-purple-700
                              file:cursor-pointer file:transition-all file:shadow-md hover:file:shadow-lg
                              cursor-pointer
                              border-2 border-dashed border-slate-300 dark:border-slate-600 
                              rounded-lg p-3
                              hover:border-violet-400 dark:hover:border-violet-500
                              bg-slate-50 dark:bg-slate-800/50
                              transition-colors"
                          />
                        </label>
                        
                        {selectedImage && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                            <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">File selected:</span> {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
                            </p>
                          </div>
                        )}
                        
                        {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            disabled={!selectedImage || uploading || !selectedItem?.item_no}
                            onClick={() => handleImageUpload(false)}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            title={!selectedItem?.item_no ? "Item must be saved first" : !selectedImage ? "Please select an image file" : ""}
                          >
                            {uploading ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Upload (Add)</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={!selectedImage || uploading || !selectedItem?.item_no}
                            onClick={() => handleImageUpload(true)}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            title={!selectedItem?.item_no ? "Item must be saved first" : !selectedImage ? "Please select an image file" : ""}
                          >
                            {uploading ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Replacing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Replace All</span>
                              </>
                            )}
                          </button>
                        </div>
                        {!selectedItem?.item_no && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                  ℹ️ New Item - Images Disabled
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                  Upload buttons are disabled because this item hasn't been saved yet. Images require an item number (item_no) from the database.
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 font-medium">
                                  📝 To upload images: Complete the wizard → Click "Create Item" → Edit the item from inventory → Upload images
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedItem?.item_no && !selectedImage && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                  📸 Ready to Upload
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                  Item #{selectedItem.item_no} is ready for image uploads. Select a file above to enable the upload buttons.
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
