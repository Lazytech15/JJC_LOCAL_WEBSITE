"use client"

import { useState, useEffect } from "react"

function ItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    item_name: "",
    brand: "",
    item_type: "",
    location: "",
    unit_of_measure: "",
    in_qty: 0,
    out_qty: 0,
    min_stock: 0,
    price_per_unit: 0,
    last_po: "",
    supplier: "",
  })
  const [errors, setErrors] = useState({})
  const [stockWarning, setStockWarning] = useState("")

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || "",
        brand: item.brand || "",
        item_type: item.item_type || "",
        location: item.location || "",
        unit_of_measure: item.unit_of_measure || "",
        in_qty: item.in_qty || 0,
        out_qty: item.out_qty || 0,
        min_stock: item.min_stock || 0,
        price_per_unit: item.price_per_unit || 0,
        last_po: item.last_po || "",
        supplier: item.supplier || "",
      })
    }
  }, [item])

  useEffect(() => {
    // Check for stock warnings
    const balance = formData.in_qty - formData.out_qty
    if (balance <= 0) {
      setStockWarning("⚠️ This item will be out of stock!")
    } else if (balance <= formData.min_stock) {
      setStockWarning("⚠️ This item will be low in stock!")
    } else {
      setStockWarning("")
    }
  }, [formData.in_qty, formData.out_qty, formData.min_stock])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.item_name.trim()) {
      newErrors.item_name = "Item name is required"
    }

    if (formData.in_qty < 0) {
      newErrors.in_qty = "In quantity cannot be negative"
    }

    if (formData.out_qty < 0) {
      newErrors.out_qty = "Out quantity cannot be negative"
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
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{item ? "Edit Item" : "Add New Item"}</h2>

          {stockWarning && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
              <p className="text-yellow-800">{stockWarning}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.item_name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter item name"
                />
                {errors.item_name && <p className="text-red-500 text-sm mt-1">{errors.item_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                <input
                  type="text"
                  name="item_type"
                  value={formData.item_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter item type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                <input
                  type="text"
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., pcs, kg, liters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">In Quantity</label>
                <input
                  type="number"
                  name="in_qty"
                  value={formData.in_qty}
                  onChange={handleChange}
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.in_qty ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.in_qty && <p className="text-red-500 text-sm mt-1">{errors.in_qty}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Out Quantity</label>
                <input
                  type="number"
                  name="out_qty"
                  value={formData.out_qty}
                  onChange={handleChange}
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.out_qty ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.out_qty && <p className="text-red-500 text-sm mt-1">{errors.out_qty}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                <input
                  type="number"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleChange}
                  min="0"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.min_stock ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.min_stock && <p className="text-red-500 text-sm mt-1">{errors.min_stock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                <input
                  type="number"
                  name="price_per_unit"
                  value={formData.price_per_unit}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.price_per_unit ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.price_per_unit && <p className="text-red-500 text-sm mt-1">{errors.price_per_unit}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Purchase Order Date</label>
                <input
                  type="date"
                  name="last_po"
                  value={formData.last_po}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {item ? "Update Item" : "Add Item"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ItemForm
