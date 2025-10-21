"use client"

import { useCallback } from 'react'
import useGlobalBarcodeScanner from '../hooks/use-global-barcode-scanner'

export default function GlobalBarcodeListener() {
  // When a barcode is detected, dispatch a global event immediately.
  const handleDetected = useCallback((value: string) => {
    // Send barcode and default quantity of 1 (consumers can override if needed)
    window.dispatchEvent(new CustomEvent('scanned-barcode', { detail: { barcode: value, quantity: 1 } }))
  }, [])

  useGlobalBarcodeScanner(handleDetected, { minLength: 3, interKeyMs: 80, maxScanDurationMs: 1200 })

  return null
}
