"use client"

import { useCallback, useState } from 'react'
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

  const handleConfirm = (payload: any) => {
    // Forward whatever the modal sends (single barcode or bulk items) to global listeners
    window.dispatchEvent(new CustomEvent('scanned-barcode', { detail: payload }))
  }

  return (
    <BarcodeModal open={modalOpen} initialValue={pendingValue} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
  )
}
