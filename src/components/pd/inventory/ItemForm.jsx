"use client"

import { useState, useEffect } from "react"
import { items as itemsService } from "../../../utils/api/api-service.js"

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
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [currentImageUrl, setCurrentImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [existingImages, setExistingImages] = useState([])

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
      // Load current image
      if (item.item_no) {
        // Load gallery
        ;(async () => {
          try {
            const res = await itemsService.getItemImages(item.item_no)
            const list = (res?.data || []).map(img => ({...img, url: `${itemsService.getItemImageUrl(item.item_no, img.filename)}?t=${Date.now()}`}))
            setExistingImages(list)
            const url = itemsService.getItemLatestImageUrl(item.item_no)
            setCurrentImageUrl(`${url}?t=${Date.now()}`)
          } catch {
            setExistingImages([])
            const url = itemsService.getItemLatestImageUrl(item.item_no)
            setCurrentImageUrl(`${url}?t=${Date.now()}`)
          }
        })()
      } else {
        setCurrentImageUrl("")
        setExistingImages([])
      }
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

  const handleImageChange = (e) => {
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
  }

  const uploadSelected = async (replace = false) => {
    if (!selectedImage) return
    if (!item?.item_no) {
      setUploadError("Save the item first to upload an image.")
      return
    }
    try {
      setUploading(true)
      setUploadError("")
      const res = replace
        ? await itemsService.replaceItemImage(item.item_no, selectedImage)
        : await itemsService.uploadItemImage(item.item_no, selectedImage)
      // Refresh current image
      const url = itemsService.getItemLatestImageUrl(item.item_no)
      setCurrentImageUrl(`${url}?t=${Date.now()}`)
      // Refresh gallery
      try {
        const fres = await itemsService.getItemImages(item.item_no)
        const list = (fres?.data || []).map(img => ({...img, url: `${itemsService.getItemImageUrl(item.item_no, img.filename)}?t=${Date.now()}`}))
        setExistingImages(list)
      } catch {}
      setSelectedImage(null)
      setPreviewUrl("")
    } catch (err) {
      setUploadError(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
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
              {/* Image section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-40 h-40 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="object-contain w-full h-full" />
                    ) : currentImageUrl ? (
                      <img src={currentImageUrl} alt="Current" className="object-contain w-full h-full" onError={() => setCurrentImageUrl("")} />
                    ) : (
                      <span className="text-gray-400">No Image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    {uploadError && <p className="text-red-500 text-sm mt-1">{uploadError}</p>}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        disabled={!selectedImage || uploading || !item}
                        onClick={() => uploadSelected(false)}
                        className="px-3 py-2 bg-emerald-600 disabled:bg-gray-400 text-white rounded"
                      >
                        {uploading ? "Uploading..." : "Upload (Add)"}
                      </button>
                      <button
                        type="button"
                        disabled={!selectedImage || uploading || !item}
                        onClick={() => uploadSelected(true)}
                        className="px-3 py-2 bg-blue-600 disabled:bg-gray-400 text-white rounded"
                      >
                        {uploading ? "Uploading..." : "Replace Existing"}
                      </button>
                    </div>
                    {!item && (
                      <p className="text-xs text-gray-500 mt-1">Create the item first before uploading an image.</p>
                    )}
                  </div>
                </div>
                {existingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Existing Images</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {existingImages.map((img) => (
                        <div key={img.filename} className="relative group border rounded-md overflow-hidden bg-white">
                          <img src={img.url} alt={img.filename} className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center p-1">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!item?.item_no) return
                                const confirmed = window.confirm(`Delete ${img.filename}?`)
                                if (!confirmed) return
                                try {
                                  await itemsService.deleteItemImage(item.item_no, img.filename)
                                  setExistingImages(prev => prev.filter(i => i.filename !== img.filename))
                                  // refresh main image if we deleted the displayed one
                                  if (currentImageUrl.includes(encodeURIComponent(img.filename))) {
                                    const url = itemsService.getItemLatestImageUrl(item.item_no)
                                    setCurrentImageUrl(`${url}?t=${Date.now()}`)
                                  }
                                } catch (e) {
                                  alert(e.message || 'Failed to delete image')
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 text-xs bg-red-600 text-white px-2 py-1 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
