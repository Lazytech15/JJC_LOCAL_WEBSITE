"use client"

import { useState, useEffect } from "react"
import { Minus, Plus, Trash2, History, Package, ShoppingCart } from "lucide-react"
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
    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
        <Package className="w-6 h-6 text-muted-foreground" />
      )}
    </div>
  )
}

interface CartViewProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onReturnToBrowsing?: () => void
  onRefreshData?: (() => void) | undefined
}

export function CartView({ items, onUpdateQuantity, onRemoveItem, onReturnToBrowsing, onRefreshData }: CartViewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState("name-asc")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [showSuccessCountdown, setShowSuccessCountdown] = useState(false) // Added success countdown state
  const [checkoutData, setCheckoutData] = useState<{ userId: string; totalItems: number } | null>(null) // Store checkout data for countdown
  const { toast } = useToast()

  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      default:
        return 0
    }
  })

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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-background min-h-[calc(100dvh-4rem)]">
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-foreground" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Cart</h1>
            <p className="text-xs text-muted-foreground">{items.length} items</p>
          </div>
          <CartStatusIndicator />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <CartRecoveryPanel 
            trigger={
              <Button variant="ghost" size="sm" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
            }
          />
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {sortedItems.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Add items from the dashboard to get started</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                {/* Desktop Layout */}
                <div className="hidden md:flex items-center gap-4">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                  />

                  <CartItemImage itemId={item.id} itemName={item.name} />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.brand} • {item.itemType}</p>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  </div>

                  <Badge variant="outline" className="shrink-0">
                    {item.balance} in stock
                  </Badge>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
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
                      className="w-12 text-center text-sm font-medium bg-transparent border rounded h-8"
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
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
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      className="mt-1"
                    />
                    
                    <CartItemImage itemId={item.id} itemName={item.name} />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{item.brand} • {item.itemType}</p>
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

                  <div className="flex items-center justify-between pl-[68px]">
                    <span className="text-xs text-muted-foreground">{item.balance} in stock</span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
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
                        className="w-10 text-center text-sm font-medium bg-transparent border rounded h-7"
                      />

                      <Button
                        variant="outline"
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
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                <span className="text-sm text-muted-foreground">
                  All ({selectedItems.size})
                </span>

                {selectedItems.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-destructive hover:text-destructive"
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
                  className="bg-primary hover:bg-primary/90"
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
          </CardContent>
        </Card>
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
