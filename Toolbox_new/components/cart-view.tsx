"use client"

import { useState, useEffect, useMemo } from "react"
import { Minus, Plus, Trash2, History, Package, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Checkbox } from "../components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { CheckoutModal } from "./checkout-modal"
import { CheckoutSuccessCountdown } from "./checkout-success-countdown"
import { CartRecoveryPanel, CartStatusIndicator } from "./cart-recovery-panel"
import { apiService } from "../lib/api_service"
import { useToast } from "../hooks/use-toast"
import type { CartItem } from "../app/page"
import type { Employee } from "../lib/Services/employees.service"

// Extended CartItem type with addedAt timestamp
interface CartItemWithTimestamp extends CartItem {
  addedAt?: number
}

// Clean image component
function CartItemImage({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
    
    if (!itemId) {
      setImageUrl(null)
      return
    }
    
    const numericItemId = typeof itemId === 'number' ? itemId : parseInt(itemId, 10)
    if (isNaN(numericItemId)) {
      setImageUrl(null)
      return
    }
    
    const url = apiService.getItemLatestImageUrl(numericItemId)
    setImageUrl(`${url}?t=${Date.now()}`)
  }, [itemId])

  return (
    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
      {!imageError && imageUrl && (
        <img 
          src={imageUrl} 
          alt={itemName}
          className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {(!imageUrl || !imageLoaded || imageError) && (
        <Package className="w-5 h-5 text-slate-500" />
      )}
    </div>
  )
}

interface CartViewProps {
  items: CartItemWithTimestamp[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onReturnToBrowsing?: () => void
  onRefreshData?: (() => void) | undefined
}

export function CartView({ items, onUpdateQuantity, onRemoveItem, onReturnToBrowsing, onRefreshData }: CartViewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState("recent") // Default to recently added
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [showSuccessCountdown, setShowSuccessCountdown] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ userId: string; totalItems: number } | null>(null)
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // Sort items based on selection
  const sortedItems = useMemo(() => {
    const itemsCopy = [...items]
    switch (sortBy) {
      case "recent":
        // Sort by addedAt timestamp (most recent first), fallback to original order
        return itemsCopy.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      case "name-asc":
        return itemsCopy.sort((a, b) => a.name.localeCompare(b.name))
      case "name-desc":
        return itemsCopy.sort((a, b) => b.name.localeCompare(a.name))
      case "qty-high":
        return itemsCopy.sort((a, b) => b.quantity - a.quantity)
      case "qty-low":
        return itemsCopy.sort((a, b) => a.quantity - b.quantity)
      default:
        return itemsCopy
    }
  }, [items, sortBy])

  // Group items by brand
  const groupedByBrand = useMemo(() => {
    const groups: Record<string, CartItemWithTimestamp[]> = {}
    sortedItems.forEach(item => {
      const brand = item.brand || 'Unknown Brand'
      if (!groups[brand]) groups[brand] = []
      groups[brand].push(item)
    })
    // Sort brand names alphabetically
    const sortedBrands = Object.keys(groups).sort((a, b) => a.localeCompare(b))
    return sortedBrands.map(brand => ({ brand, items: groups[brand] }))
  }, [sortedItems])

  const toggleBrandCollapse = (brand: string) => {
    setCollapsedBrands(prev => {
      const newSet = new Set(prev)
      if (newSet.has(brand)) newSet.delete(brand)
      else newSet.add(brand)
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map((item) => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = () => {
    selectedItems.forEach((id) => onRemoveItem(id))
    setSelectedItems(new Set())
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const allSelected = items.length > 0 && selectedItems.size === items.length

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Your cart is empty. Add items to proceed with checkout.",
        variant: "destructive",
        toastType: 'warning',
        duration: 3000
      } as any)
      return
    }
    setIsCheckoutOpen(true)
  }

  const handleConfirmCheckout = async (employee: Employee, purpose?: string) => {
    setIsCommitting(true)

    try {
      console.log("[v0] Starting checkout process...")

      // Trust the API/database to calculate balance and item_status after checkout
      // Only send the necessary data: item_no, quantity, and item_name
      const itemUpdates = items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        // Include these for logging purposes only (not used by API)
        brand: item.brand,
        itemType: item.itemType,
        location: item.location,
        balance: item.balance, // Current balance for transaction logging
      }))

      console.log("[v0] Item updates prepared:", itemUpdates)

      const apiConfig = apiService.getConfig()
      if (apiConfig.isConnected) {
        try {
          await apiService.commitItemChanges(itemUpdates)
          console.log("[v0] Successfully committed changes to API")

          // Try to log the transaction for audit trail with complete details
          try {
            const enhancedItems = items.map(item => ({
              id: item.id,
              name: item.name,
              brand: item.brand || 'N/A',
              itemType: item.itemType || 'N/A',
              location: item.location || 'N/A',
              quantity: item.quantity,
              originalBalance: item.balance,
              newBalance: Math.max(0, item.balance - item.quantity)
            }))

            // Create concise details format (max 255 chars for database)
            let detailsText = `Checkout: ${totalItems} items - `
            
            if (enhancedItems.length <= 2) {
              // Very short list: show full details
              detailsText += enhancedItems.map(item => 
                `${item.name} x${item.quantity} (${item.brand})`
              ).join(', ')
            } else if (enhancedItems.length <= 4) {
              // Short list: show names and quantities only
              detailsText += enhancedItems.map(item => 
                `${item.name} x${item.quantity}`
              ).join(', ')
            } else {
              // Long list: show count by item name only
              const itemSummary = enhancedItems.reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity
                return acc
              }, {} as Record<string, number>)
              
              detailsText += Object.entries(itemSummary)
                .map(([item, qty]) => `${item} x${qty}`)
                .join(', ')
            }

            // Ensure details fit in 255 characters
            if (detailsText.length > 255) {
              detailsText = detailsText.substring(0, 252) + '...'
            }

            // Collect item numbers with separators
            let itemNumbers = items.map(item => item.id).join(';')
            
            // Limit item_no to 255 characters to prevent database truncation errors
            if (itemNumbers.length > 255) {
              // Take as many complete item IDs as possible, leaving room for "..."
              const maxLength = 252 // Leave room for "..."
              const itemIds = items.map(item => item.id)
              let truncatedIds = []
              let currentLength = 0
              
              for (const id of itemIds) {
                const separatorLength = truncatedIds.length > 0 ? 1 : 0 // ';' separator
                if (currentLength + id.length + separatorLength <= maxLength) {
                  truncatedIds.push(id)
                  currentLength += id.length + separatorLength
                } else {
                  break
                }
              }
              
              itemNumbers = truncatedIds.join(';') + (truncatedIds.length < itemIds.length ? '...' : '')
            }

            // NEW: Build structured items JSON for accurate parsing
            const structuredItems = enhancedItems.map(item => ({
              item_no: item.id,
              item_name: item.name,
              brand: item.brand,
              item_type: item.itemType,
              location: item.location,
              quantity: item.quantity,
              unit_of_measure: 'pcs', // Default unit, can be customized per item
              balance_before: item.originalBalance,
              balance_after: item.newBalance
            }))

            const transactionData: any = {
              username: employee.fullName,
              details: detailsText,
              id_number: employee.idNumber,
              id_barcode: employee.idBarcode,
              item_no: itemNumbers,
              items_json: JSON.stringify(structuredItems) // NEW: Structured data
              // log_date and log_time are now set by the server using NOW() for accuracy
            }

            // Only include purpose if provided
            if (purpose && purpose.trim()) {
              transactionData.purpose = purpose.trim()
            }

            await apiService.logTransaction(transactionData)
            console.log("[v0] Successfully logged enhanced transaction details")
          } catch (transactionError) {
            console.log("[v0] Transaction logging failed (non-critical):", transactionError)
          }

          toast({
            title: "Checkout Successful! ✅",
            description: `${totalItems} items processed. API updated successfully.`,
            toastType: 'success',
            duration: 4000
          } as any)

          // Trigger data refresh to update inventory
          if (onRefreshData) {
            console.log("[v0] Triggering inventory data refresh...")
            onRefreshData()
          }
        } catch (apiError) {
          console.error("[v0] API commit failed:", apiError)

          // Show specific error message based on the error
          const errorMessage = apiError instanceof Error && apiError.message.includes("API might not support inventory updates")
            ? "API endpoints for inventory updates are not available yet. Items removed from cart locally."
            : "API commit failed, but checkout logged locally."

          toast({
            title: "Checkout Completed (Local Only) ⚠️",
            description: `${errorMessage} User: ${employee.id.toString()}`,
            variant: "default",
            toastType: 'warning',
            duration: 5000
          } as any)

          // Still trigger refresh in case API has some data
          if (onRefreshData) {
            console.log("[v0] Triggering inventory data refresh...")
            onRefreshData()
          }
        }
      } else {
        console.log("[v0] API not connected, logging checkout locally only")

        toast({
          title: "Checkout Completed (Local Only) 📝",
          description: `API not connected. User: ${employee.id.toString()}, Total: ${totalItems} items`,
          toastType: 'info',
          duration: 4000
        } as any)
      }

      const checkoutSummary = {
        userId: employee.id.toString(),
        totalItems: totalItems,
        itemCount: items.length,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          brand: item.brand,
          originalBalance: item.balance,
          newBalance: Math.max(0, item.balance - item.quantity),
        })),
        timestamp: new Date().toISOString(),
        apiCommitted: apiConfig.isConnected,
        itemUpdates: itemUpdates,
      }

      console.log("[v0] Checkout completed:", checkoutSummary)

      setIsCheckoutOpen(false)

      setCheckoutData({ userId: employee.id.toString(), totalItems })
      setShowSuccessCountdown(true)
    } catch (error) {
      console.error("[v0] Checkout process failed:", error)

      toast({
        title: "Checkout Failed",
        description: "An error occurred during checkout. Please try again.",
        variant: "destructive",
        toastType: 'error',
        duration: 5000
      } as any)
    } finally {
      setIsCommitting(false)
    }
  }

  const handleCountdownComplete = () => {
    setShowSuccessCountdown(false)
    setCheckoutData(null)

    // Clear cart items
    items.forEach((item) => onRemoveItem(item.id))

    // Clear the scanned barcode queue to prevent items from appearing in new processes
    window.dispatchEvent(new CustomEvent('clear-barcode-queue'))

    // Return to browsing/dashboard view
    if (onReturnToBrowsing) {
      onReturnToBrowsing()
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col bg-card rounded-lg shadow-sm border">
      {/* Header - Consistent with Dashboard */}
      <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 rounded-t-lg">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Cart</h1>
                <p className="text-xs text-muted-foreground">{items.length} unique items • {totalItems} total</p>
              </div>
              <CartStatusIndicator />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <CartRecoveryPanel 
                trigger={
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                }
              />
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="qty-high">Qty High-Low</SelectItem>
                  <SelectItem value="qty-low">Qty Low-High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Items - Grouped by Brand */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-32">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add items from the dashboard to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByBrand.map(({ brand, items: brandItems }) => {
              const isCollapsed = collapsedBrands.has(brand)
              const brandItemCount = brandItems.reduce((sum, item) => sum + item.quantity, 0)
              const allBrandItemsSelected = brandItems.every(item => selectedItems.has(item.id))
              const someBrandItemsSelected = brandItems.some(item => selectedItems.has(item.id))
              
              return (
                <div key={brand} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Brand Header */}
                  <button
                    onClick={() => toggleBrandCollapse(brand)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Toggle all items in this brand
                          const allSelected = brandItems.every(item => selectedItems.has(item.id))
                          if (allSelected) {
                            setSelectedItems(prev => {
                              const newSet = new Set(prev)
                              brandItems.forEach(item => newSet.delete(item.id))
                              return newSet
                            })
                          } else {
                            setSelectedItems(prev => {
                              const newSet = new Set(prev)
                              brandItems.forEach(item => newSet.add(item.id))
                              return newSet
                            })
                          }
                        }}
                      >
                        <Checkbox
                          checked={allBrandItemsSelected}
                          className={`h-5 w-5 border-2 ${
                            allBrandItemsSelected 
                              ? 'border-primary bg-primary data-[state=checked]:bg-primary' 
                              : someBrandItemsSelected 
                                ? 'border-primary/50 bg-primary/20' 
                                : 'border-slate-600 bg-slate-800'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{brand}</span>
                        <Badge variant="secondary" className="text-xs">
                          {brandItems.length} item{brandItems.length > 1 ? 's' : ''} • {brandItemCount} qty
                        </Badge>
                      </div>
                    </div>
                  </button>

                  {/* Brand Items */}
                  {!isCollapsed && (
                    <div className="divide-y divide-border">
                      {brandItems.map((item) => (
                        <div key={item.id} className="p-3 hover:bg-muted/20 transition-colors">
                          {/* Desktop Layout */}
                          <div className="hidden md:flex items-center gap-4">
                            <div 
                              className="relative cursor-pointer"
                              onClick={() => handleSelectItem(item.id, !selectedItems.has(item.id))}
                            >
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                className={`h-5 w-5 border-2 ${
                                  selectedItems.has(item.id) 
                                    ? 'border-primary bg-primary data-[state=checked]:bg-primary' 
                                    : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                                }`}
                              />
                            </div>

                            <CartItemImage itemId={item.id} itemName={item.name} />

                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">{item.itemType} • {item.location}</p>
                            </div>

                            <Badge variant="outline" className="shrink-0 text-xs">
                              {item.balance} in stock
                            </Badge>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-background"
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>

                              <input
                                aria-label={`Quantity for ${item.name}`}
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const parsed = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                                  const clamped = Math.max(1, Math.min(isNaN(parsed) ? 1 : parsed, item.balance))
                                  if (clamped !== item.quantity) onUpdateQuantity(item.id, clamped)
                                }}
                                className="w-12 text-center text-sm font-medium bg-background border-0 rounded h-8 focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-background"
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.balance}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveItem(item.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-3">
                            <div className="flex gap-3">
                              <div 
                                className="relative cursor-pointer mt-1"
                                onClick={() => handleSelectItem(item.id, !selectedItems.has(item.id))}
                              >
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  className={`h-5 w-5 border-2 ${
                                    selectedItems.has(item.id) 
                                      ? 'border-primary bg-primary data-[state=checked]:bg-primary' 
                                      : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                                  }`}
                                />
                              </div>
                              
                              <CartItemImage itemId={item.id} itemName={item.name} />
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">{item.name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{item.itemType}</p>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => onRemoveItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between pl-10">
                              <span className="text-xs text-muted-foreground">{item.balance} in stock</span>

                              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>

                                <input
                                  aria-label={`Quantity for ${item.name}`}
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                                    const clamped = Math.max(1, Math.min(isNaN(parsed) ? 1 : parsed, item.balance))
                                    if (clamped !== item.quantity) onUpdateQuantity(item.id, clamped)
                                  }}
                                  className="w-10 text-center text-sm font-medium bg-background border-0 rounded h-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.balance}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer - Sticky */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm p-4 sticky bottom-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="relative cursor-pointer"
                onClick={() => handleSelectAll(!allSelected)}
              >
                <Checkbox 
                  checked={allSelected} 
                  className={`h-5 w-5 border-2 ${
                    allSelected 
                      ? 'border-primary bg-primary data-[state=checked]:bg-primary' 
                      : selectedItems.size > 0 
                        ? 'border-primary/50 bg-primary/20' 
                        : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                  }`}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                All ({selectedItems.size})
              </span>

              {selectedItems.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{totalItems} items</p>
              </div>

              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 px-6"
                onClick={handleCheckout}
                disabled={isCommitting}
              >
                {isCommitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Checkout"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={items}
        onConfirmCheckout={handleConfirmCheckout}
        isCommitting={isCommitting}
      />

      <CheckoutSuccessCountdown
        isOpen={showSuccessCountdown}
        onComplete={handleCountdownComplete}
        userId={checkoutData?.userId || ""}
        totalItems={checkoutData?.totalItems || 0}
        countdownSeconds={5}
      />
    </div>
  )
}
