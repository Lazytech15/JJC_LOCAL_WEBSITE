/**
 * Cart Persistence & Memory System
 * Enables employees to maintain cart state across browser sessions
 */

import type { Product } from './barcode-scanner'

export interface CartItem {
  id: string
  product: Product
  quantity: number
  addedAt: Date
  notes?: string | undefined
}

export interface CartState {
  items: CartItem[]
  totalItems: number
  totalValue: number
  lastUpdated: Date
  sessionId: string
  employeeId?: string
  location?: string
}

export interface CartMetadata {
  version: string
  createdAt: Date
  lastAccessedAt: Date
  deviceInfo: {
    userAgent: string
    platform: string
  }
}

const CART_STORAGE_KEY = 'toolbox_cart_v2'
const CART_METADATA_KEY = 'toolbox_cart_metadata_v2'
const CART_HISTORY_KEY = 'toolbox_cart_history_v2'
const MAX_CART_HISTORY = 10
const CART_EXPIRY_DAYS = 30

/**
 * Generate unique session ID for tracking cart sessions
 */
function generateSessionId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get device information for cart metadata
 */
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform
  }
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Calculate total value of cart items
 */
function calculateTotalValue(items: CartItem[]): number {
  // Note: Product interface doesn't have price field yet
  // For now, return 0 - can be extended when pricing is added
  return items.reduce((total, item) => {
    // Future: calculate actual price when Product interface includes price
    return total + (0 * item.quantity)
  }, 0)
}

/**
 * Save cart state to localStorage with metadata
 */
export function saveCartState(cartState: Partial<CartState>): boolean {
  if (!isStorageAvailable()) {
    console.warn('Cart persistence: localStorage not available')
    return false
  }

  try {
    const currentState = loadCartState()
    const sessionId = currentState?.sessionId || generateSessionId()
    
    const updatedState: CartState = {
      items: [],
      totalItems: 0,
      totalValue: 0,
      lastUpdated: new Date(),
      sessionId,
      ...currentState,
      ...cartState
    }

    // Recalculate totals
    updatedState.totalItems = updatedState.items.reduce((sum, item) => sum + item.quantity, 0)
    updatedState.totalValue = calculateTotalValue(updatedState.items)
    updatedState.lastUpdated = new Date()

    const metadata: CartMetadata = {
      version: '2.0',
      createdAt: currentState?.sessionId === sessionId ? 
        (loadCartMetadata()?.createdAt || new Date()) : 
        new Date(),
      lastAccessedAt: new Date(),
      deviceInfo: getDeviceInfo()
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedState))
    localStorage.setItem(CART_METADATA_KEY, JSON.stringify(metadata))
    
    // Save to history for recovery
    saveCartToHistory(updatedState)
    
    return true
  } catch (error) {
    console.error('Cart persistence: Failed to save cart state', error)
    return false
  }
}

/**
 * Load cart state from localStorage
 */
export function loadCartState(): CartState | null {
  if (!isStorageAvailable()) {
    return null
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return null

    const cartState: CartState = JSON.parse(stored)
    
    // Check if cart has expired
    const lastUpdated = new Date(cartState.lastUpdated)
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceUpdate > CART_EXPIRY_DAYS) {
      clearCartState()
      return null
    }

    // Convert date strings back to Date objects
    cartState.lastUpdated = new Date(cartState.lastUpdated)
    cartState.items = cartState.items.map(item => ({
      ...item,
      addedAt: new Date(item.addedAt)
    }))

    // Update last accessed time
    const metadata = loadCartMetadata()
    if (metadata) {
      metadata.lastAccessedAt = new Date()
      localStorage.setItem(CART_METADATA_KEY, JSON.stringify(metadata))
    }

    return cartState
  } catch (error) {
    console.error('Cart persistence: Failed to load cart state', error)
    return null
  }
}

/**
 * Load cart metadata
 */
export function loadCartMetadata(): CartMetadata | null {
  if (!isStorageAvailable()) return null

  try {
    const stored = localStorage.getItem(CART_METADATA_KEY)
    if (!stored) return null

    const metadata: CartMetadata = JSON.parse(stored)
    metadata.createdAt = new Date(metadata.createdAt)
    metadata.lastAccessedAt = new Date(metadata.lastAccessedAt)
    
    return metadata
  } catch (error) {
    console.error('Cart persistence: Failed to load metadata', error)
    return null
  }
}

/**
 * Check if a product is available for adding to cart
 */
export function isProductAvailable(product: Product | null | undefined, requestedQty: number = 1): { available: boolean; reason?: string; maxAvailable?: number } {
  if (!product) return { available: false, reason: 'Product not found' }
  
  // Check status - any status containing "out" is unavailable
  const status = (product.status || '').toString().toLowerCase()
  if (status.includes('out')) {
    return { available: false, reason: 'Item is out of stock', maxAvailable: 0 }
  }
  
  // Check balance
  if (typeof product.balance === 'number') {
    if (product.balance <= 0) {
      return { available: false, reason: 'Item has no available balance', maxAvailable: 0 }
    }
    if (requestedQty > product.balance) {
      return { available: false, reason: `Only ${product.balance} available`, maxAvailable: product.balance }
    }
  }
  
  return { available: true }
}

/**
 * Add item to persistent cart
 */
export function addToCart(product: Product, quantity: number = 1, notes?: string): { success: boolean; error?: string } {
  // Validate product availability first
  const availabilityCheck = isProductAvailable(product, quantity)
  if (!availabilityCheck.available) {
    console.warn(`[cart-persistence] Cannot add ${product?.name}: ${availabilityCheck.reason}`)
    return { success: false, error: availabilityCheck.reason }
  }
  
  const currentState = loadCartState() || {
    items: [],
    totalItems: 0,
    totalValue: 0,
    lastUpdated: new Date(),
    sessionId: generateSessionId()
  }

  // Check if item already exists
  const existingItemIndex = currentState.items.findIndex(item => item.id === product.id)
  
  if (existingItemIndex >= 0) {
    // Update existing item - but check if new total would exceed balance
    const existingItem = currentState.items[existingItemIndex]
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      // Check if new total exceeds available balance
      if (typeof product.balance === 'number' && newQuantity > product.balance) {
        const canAdd = Math.max(0, product.balance - existingItem.quantity)
        if (canAdd <= 0) {
          return { success: false, error: `Cannot add more - already have maximum (${product.balance}) in cart` }
        }
        // Add only what's available
        existingItem.quantity += canAdd
        existingItem.notes = notes !== undefined ? notes : existingItem.notes
        saveCartState(currentState)
        return { success: true, error: `Only ${canAdd} added (reached max balance of ${product.balance})` }
      }
      existingItem.quantity = newQuantity
      existingItem.notes = notes !== undefined ? notes : existingItem.notes
    }
  } else {
    // Add new item
    const cartItem: CartItem = {
      id: product.id,
      product,
      quantity,
      addedAt: new Date(),
      ...(notes !== undefined && { notes })
    }
    currentState.items.push(cartItem)
  }

  const saved = saveCartState(currentState)
  return { success: saved, error: saved ? undefined : 'Failed to save cart' }
}

/**
 * Remove item from persistent cart
 */
export function removeFromCart(productId: string): boolean {
  const currentState = loadCartState()
  if (!currentState) return false

  currentState.items = currentState.items.filter(item => item.id !== productId)
  return saveCartState(currentState)
}

/**
 * Update item quantity in persistent cart
 */
export function updateCartItemQuantity(productId: string, quantity: number): boolean {
  const currentState = loadCartState()
  if (!currentState) return false

  const itemIndex = currentState.items.findIndex(item => item.id === productId)
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      return removeFromCart(productId)
    }
    const item = currentState.items[itemIndex]
    if (item) {
      item.quantity = quantity
      return saveCartState(currentState)
    }
  }

  return false
}

/**
 * Clear cart state
 */
export function clearCartState(): boolean {
  if (!isStorageAvailable()) return false

  try {
    localStorage.removeItem(CART_STORAGE_KEY)
    localStorage.removeItem(CART_METADATA_KEY)
    return true
  } catch (error) {
    console.error('Cart persistence: Failed to clear cart', error)
    return false
  }
}

/**
 * Save cart to history for recovery
 */
function saveCartToHistory(cartState: CartState): void {
  if (!isStorageAvailable()) return

  try {
    const historyRaw = localStorage.getItem(CART_HISTORY_KEY)
    const history: CartState[] = historyRaw ? JSON.parse(historyRaw) : []
    
    // Add current state to history
    history.unshift({
      ...cartState,
      sessionId: `history_${cartState.sessionId}_${Date.now()}`
    })
    
    // Keep only last MAX_CART_HISTORY entries
    const trimmedHistory = history.slice(0, MAX_CART_HISTORY)
    
    localStorage.setItem(CART_HISTORY_KEY, JSON.stringify(trimmedHistory))
  } catch (error) {
    console.error('Cart persistence: Failed to save to history', error)
  }
}

/**
 * Get cart history for recovery
 */
export function getCartHistory(): CartState[] {
  if (!isStorageAvailable()) return []

  try {
    const historyRaw = localStorage.getItem(CART_HISTORY_KEY)
    if (!historyRaw) return []

    const history: CartState[] = JSON.parse(historyRaw)
    return history.map(state => ({
      ...state,
      lastUpdated: new Date(state.lastUpdated),
      items: state.items.map(item => ({
        ...item,
        addedAt: new Date(item.addedAt)
      }))
    }))
  } catch (error) {
    console.error('Cart persistence: Failed to load history', error)
    return []
  }
}

/**
 * Restore cart from history
 */
export function restoreCartFromHistory(sessionId: string): boolean {
  const history = getCartHistory()
  const targetState = history.find(state => state.sessionId === sessionId)
  
  if (!targetState) return false
  
  // Generate new session ID for restored cart
  const restoredState: CartState = {
    ...targetState,
    sessionId: generateSessionId(),
    lastUpdated: new Date()
  }
  
  return saveCartState(restoredState)
}

/**
 * Export cart data for backup
 */
export function exportCartData(): string {
  const cartState = loadCartState()
  const metadata = loadCartMetadata()
  const history = getCartHistory()
  
  return JSON.stringify({
    current: cartState,
    metadata,
    history,
    exportedAt: new Date(),
    version: '2.0'
  }, null, 2)
}

/**
 * Import cart data from backup
 */
export function importCartData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)
    
    if (data.current) {
      return saveCartState(data.current)
    }
    
    return false
  } catch (error) {
    console.error('Cart persistence: Failed to import cart data', error)
    return false
  }
}