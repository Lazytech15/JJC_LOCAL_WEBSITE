"use client"

import React, { useCallback, useState } from 'react'
import useGlobalBarcodeScanner from '../hooks/use-global-barcode-scanner'
import BarcodeModal from './barcode-modal'

export default function GlobalBarcodeListener() {
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState('')

  const handleDetected = useCallback((value: string) => {
    // Show modal with scanned value
    setPendingValue(value)
    setModalOpen(true)
  }, [])

  useGlobalBarcodeScanner(handleDetected, { minLength: 3, interKeyMs: 80, maxScanDurationMs: 1200 })

  const handleConfirm = (barcode: string, quantity?: number) => {
    // Dispatch a global event so other parts can handle add-to-cart
    window.dispatchEvent(new CustomEvent('scanned-barcode', { detail: { barcode, quantity } }))
  }

  return (
    <BarcodeModal open={modalOpen} initialValue={pendingValue} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
  )
}
