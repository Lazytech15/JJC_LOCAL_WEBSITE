// Lightweight global barcode scanner hook
// Detects rapid key sequences followed by Enter/Tab and calls onDetected(barcode)
import { useEffect, useRef } from 'react'

type OnDetected = (barcode: string) => void

export function useGlobalBarcodeScanner(onDetected: OnDetected, options?: { minLength?: number; interKeyMs?: number; maxScanDurationMs?: number }) {
  const opts = {
    minLength: 3,
    interKeyMs: 80, // max time between keystrokes to still consider as scanner
    maxScanDurationMs: 1200, // whole scan must complete within this
    ...options,
  }

  const bufferRef = useRef<string>('')
  const firstKeyTimeRef = useRef<number | null>(null)
  const lastKeyTimeRef = useRef<number | null>(null)
  const cleanupTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key
      const now = Date.now()

      // Ignore modifier-only events
      if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return

      // If Enter or Tab - consider this the end of scan
      if (key === 'Enter' || key === 'Tab') {
        const barcode = bufferRef.current.trim()
        const first = firstKeyTimeRef.current
        const last = lastKeyTimeRef.current
        const duration = first && last ? last - first : 0

        // Only accept if barcode length >= minLength and duration within limit
        if (barcode.length >= (opts.minLength ?? 3) && duration <= (opts.maxScanDurationMs ?? 1200)) {
          // call callback asynchronously
          try { onDetected(barcode) } catch (err) { console.error('onDetected callback error', err) }
        }

        bufferRef.current = ''
        firstKeyTimeRef.current = null
        lastKeyTimeRef.current = null
        if (cleanupTimerRef.current) { window.clearTimeout(cleanupTimerRef.current); cleanupTimerRef.current = null }
        return
      }

      // Only accept printable single-character keys
      if (key.length === 1) {
        if (!firstKeyTimeRef.current) firstKeyTimeRef.current = now
        lastKeyTimeRef.current = now

        // if time since last key is too long, reset buffer
        const last = lastKeyTimeRef.current
        if (last && firstKeyTimeRef.current && now - (last || now) > (opts.interKeyMs ?? 80)) {
          // too slow - treat like human typing; start fresh buffer
        }

        bufferRef.current += key

        // reset/extend inactivity timer - if no key for 200ms, clear buffer
        if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current)
        cleanupTimerRef.current = window.setTimeout(() => {
          // avoid clearing too quickly if a scanner is still sending keys
          bufferRef.current = ''
          firstKeyTimeRef.current = null
          lastKeyTimeRef.current = null
          cleanupTimerRef.current = null
        }, 800)
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (cleanupTimerRef.current) {
        window.clearTimeout(cleanupTimerRef.current)
        cleanupTimerRef.current = null
      }
    }
  }, [onDetected, opts.interKeyMs, opts.maxScanDurationMs, opts.minLength])
}

export default useGlobalBarcodeScanner
