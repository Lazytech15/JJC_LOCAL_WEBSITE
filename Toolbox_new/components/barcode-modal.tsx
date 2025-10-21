"use client"

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface BarcodeModalProps {
  open: boolean
  initialValue?: string
  onClose: () => void
  onConfirm: (barcode: string, quantity?: number) => void
}

export default function BarcodeModal({ open, initialValue = '', onClose, onConfirm }: BarcodeModalProps) {
  const [barcode, setBarcode] = useState(initialValue)
  const [quantity, setQuantity] = useState<number>(1)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setBarcode(initialValue)
    if (open) {
      // focus the hidden input so further keys are captured reliably
      setTimeout(() => hiddenInputRef.current?.focus(), 50)
    }
  }, [open, initialValue])

  const handleConfirm = () => {
    onConfirm(barcode.trim(), quantity)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Barcode Scan Detected</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-2">
          <label className="text-sm">Scanned Barcode</label>
          <Input ref={hiddenInputRef as any} value={barcode} onChange={(e: any) => setBarcode(e.target.value)} className="font-mono text-lg" />

          <label className="text-sm">Quantity</label>
          <Input type="number" value={quantity} onChange={(e: any) => setQuantity(Number(e.target.value || 1))} className="w-32" />

          <div className="text-sm text-muted-foreground">Confirm the scanned item and quantity, then add to cart or inventory.</div>
        </div>

        <DialogFooter>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm}>Add to Cart</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
