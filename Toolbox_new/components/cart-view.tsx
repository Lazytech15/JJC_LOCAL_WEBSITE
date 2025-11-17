"use client"

import { useState, useEffect } from "react"
import { Minus, Plus, Trash2, History, Package, Briefcase, Cog, Wrench } from "lucide-react"
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

// Image component with error handling - Industrial styled
function CartItemImage({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  // Fetch image URL from API - same approach as dashboard
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
    
    // Use latest image URL from apiService (same as dashboard/EnhancedItemCard)
    const url = apiService.getItemLatestImageUrl(numericItemId)
    setImageUrl(`${url}?t=${Date.now()}`)
  }, [itemId])

  return (
    <div className="w-16 h-16 bg-slate-900/50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-700 relative">
      {/* Corner bolts */}
      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-slate-500 rounded-full"></div>
      <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-slate-500 rounded-full"></div>
      <div className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-slate-500 rounded-full"></div>
      <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-slate-500 rounded-full"></div>
      
      {!imageError && imageUrl && (
        <img 
          src={imageUrl} 
          alt={itemName}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {(!imageUrl || !imageLoaded || imageError) && (
        <Package className="w-8 h-8 text-slate-400" />
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
      {/* Industrial Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-700 relative">
        {/* Decorative accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-3">
            {/* Industrial toolbox icon */}
            <div className="relative">
              <div className="absolute -inset-0.5 border border-slate-600 rounded"></div>
              <div className="relative bg-slate-800 p-2 rounded border border-slate-600">
                <Briefcase className="w-6 h-6 text-slate-300" />
                {/* Corner bolts */}
                <div className="absolute top-0 left-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                <div className="absolute top-0 right-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-1 h-1 bg-slate-500 rounded-full"></div>
                <div className="absolute bottom-0 right-0 w-1 h-1 bg-slate-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-slate-200 via-slate-100 to-slate-300">
                CART
              </h1>
              <div className="text-xs text-slate-500 font-mono">Work Order Items</div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-600">
            <Cog className="w-3 h-3 mr-1" />
            {items.length} items
          </Badge>
          <CartStatusIndicator />
        </div>

        <div className="flex items-center gap-2">
          <CartRecoveryPanel 
            trigger={
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-slate-600 hover:bg-slate-800">
                <History className="w-4 h-4" />
                Memory
              </Button>
            }
          />
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cart Items - Industrial Style */}
      <div className="space-y-4 mb-6">
        {sortedItems.length === 0 ? (
          <Card className="border-2 border-slate-700 bg-slate-900/30">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Wrench className="w-16 h-16 text-slate-600" />
                  <div className="absolute -bottom-2 -right-2">
                    <Cog className="w-8 h-8 text-slate-600 animate-spin-slow" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-lg font-semibold">Your cart is empty</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Add items from the dashboard to get started
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-2 border-slate-700 bg-card/50 backdrop-blur-sm hover:border-slate-600">
              <CardContent className="p-4 relative">
                {/* Industrial corner accents */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-slate-600"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-slate-600"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-slate-600"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-slate-600"></div>
                
                <div className="flex items-center space-x-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    className="border-slate-600"
                  />

                  {/* Image */}
                  <CartItemImage itemId={item.id} itemName={item.name} />

                  {/* Item Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Brand: {item.brand}</p>
                      <p>Item Type: {item.itemType}</p>
                      <p>Location: {item.location}</p>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground mb-1">
                      BAL: {item.balance.toString().padStart(2, "0")}
                    </div>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>

                  {/* Quantity Controls with direct numeric input */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>

                    {/* Direct entry input */}
                    <input
                      aria-label={`Quantity for ${item.name}`}
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(e) => {
                        // Real-time sanitization: remove non-digits and clamp to integer
                        const raw = e.target.value
                        // Allow empty string while typing, but treat as 0 for parsing
                        const numeric = raw === '' ? '' : raw.replace(/[^0-9]/g, '')
                        // If emptied, update to '' locally via onUpdateQuantity? Keep UI controlled by parent value
                        // Parse to integer and apply bounds
                        if (numeric === '') {
                          // do not call onUpdateQuantity with empty; let blur handler correct if needed
                          // but for responsiveness, set to 1 immediately
                          onUpdateQuantity(item.id, 1)
                          return
                        }

                        const parsed = parseInt(numeric, 10)
                        if (isNaN(parsed)) {
                          onUpdateQuantity(item.id, 1)
                          return
                        }

                        const clamped = Math.max(1, Math.min(parsed, item.balance))
                        if (clamped !== item.quantity) {
                          onUpdateQuantity(item.id, clamped)
                        }
                      }}
                      onBlur={(e) => {
                        // Ensure value is at least 1 on blur
                        const raw = e.target.value
                        const parsed = parseInt(String(raw).replace(/[^0-9]/g, ''), 10)
                        const finalVal = isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, item.balance)
                        if (finalVal !== item.quantity) {
                          onUpdateQuantity(item.id, finalVal)
                        }
                      }}
                      className="w-16 text-center font-medium text-foreground bg-transparent border border-slate-700 rounded px-2 py-1"
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.balance}
                      className="w-8 h-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Bulk Actions */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                  <span className="text-sm dark:text-slate-300">Select all ({selectedItems.size})</span>
                </div>

                {selectedItems.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>

              {/* Summary and Checkout */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Items</p>
                  <p className="text-lg font-bold dark:text-slate-100">({totalItems})</p>
                </div>

                <Button
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                  onClick={handleCheckout}
                  disabled={isCommitting}
                >
                  {isCommitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Proceed to checkout"
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
