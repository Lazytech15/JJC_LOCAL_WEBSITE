"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { items as itemsService } from "../../utils/api/api-service.js"

export function ItemDetailView({ item, onAddToCart, onBack, onEdit }) {
  const [quantity, setQuantity] = useState(1)
  const [imageUrl, setImageUrl] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const rotationTimer = useRef(null)

  const getStatusColor = (status) => {
    switch (status) {
      case "in-stock":
      case "In Stock":
        return "bg-green-500"
      case "low-stock":
      case "Low In Stock":
        return "bg-orange-500"
      case "out-of-stock":
      case "Out Of Stock":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "in-stock":
      case "In Stock":
        return "In Stock"
      case "low-stock":
      case "Low In Stock":
        return "Low Stock"
      case "out-of-stock":
      case "Out Of Stock":
        return "Out of Stock"
      default:
        return "Unknown"
    }
  }

  const deriveStatus = (item) => {
    const bal = Number(item.balance) || 0
    const min = Number(item.min_stock) || 0
    if (bal === 0) return "Out Of Stock"
    if (min > 0 && bal < min) return "Low In Stock"
    return "In Stock"
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(item, quantity)
      setQuantity(1) // Reset quantity after adding
    }
  }

  const incrementQuantity = () => {
    if (quantity < (item.balance || 0)) {
      setQuantity((prev) => prev + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const status = deriveStatus(item)

  useEffect(() => {
    setImageError(false)
    if (!item?.item_no) {
      setImageUrl(null)
      return
    }
    // Load images list
    let cancelled = false
    ;(async () => {
      try {
        const res = await itemsService.getItemImages(item.item_no)
        if (!res?.success) throw new Error('Failed to load images')
        const list = (res.data || []).map(img => ({
          ...img,
          url: `${itemsService.getItemImageUrl(item.item_no, img.filename)}?t=${Date.now()}`,
        }))
        if (!cancelled) {
          setImages(list)
          setCurrentIndex(0)
          setImageUrl(list[0]?.url || null)
        }
      } catch (e) {
        if (!cancelled) {
          setImages([])
          // Fallback to latest endpoint if listing fails
          const url = itemsService.getItemLatestImageUrl(item.item_no)
          setImageUrl(`${url}?t=${Date.now()}`)
        }
      }
    })()
    return () => { cancelled = true }
  }, [item?.item_no])

  // Auto-rotate when multiple images
  useEffect(() => {
    if (rotationTimer.current) {
      clearInterval(rotationTimer.current)
      rotationTimer.current = null
    }
    if (images.length > 1) {
      rotationTimer.current = setInterval(() => {
        setCurrentIndex((idx) => (idx + 1) % images.length)
      }, 4000) // 4s rotation
    }
    return () => {
      if (rotationTimer.current) clearInterval(rotationTimer.current)
    }
  }, [images.length])

  useEffect(() => {
    if (images.length > 0) {
      setImageUrl(images[currentIndex]?.url || null)
      setImageError(false)
    }
  }, [currentIndex, images])

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </button>
        
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            Edit Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 text-lg overflow-hidden">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={item.item_name}
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-2">📦</div>
                <div>No Image</div>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Image ${i+1}`}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full ${i===currentIndex ? 'bg-slate-600 dark:bg-slate-300' : 'bg-slate-300 dark:bg-slate-600'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">{item.item_name}</h1>

            <div className="space-y-3 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="font-medium">Item Number:</span>
                <span>{item.item_no}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Brand:</span>
                <span>{item.brand || '-'}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Item Type:</span>
                <span>{item.item_type || '-'}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span>{item.location || '-'}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Current Balance:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.balance || 0} {item.unit_of_measure || ''}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Price per Unit:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.price_per_unit || 0)}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Supplier:</span>
                <span>{item.supplier || '-'}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            <span className={`${getStatusColor(status)} text-white text-sm px-4 py-2 rounded-full inline-block`}>
              {getStatusText(status)}
            </span>
          </div>


          {/* Quantity Selection */}
          {status !== "Out Of Stock" && onAddToCart && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Select Quantity</h3>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-2xl font-bold w-16 text-center">{quantity}</div>

                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= (item.balance || 0)}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400">Maximum available: {item.balance || 0}</p>
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          {onAddToCart && (
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={status === "Out Of Stock"}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors text-lg font-semibold"
              >
                {status === "Out Of Stock" ? "Out of Stock" : `Add ${quantity} to Toolbox`}
              </button>

              {status === "Out Of Stock" && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">This item is currently out of stock</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mt-8">
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">Item Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Status</p>
            <p className="text-slate-600 dark:text-slate-400">{getStatusText(status)}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Available Stock</p>
            <p className="text-slate-600 dark:text-slate-400">{item.balance || 0} {item.unit_of_measure || 'units'}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Stock</p>
            <p className="text-slate-600 dark:text-slate-400">{item.min_stock || 0} {item.unit_of_measure || 'units'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}