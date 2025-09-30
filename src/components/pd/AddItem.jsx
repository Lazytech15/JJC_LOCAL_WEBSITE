import { useState } from "react"
import ModalPortal from "/src/components/pd/ModalPortal"

function AddItemForm({ isOpen, onClose, onSave, selectedItem = null }) {
  const [formData, setFormData] = useState({
    item_name: selectedItem?.item_name || "",
    brand: selectedItem?.brand || "",
    item_type: selectedItem?.item_type || "",
    location: selectedItem?.location || "",
    balance: selectedItem?.balance || 0,
    min_stock: selectedItem?.min_stock || 0,
    unit_of_measure: selectedItem?.unit_of_measure || "",
    price_per_unit: selectedItem?.price_per_unit || 0,
    item_status: selectedItem?.item_status || "In Stock",
    supplier: selectedItem?.supplier || "",
  })

  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.item_name.trim()) {
      newErrors.item_name = "Item name is required"
    }
    
    if (formData.balance < 0) {
      newErrors.balance = "Balance cannot be negative"
    }
    
    if (formData.min_stock < 0) {
      newErrors.min_stock = "Minimum stock cannot be negative"
    }
    
    if (formData.price_per_unit < 0) {
      newErrors.price_per_unit = "Price cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSave(formData)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      item_name: "",
      brand: "",
      item_type: "",
      location: "",
      balance: 0,
      min_stock: 0,
      unit_of_measure: "",
      price_per_unit: 0,
      item_status: "In Stock",
      supplier: "",
    })
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {selectedItem ? "Edit Item" : "Add New Item"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => handleInputChange("item_name", e.target.value)}
                  className={`w-full border ${errors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors`}
                  placeholder="Enter item name"
                />
                {errors.item_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.item_name}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                  placeholder="Enter brand name"
                />
              </div>

              {/* Item Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Type
                </label>
                <input
                  type="text"
                  value={formData.item_type}
                  onChange={(e) => handleInputChange("item_type", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                  placeholder="e.g., Electronics, Clothing, etc."
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                  placeholder="e.g., Warehouse A, Shelf 1-A, etc."
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange("supplier", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                  placeholder="Enter supplier name"
                />
              </div>

              {/* Balance - Different behavior for new vs edit */}
              {!selectedItem ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Initial Balance *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.balance}
                    onChange={(e) => handleInputChange("balance", parseInt(e.target.value) || 0)}
                    className={`w-full border ${errors.balance ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors`}
                    placeholder="Enter initial quantity"
                  />
                  {errors.balance && (
                    <p className="text-red-500 text-xs mt-1">{errors.balance}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Balance (Read Only)
                  </label>
                  <input
                    type="text"
                    value={`${selectedItem.balance}`}
                    disabled
                    className="w-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use "Stock Management" to modify inventory levels
                  </p>
                </div>
              )}

              {/* Minimum Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Stock *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => handleInputChange("min_stock", parseInt(e.target.value) || 0)}
                  className={`w-full border ${errors.min_stock ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors`}
                  placeholder="Alert threshold"
                />
                {errors.min_stock && (
                  <p className="text-red-500 text-xs mt-1">{errors.min_stock}</p>
                )}
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit of Measure
                </label>
                <input
                  type="text"
                  value={formData.unit_of_measure}
                  onChange={(e) => handleInputChange("unit_of_measure", e.target.value)}
                  placeholder="e.g., pcs, kg, ltr, box"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                />
              </div>

              {/* Price per Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price per Unit
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_per_unit}
                  onChange={(e) => handleInputChange("price_per_unit", parseFloat(e.target.value) || 0)}
                  className={`w-full border ${errors.price_per_unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors`}
                  placeholder="0.00"
                />
                {errors.price_per_unit && (
                  <p className="text-red-500 text-xs mt-1">{errors.price_per_unit}</p>
                )}
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.item_status}
                  onChange={(e) => handleInputChange("item_status", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Low In Stock">Low In Stock</option>
                  <option value="Out Of Stock">Out Of Stock</option>
                </select>
              </div>
            </div>

            {/* Form Preview */}
            {formData.item_name && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Preview</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p><strong>Item:</strong> {formData.item_name} {formData.brand && `(${formData.brand})`}</p>
                  <p><strong>Type:</strong> {formData.item_type || "Not specified"}</p>
                  <p><strong>Location:</strong> {formData.location || "Not specified"}</p>
                  <p><strong>Initial Stock:</strong> {formData.balance} {formData.unit_of_measure}</p>
                  <p><strong>Min Stock:</strong> {formData.min_stock} {formData.unit_of_measure}</p>
                  {formData.price_per_unit > 0 && (
                    <p><strong>Price:</strong> ₱{formData.price_per_unit.toFixed(2)} per {formData.unit_of_measure || "unit"}</p>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="submit"
                disabled={!formData.item_name.trim()}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white px-4 py-3 rounded-lg transition-all duration-200 font-semibold"
              >
                {selectedItem ? "Update Item" : "Create Item"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}

export default AddItemForm