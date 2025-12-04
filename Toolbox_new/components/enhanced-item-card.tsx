import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Briefcase, Eye, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { Product } from '../lib/barcode-scanner'
import { apiService } from '../lib/api_service'

// Global image cache for faster loading
const imageCache = new Map<string, string>()

interface EnhancedItemCardProps {
  product: Product
  onAddToCart: (product: Product, quantity?: number) => void
  onViewItem: (product: Product) => void
  viewMode?: 'grid' | 'list'
}

export const EnhancedItemCard = React.memo<EnhancedItemCardProps>(({ 
  product, 
  onAddToCart, 
  onViewItem, 
  viewMode = 'grid' 
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  // Fetch image URL with caching like HR Department
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

    const cacheKey = `item_${itemId}`
    
    // Check cache first
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey)!)
      setImageLoaded(true)
      return
    }
    
    // Load image individually
    const loadImage = async () => {
      try {
        const url = apiService.getItemLatestImageUrl(itemId)
        
        // Test if image exists
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        })
        
        if (response.ok) {
          // Cache the URL
          imageCache.set(cacheKey, url)
          setImageUrl(url)
          setImageLoaded(true)
        } else {
          setImageError(true)
        }
      } catch (err) {
        console.log(`[EnhancedItemCard] Error loading image for item ${itemId}:`, err)
        setImageError(true)
      }
    }
    
    loadImage()
  }, [product?.id])
  
  const getStockStatus = (balance: number) => {
    if (balance <= 0) return { label: 'Out of Stock', color: 'destructive', icon: AlertTriangle }
    if (balance <= 10) return { label: 'Low Stock', color: 'secondary', icon: TrendingDown }
    if (balance <= 50) return { label: 'In Stock', color: 'default', icon: Package }
    return { label: 'Well Stocked', color: 'default', icon: TrendingUp }
  }

  const stockStatus = getStockStatus(product.balance || 0)
  const StockIcon = stockStatus.icon

  // Helper to check if product can be added to cart
  const isAddDisabled = product.status === 'out-of-stock' || (typeof product.balance === 'number' && product.balance <= 0)

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-md transition-all duration-200 hover:scale-[1.005] border border-border hover:border-primary/50 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Image */}
            <div className="relative w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden group-hover:shadow-inner transition-all shrink-0">
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
                <Package className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate text-card-foreground group-hover:text-primary transition-colors mb-1">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {product.id} • {product.itemType || 'Uncategorized'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={stockStatus.color as any} className="text-xs py-1 px-2 h-6 flex items-center gap-1">
                  <StockIcon className="w-4 h-4" />
                  {product.balance || 0}
                </Badge>
                {product.location && (
                  <Badge variant="outline" className="text-xs py-1 px-2 h-6">
                    {product.location}
                  </Badge>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              <Badge variant={product.status === 'in-stock' ? 'default' : product.status === 'low-stock' ? 'secondary' : 'destructive'} className="text-sm py-1 px-3 h-7">
                {product.status}
              </Badge>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewItem(product)}
                  className="h-9 w-9 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  disabled={isAddDisabled}
                  className="h-9 w-9 p-0"
                >
                  <Briefcase className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.01] cursor-pointer border border-border hover:border-primary/50 bg-card">
      <CardContent className="p-2">
        {/* Image Container */}
        <div className="relative aspect-square mb-2 bg-muted rounded-md overflow-hidden group-hover:shadow-inner">
          <div className="w-full h-full flex items-center justify-center">
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
              <Package className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onViewItem(product)
              }}
              className="backdrop-blur-sm h-7 text-xs px-2"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart(product)
              }}
              disabled={isAddDisabled}
              className="backdrop-blur-sm h-7 text-xs px-2"
            >
              <Briefcase className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>

          {/* Stock Badge */}
          <div className="absolute top-1.5 right-1.5">
            <Badge variant={stockStatus.color as any} className="text-[10px] py-0 px-1.5 h-4 flex items-center gap-0.5 shadow-sm">
              <StockIcon className="w-2.5 h-2.5" />
              {product.balance || 0}
            </Badge>
          </div>
        </div>

        {/* Product Details */}
        <div onClick={() => onViewItem(product)}>
          <h3 className="font-semibold text-xs mb-0.5 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
            {product.name}
          </h3>
          
          <p className="text-[10px] text-muted-foreground mb-1 line-clamp-1 leading-tight">
            {product.itemType || 'Uncategorized'}
          </p>
          
          {product.location && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 mb-1">
              {product.location}
            </Badge>
          )}
          
          <div className="flex items-center justify-between mt-1">
            <Badge variant={product.status === 'in-stock' ? 'default' : product.status === 'low-stock' ? 'secondary' : 'destructive'} className="text-[10px] py-0 px-1.5 h-4">
              {product.status}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart(product)
              }}
              disabled={isAddDisabled}
              className="h-6 w-6 p-0"
            >
              <Briefcase className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

EnhancedItemCard.displayName = 'EnhancedItemCard'
