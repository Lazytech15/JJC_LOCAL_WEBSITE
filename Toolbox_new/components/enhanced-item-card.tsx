import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Briefcase, Eye, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { Product } from '../lib/barcode-scanner'
import { apiService } from '../lib/api_service'

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
  
  // Fetch image URL from API
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
    
    // Use latest image URL
    const url = apiService.getItemLatestImageUrl(itemId)
    setImageUrl(`${url}?t=${Date.now()}`)
  }, [product?.id])
  
  const getStockStatus = (balance: number) => {
    if (balance <= 0) return { label: 'Out of Stock', color: 'destructive', icon: AlertTriangle }
    if (balance <= 10) return { label: 'Low Stock', color: 'secondary', icon: TrendingDown }
    if (balance <= 50) return { label: 'In Stock', color: 'default', icon: Package }
    return { label: 'Well Stocked', color: 'default', icon: TrendingUp }
  }

  const stockStatus = getStockStatus(product.balance || 0)
  const StockIcon = stockStatus.icon

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border border-border hover:border-primary/50 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Image */}
            <div className="relative w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden group-hover:shadow-inner transition-all">
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

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate text-card-foreground group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                ID: {product.id} • {product.itemType || 'Uncategorized'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={stockStatus.color as any} className="text-xs flex items-center gap-1">
                  <StockIcon className="w-3 h-3" />
                  {product.balance || 0}
                </Badge>
                {product.location && (
                  <Badge variant="outline" className="text-xs">
                    {product.location}
                  </Badge>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="text-right space-y-2">
              <div className="text-sm font-medium">
                <Badge variant={product.status === 'in-stock' ? 'default' : product.status === 'low-stock' ? 'secondary' : 'destructive'}>
                  {product.status}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewItem(product)}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  disabled={product.status === 'out-of-stock'}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border border-border hover:border-primary/50 bg-card">
      <CardContent className="p-4">
        {/* Image Container */}
        <div className="relative aspect-square mb-3 bg-muted rounded-lg overflow-hidden group-hover:shadow-inner">
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
              <Package className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onViewItem(product)
              }}
              className="backdrop-blur-sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart(product)
              }}
              disabled={product.status === 'out-of-stock'}
              className="backdrop-blur-sm"
            >
              <Briefcase className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Stock Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant={stockStatus.color as any} className="text-xs flex items-center gap-1 shadow-sm">
              <StockIcon className="w-3 h-3" />
              {product.balance || 0}
            </Badge>
          </div>
        </div>

        {/* Product Details */}
        <div onClick={() => onViewItem(product)}>
          <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {product.itemType || 'Uncategorized'}
          </p>
          
          {product.location && (
            <Badge variant="outline" className="text-xs mb-2">
              {product.location}
            </Badge>
          )}
          
          <div className="flex items-center justify-between">
            <Badge variant={product.status === 'in-stock' ? 'default' : product.status === 'low-stock' ? 'secondary' : 'destructive'}>
              {product.status}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart(product)
              }}
              disabled={product.status === 'out-of-stock'}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              <Briefcase className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

EnhancedItemCard.displayName = 'EnhancedItemCard'
