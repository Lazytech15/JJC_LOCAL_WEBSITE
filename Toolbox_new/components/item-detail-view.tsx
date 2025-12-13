"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Plus, Minus, Package, ChevronLeft, ChevronRight } from "lucide-react"
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

      if (imageList.length === 0) {
        // No images in list, try latest
        throw new Error('No images in list')
      }

      // Build URLs directly without validation (let browser handle 404)
      const imagesWithUrls = imageList.map((img: any) => ({
        ...img,
        url: apiService.getItemImageUrl(itemId, img.filename)
      }))

      // Set images and display first one
      setImages(imagesWithUrls)
      setCurrentIndex(0)
      if (imagesWithUrls.length > 0) {
        setImageUrl(imagesWithUrls[0].url)
      }

    } catch (e) {
      console.error('[Toolbox ItemDetailView] Failed to load images list:', e)
      // Fallback to latest image endpoint
      try {
        const latestUrl = apiService.getItemLatestImageUrl(itemId)
        setImages([{ filename: 'latest', url: latestUrl }])
        setImageUrl(latestUrl)
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
          const nextImage = images[next]
          if (nextImage) {
            setImageUrl(nextImage.url)
          }
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
    <div className="min-h-[calc(100vh-5rem)] bg-card rounded-lg shadow-sm border p-4 sm:p-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="mb-6 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Image Section */}
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
              {!imageError && imageUrl && (
                <img 
                  src={imageUrl} 
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}
              {(!imageUrl || !imageLoaded || imageError) && (
                <Package className="w-20 h-20 text-muted-foreground" />
              )}
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const prev = (currentIndex - 1 + images.length) % images.length
                      setCurrentIndex(prev)
                      setImageUrl(images[prev].url)
                    }}
                    className="absolute left-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const next = (currentIndex + 1) % images.length
                      setCurrentIndex(next)
                      setImageUrl(images[next].url)
                    }}
                    className="absolute right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentIndex(idx)
                          setImageUrl(images[idx].url)
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{product.name}</h1>
            <Badge className={`${getStatusColor(product.status)} text-white`}>
              {getStatusText(product.status)}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Item #</span>
              <span className="font-medium">{product.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-medium">{product.brand}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{product.itemType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{product.location}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">In Stock</span>
              <span className="font-semibold text-lg">{product.balance}</span>
            </div>
          </div>

          {/* Quantity Selection */}
          {product.status !== "out-of-stock" && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>

                    <span className="text-xl font-semibold w-12 text-center">{quantity}</span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.balance}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Max: {product.balance}</p>
              </CardContent>
            </Card>
          )}

          {/* Add to Cart Button */}
          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={product.status === "out-of-stock"}
            className="w-full"
          >
            {product.status === "out-of-stock" ? "Out of Stock" : `Add ${quantity} to Cart`}
          </Button>

          {product.status === "out-of-stock" && (
            <p className="text-sm text-destructive text-center">This item is currently unavailable</p>
          )}
        </div>
      </div>
    </div>
  )
}
