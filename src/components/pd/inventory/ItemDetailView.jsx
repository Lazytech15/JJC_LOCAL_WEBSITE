"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { items as itemsService } from "../../../utils/api/api-service.js"
import { getStoredToken } from "../../../utils/auth"

export function ItemDetailView({ item, onAddToCart, onBack, onEdit }) {
  const [quantity, setQuantity] = useState(1)
  const [imageUrl, setImageUrl] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const rotationTimer = useRef(null)

  // Image cache like HR Department
  const [imageCache, setImageCache] = useState(new Map())

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

  // Load images individually like HR Department for faster loading
  const loadImagesIndividually = async () => {
    if (!item?.item_no) return

    try {
      // First try to get the image list
      const res = await itemsService.getItemImages(item.item_no)
      if (!res?.success) throw new Error('Failed to load images')

      const imageList = res.data || []

      // Load each image individually
      imageList.forEach((img) => {
        (async () => {
          try {
            const imageUrl = itemsService.getItemImageUrl(item.item_no, img.filename)

            // Test if the image exists by fetching it
            const response = await fetch(imageUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${getStoredToken()}`
              }
            })

            if (response.ok) {
              // Cache the URL
              setImageCache(prev => new Map(prev).set(img.filename, imageUrl))
            }
          } catch (err) {
            console.log(`[ItemDetailView] ✗ Error loading image ${img.filename}:`, err.message)
          }
        })()
      })

      // Set images list
      setImages(imageList)
      setCurrentIndex(0)

    } catch (e) {
      console.error('[ItemDetailView] Failed to load images list:', e)
      // Fallback to latest image
      try {
        const latestUrl = itemsService.getItemLatestImageUrl(item.item_no)
        const response = await fetch(latestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getStoredToken()}`
          }
        })

        if (response.ok) {
          setImageCache(prev => new Map(prev).set('latest', latestUrl))
          setImages([{ filename: 'latest', url: latestUrl }])
        }
      } catch (fallbackErr) {
        console.log('[ItemDetailView] No images available')
      }
    }
  }

  useEffect(() => {
    setImageError(false)
    setImageCache(new Map()) // Clear cache for new item
    setImages([])
    setImageUrl(null)

    if (item?.item_no) {
      loadImagesIndividually()
    }
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
    if (images.length > 0 && currentIndex < images.length) {
      const currentImage = images[currentIndex]
      if (currentImage) {
        const cachedUrl = imageCache.get(currentImage.filename)
        setImageUrl(cachedUrl || null)
        setImageError(false)
      }
    } else {
      setImageUrl(null)
    }
  }, [currentIndex, images, imageCache])

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Industrial Themed Header */}
      <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-slate-800 via-zinc-800 to-slate-800 dark:from-slate-900 dark:via-zinc-900 dark:to-slate-900 rounded-lg p-3 sm:p-4 relative overflow-hidden border-l-4 border-amber-500">
        {/* Decorative Gear */}
        <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black">
            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
          </svg>
        </div>
        
        <button
          onClick={onBack}
          className="relative z-10 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Inventory</span>
          <span className="sm:hidden">Back</span>
        </button>
        
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="relative z-10 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Edit Item</span>
            <span className="sm:hidden">Edit</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Image Section - Industrial Theme */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-lg border-2 border-slate-300 dark:border-slate-700 p-4 sm:p-6 relative overflow-hidden">
          {/* Metal pattern overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)`
            }}/>
          </div>
          
          <div className="relative aspect-square bg-white dark:bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-inner">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={item.item_name}
                className="w-full h-full object-contain p-4"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="text-center text-black dark:text-slate-600">
                <svg className="w-20 h-20 mx-auto mb-3 opacity-30" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 2v3h4V6H4m6 0v3h10V6H10M4 11v3h4v-3H4m6 0v3h10v-3H10M4 16v2h4v-2H4m6 0v2h10v-2H10z" />
                </svg>
                <div className="text-sm font-medium">No Image Available</div>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="relative flex justify-center gap-2 mt-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Image ${i+1}`}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i===currentIndex 
                      ? 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-700 scale-110' 
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Information - Industrial Theme */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-lg border-2 border-slate-300 dark:border-slate-700 p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-slate-100 mb-3 flex items-start gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                </svg>
              </div>
              <span>{item.item_name}</span>
            </h1>

            <div className="space-y-2 text-sm text-black dark:text-slate-400">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-black dark:text-amber-500">Item Number:</span>
                <span className="font-mono text-black dark:text-slate-100">#{item.item_no}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Brand:</span>
                <span className="text-black dark:text-slate-100">{item.brand || '-'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Item Type:</span>
                <span className="text-black dark:text-slate-100">{item.item_type || '-'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Location:</span>
                <span className="text-black dark:text-slate-100">{item.location || '-'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Current Balance:</span>
                <span className="font-bold text-lg text-black dark:text-slate-100">{item.balance || 0} <span className="text-xs text-black">{item.unit_of_measure || ''}</span></span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Price per Unit:</span>
                <span className="font-bold text-lg text-black dark:text-amber-500">{formatCurrency(item.price_per_unit || 0)}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="font-semibold">Supplier:</span>
                <span className="text-black dark:text-slate-100">{item.supplier || '-'}</span>
              </div>
            </div>
          </div>

          {/* Status Badge - Industrial Style */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-black dark:text-slate-400">Status:</span>
            <span className={`${getStatusColor(status)} text-white text-sm px-4 py-1.5 rounded-full inline-flex items-center gap-2 font-semibold shadow-md`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {getStatusText(status)}
            </span>
          </div>


          {/* Quantity Selection - Industrial Theme */}
          {status !== "Out Of Stock" && onAddToCart && (
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-lg border-2 border-slate-300 dark:border-slate-700 p-4">
              <div className="space-y-3">
                <h3 className="font-bold text-black dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-black dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  Select Quantity
                </h3>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-600 dark:border-slate-700 rounded-lg flex items-center justify-center text-white hover:from-slate-600 hover:to-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="text-3xl font-bold w-20 text-center text-black dark:text-slate-100 tabular-nums">{quantity}</div>

                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= (item.balance || 0)}
                    className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-600 dark:border-slate-700 rounded-lg flex items-center justify-center text-white hover:from-slate-600 hover:to-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-center text-black dark:text-slate-400">
                  <span className="font-semibold">Available:</span> {item.balance || 0} units
                </p>
              </div>
            </div>
          )}

          {/* Add to Cart Button - Industrial Theme */}
          {onAddToCart && (
            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                disabled={status === "Out Of Stock"}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all text-base font-bold shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
              >
                {status === "Out Of Stock" ? "Out of Stock" : `Add ${quantity} to Toolbox`}
              </button>

              {status === "Out Of Stock" && (
                <p className="text-sm text-black dark:text-red-400 text-center">This item is currently out of stock</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mt-8">
        <h3 className="font-medium text-black dark:text-slate-100 mb-4">Item Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-medium text-black dark:text-slate-300 mb-1">Status</p>
            <p className="text-black dark:text-slate-400">{getStatusText(status)}</p>
          </div>
          <div>
            <p className="font-medium text-black dark:text-slate-300 mb-1">Available Stock</p>
            <p className="text-black dark:text-slate-400">{item.balance || 0} {item.unit_of_measure || 'units'}</p>
          </div>
          <div>
            <p className="font-medium text-black dark:text-slate-300 mb-1">Minimum Stock</p>
            <p className="text-black dark:text-slate-400">{item.min_stock || 0} {item.unit_of_measure || 'units'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}