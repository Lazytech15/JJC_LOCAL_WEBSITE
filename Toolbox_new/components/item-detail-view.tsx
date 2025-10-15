"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Plus, Minus, Package, Briefcase, Cog, Wrench } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import type { Product } from "../lib/barcode-scanner"
import { apiService } from "../lib/api_service"

interface ItemDetailViewProps {
  product: Product
  onAddToCart: (product: Product, quantity: number) => void
  onBack: () => void
}

export function ItemDetailView({ product, onAddToCart, onBack }: ItemDetailViewProps) {
  const [quantity, setQuantity] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())
  const [images, setImages] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const rotationTimer = useRef<NodeJS.Timeout | null>(null)

  // Load images individually like HR/PD departments for better error handling
  const loadImagesIndividually = async () => {
    if (!product?.id) return

    const itemId = typeof product.id === 'number' ? product.id : parseInt(product.id, 10)
    if (isNaN(itemId)) return

    try {
      // First try to get the image list
      const res = await apiService.getItemImages(itemId)
      if (!res?.success) throw new Error('Failed to load images')

      const imageList = res.data || []

      // Load each image individually with existence check
      imageList.forEach((img: any) => {
        (async () => {
          try {
            const imageUrl = apiService.getItemImageUrl(itemId, img.filename)

            // Test if the image exists by fetching it
            const response = await fetch(imageUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
              }
            })

            if (response.ok) {
              // Cache the URL
              setImageCache(prev => new Map(prev).set(img.filename, imageUrl))
            }
          } catch (err) {
            console.log(`[Toolbox ItemDetailView] ✗ Error loading image ${img.filename}:`, (err as Error).message)
          }
        })()
      })

      // Set images list and initial image
      const validImages = imageList.filter((img: any) => imageCache.has(img.filename))
      setImages(validImages)
      setCurrentIndex(0)
      if (validImages.length > 0) {
        setImageUrl(imageCache.get(validImages[0].filename) || null)
      }

    } catch (e) {
      console.error('[Toolbox ItemDetailView] Failed to load images list:', e)
      // Fallback to latest image
      try {
        const latestUrl = apiService.getItemLatestImageUrl(itemId)
        const response = await fetch(latestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        })

        if (response.ok) {
          setImageCache(prev => new Map(prev).set('latest', latestUrl))
          setImages([{ filename: 'latest', url: latestUrl }])
          setImageUrl(latestUrl)
        }
      } catch (fallbackErr) {
        console.log('[Toolbox ItemDetailView] No images available')
      }
    }
  }

  const getStatusColor = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "bg-green-500"
      case "low-stock":
        return "bg-orange-500"
      case "out-of-stock":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "In Stock"
      case "low-stock":
        return "Low Stock"
      case "out-of-stock":
        return "Out of Stock"
      default:
        return "Unknown"
    }
  }

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setQuantity(1) // Reset quantity after adding
  }

  const incrementQuantity = () => {
    if (quantity < product.balance) {
      setQuantity((prev) => prev + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  // Load images when component mounts or product changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
    if (!product?.id) {
      setImageUrl(null)
      return
    }

    const itemId = typeof product.id === 'number' ? product.id : parseInt(product.id, 10)
    if (isNaN(itemId)) {
      setImageUrl(null)
      return
    }

    loadImagesIndividually()
  }, [product?.id])

  // Auto-rotate when multiple images
  useEffect(() => {
    if (rotationTimer.current) {
      clearInterval(rotationTimer.current)
      rotationTimer.current = null
    }
    
    if (images.length > 1) {
      rotationTimer.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % images.length
          setImageUrl(images[next]?.url || null)
          return next
        })
      }, 5000) // Change image every 5 seconds
    }
    
    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current)
        rotationTimer.current = null
      }
    }
  }, [images])

  return (
    <div className="max-w-4xl mx-auto p-6 relative">
      {/* Industrial background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 right-10">
          <Cog className="w-32 h-32 text-slate-400 animate-spin-slow" />
        </div>
        <div className="absolute bottom-10 left-10">
          <Wrench className="w-24 h-24 text-slate-400 rotate-45" />
        </div>
      </div>

      {/* Back Button - Industrial Style */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="mb-6 border-2 border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        {/* Image Section - Industrial Frame */}
        <Card className="border-2 border-slate-700 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          {/* Corner bolts */}
          <div className="absolute top-3 left-3 w-2 h-2 bg-slate-500 rounded-full z-10"></div>
          <div className="absolute top-3 right-3 w-2 h-2 bg-slate-500 rounded-full z-10"></div>
          <div className="absolute bottom-3 left-3 w-2 h-2 bg-slate-500 rounded-full z-10"></div>
          <div className="absolute bottom-3 right-3 w-2 h-2 bg-slate-500 rounded-full z-10"></div>
          
          <CardContent className="p-8">
            <div className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-700 relative">
              {/* Industrial frame corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-slate-500"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-slate-500"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-slate-500"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-slate-500"></div>
              
              {!imageError && (
                <img 
                  src={imageUrl || undefined} 
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}
              {(!imageUrl || !imageLoaded || imageError) && (
                <Package className="w-24 h-24 text-slate-400" />
              )}
              
              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Information - Industrial Style */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute -inset-0.5 border border-slate-600 rounded"></div>
                <div className="relative bg-slate-800 p-2 rounded border border-slate-600">
                  <Briefcase className="w-5 h-5 text-slate-300" />
                  <div className="absolute top-0 left-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                  <div className="absolute top-0 right-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                  <div className="absolute bottom-0 right-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                </div>
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300">
                {product.name}
              </h1>
            </div>

            <div className="space-y-3 text-muted-foreground">
              <div className="flex justify-between">
                <span className="font-medium">Item Number:</span>
                <span>{product.id}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Brand:</span>
                <span>{product.brand}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Item Type:</span>
                <span>{product.itemType}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span>{product.location}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Current Balance:</span>
                <span className="font-bold text-foreground">{product.balance}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            <Badge className={`${getStatusColor(product.status)} text-white text-sm px-4 py-2`}>
              {getStatusText(product.status)}
            </Badge>
          </div>

          {/* Quantity Selection */}
          {product.status !== "out-of-stock" && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Select Quantity</h3>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-10 h-10 p-0 bg-transparent"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>

                    <div className="text-2xl font-bold w-16 text-center text-foreground">{quantity}</div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.balance}
                      className="w-10 h-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">Maximum available: {product.balance}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add to Cart Button */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.status === "out-of-stock"}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {product.status === "out-of-stock" ? "Out of Stock" : `Add ${quantity} to Toolbox`}
            </Button>

            {product.status === "out-of-stock" && (
              <p className="text-sm text-red-500 text-center">This item is currently out of stock</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-medium text-foreground mb-4">Item Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">Status</p>
              <p className="text-muted-foreground">{getStatusText(product.status)}</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Available Stock</p>
              <p className="text-muted-foreground">{product.balance} units</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Category</p>
              <p className="text-muted-foreground">{product.itemType}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
