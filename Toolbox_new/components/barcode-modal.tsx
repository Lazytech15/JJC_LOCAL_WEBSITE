"use client"

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import type { Product } from '../lib/barcode-scanner'
import { apiService } from '../lib/api_service'

interface BulkLineItem {
  product: Product
  quantity: number
}

interface BarcodeModalProps {
  open: boolean
  initialValue?: string
  products?: Product[] // optional list when multiple matches are available
  onClose: () => void
  // onConfirm accepts either single barcode payload or bulk items payload
  onConfirm: (payload: { barcode?: string; quantity?: number } | { items: BulkLineItem[] }) => void
}

export default function BarcodeModal({ open, initialValue = '', products = [], onClose, onConfirm }: BarcodeModalProps) {
  const [barcode, setBarcode] = useState(initialValue)
  const [quantity, setQuantity] = useState<number>(1)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)

  // Multi-line items state when products prop supplied
  const [lineItems, setLineItems] = useState<BulkLineItem[]>([])

  // Helper: determine if a product is available for adding
  const isAvailable = (p?: Product | null, qty = 1) => {
    if (!p) return false
    const status = (p.status || '').toString().toLowerCase()
    if (status.includes('out')) return false
    if (typeof p.balance === 'number') {
      if (p.balance <= 0) return false
      if (qty && p.balance < qty) return false
    }
    return true
  }

  useEffect(() => {
    setBarcode(initialValue)
    if (open) {
      // focus the hidden input so further keys are captured reliably
      setTimeout(() => hiddenInputRef.current?.focus(), 50)
    }
  }, [open, initialValue])

  useEffect(() => {
    // initialize line items when products change
    // If modal already has queued items (from continuous scanning), don't overwrite them.
    setLineItems(prev => {
      if (prev && prev.length > 0) {
        // If previously queued, only append any new products that are not already present and available
        if (!products || products.length === 0) return prev
        const next = [...prev]
        products.forEach(p => {
          if (!isAvailable(p)) return
          const exists = next.find(x => String(x.product.id) === String(p.id))
          if (!exists) next.push({ product: p, quantity: 1 })
        })
        return next
      }

      // No previous queued items - initialize from products prop if provided (only available ones)
      if (products && products.length > 0) {
        return products.filter(p => isAvailable(p)).map(p => ({ product: p, quantity: 1 }))
      }

      return []
    })
  }, [products])

  // Listen for append events so continuous scanning can add items while modal is open
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {}
        const li = detail.item
        if (!li || !li.product) return

        const p = li.product as Product
        // Skip queuing if out-of-stock or zero/negative balance
        if (p.status === 'out-of-stock' || (typeof p.balance === 'number' && p.balance <= 0)) {
          // No toast available in this component; log for now. Parent will also surface a toast when applicable.
          console.warn(`[barcode-modal] Skipped queuing out-of-stock item: ${p.name}`)
          return
        }

        setLineItems(prev => {
          // if product already exists in list, increment quantity
          const idx = prev.findIndex(x => String(x.product.id) === String(p.id))
          if (idx !== -1) {
            const next = [...prev]
            const existing = next[idx]
            if (!existing) return prev
            next[idx] = { product: existing.product, quantity: Math.max(0, existing.quantity + (li.quantity || 1)) }
            return next
          }
          return [...prev, { product: p, quantity: li.quantity || 1 }]
        })
      } catch (err) {
        console.error('barcode-modal append handler error', err)
      }
    }

    window.addEventListener('scanned-barcode-append', handler as EventListener)
    return () => window.removeEventListener('scanned-barcode-append', handler as EventListener)
  }, [])

  // Listen for clear queue events (e.g., after checkout)
  useEffect(() => {
    const handler = () => {
      setLineItems([])
    }

    window.addEventListener('clear-barcode-queue', handler as EventListener)
    return () => window.removeEventListener('clear-barcode-queue', handler as EventListener)
  }, [])

  const handleConfirmSingle = () => {
    onConfirm({ barcode: barcode.trim(), quantity })
    onClose()
  }

  const handleConfirmBulk = () => {
    // filter out zero quantities
    const items = lineItems.filter(li => li.quantity > 0)
    if (items.length === 0) {
      // nothing to add
      onClose()
      return
    }
    onConfirm({ items })
    onClose()
  }

  const handleClearQueue = () => {
    setLineItems([])
  }

  const updateLineQuantity = (index: number, qty: number) => {
    setLineItems(prev => {
      const next = [...prev]
      const existing = next[index]
      if (!existing) return prev
      next[index] = { product: existing.product, quantity: qty }
      return next
    })
  }

  // helper to get item image url (same approach as cart)
  function ItemImage({ item }: { item: Product }) {
    const [url, setUrl] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [err, setErr] = useState(false)

    useEffect(() => {
      setErr(false)
      setLoaded(false)
      if (!item || !item.id) {
        setUrl(null)
        return
      }
      const numericId = parseInt(String(item.id), 10)
      if (isNaN(numericId)) {
        setUrl(null)
        return
      }
      const u = apiService.getItemLatestImageUrl(numericId)
      setUrl(`${u}?t=${Date.now()}`)
    }, [item])

    return (
      <div className="w-14 h-14 bg-slate-900/50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-700 relative">
        {!err && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.name} className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} onError={() => setErr(true)} />
        )}
        {(!url || err) && (
          <div className="text-slate-400">No Img</div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      {/* Enlarged modal: wider and taller with scrollable content area */}
      <DialogContent className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Barcode Scan Detected</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {lineItems && lineItems.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select quantities for the items to add to cart</p>
              <div className="grid gap-3">
                {lineItems.map((li, idx) => (
                  <div key={`${li.product.id}-${idx}`} className="flex items-center space-x-3 p-3 border rounded-md">
                    <ItemImage item={li.product} />
                    <div className="flex-1">
                      <div className="font-medium">{li.product.name}</div>
                      <div className="text-xs text-muted-foreground">{li.product.brand} • {li.product.itemType}</div>
                      <div className="text-xs text-muted-foreground">ID: {li.product.id} • Status: {li.product.status}</div>
                    </div>
                    <div className="w-32">
                      <label className="text-xs">Quantity</label>
                      <Input type="number" min={0} value={li.quantity} onChange={(e: any) => updateLineQuantity(idx, Number(e.target.value || 0))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm">Scanned Barcode</label>
              <Input ref={hiddenInputRef as any} value={barcode} onChange={(e: any) => setBarcode(e.target.value)} className="font-mono text-lg" />

              <label className="text-sm">Quantity</label>
              <Input type="number" value={quantity} onChange={(e: any) => setQuantity(Number(e.target.value || 1))} className="w-32" />

              <div className="text-sm text-muted-foreground">Confirm the scanned item and quantity, then add to cart or inventory.</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={handleClearQueue} disabled={!lineItems || lineItems.length === 0}>Clear Queue</Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
            <div>
              {lineItems && lineItems.length > 0 ? (
                <Button onClick={handleConfirmBulk}>Add All to Cart</Button>
              ) : (
                <Button onClick={handleConfirmSingle}>Add to Cart</Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
