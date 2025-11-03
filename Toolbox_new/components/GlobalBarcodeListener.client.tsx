"use client"

import { useCallback, useState, useEffect } from 'react'
import useGlobalBarcodeScanner from '../hooks/use-global-barcode-scanner'
import BarcodeModal from './barcode-modal'

export default function GlobalBarcodeListener() {
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState('')
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  // Listen for checkout modal state changes
  useEffect(() => {
    const handleCheckoutModalChange = (event: CustomEvent) => {
      setIsCheckoutModalOpen(event.detail.isOpen)
    }

    window.addEventListener('checkout-modal-state', handleCheckoutModalChange as EventListener)
    return () => window.removeEventListener('checkout-modal-state', handleCheckoutModalChange as EventListener)
  }, [])

  const handleDetected = useCallback((value: string) => {
    // Show modal with scanned value
    setPendingValue(value)
    setModalOpen(true)
  }, [])

  // Disable global barcode scanner when checkout modal is open
  useGlobalBarcodeScanner(handleDetected, { 
    minLength: 3, 
    interKeyMs: 80, 
    maxScanDurationMs: 1200,
    enabled: !isCheckoutModalOpen 
  })

  const handleConfirm = (payload: any) => {
    // Forward whatever the modal sends (single barcode or bulk items) to global listeners
    window.dispatchEvent(new CustomEvent('scanned-barcode', { detail: payload }))
  }

  return (
    <BarcodeModal open={modalOpen} initialValue={pendingValue} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
  )
}
