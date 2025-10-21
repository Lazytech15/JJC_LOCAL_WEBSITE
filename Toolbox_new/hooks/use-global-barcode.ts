import { useEffect } from 'react'

type Options = {
  minLength?: number
  intervalThresholdMs?: number
  maxBufferDelayMs?: number
}

/**
 * Listens on document key events and detects barcode scanner input based on
 * rapid key sequences ending with Enter/Tab. Calls onDetected(barcode) when a
 * scan is detected.
 */
export function useGlobalBarcodeScanner(
  onDetected: (barcode: string) => void,
  options: Options = {}
) {
  useEffect(() => {
    const minLength = options.minLength ?? 3
    const intervalThresholdMs = options.intervalThresholdMs ?? 80
    const maxBufferDelayMs = options.maxBufferDelayMs ?? 800 // reset buffer after idle

    let buffer = ''
    let lastCharTime = 0
    let intervals: number[] = []

    function reset() {
      buffer = ''
      lastCharTime = 0
      intervals = []
    }

    function onKeyDown(e: KeyboardEvent) {
      try {
        const now = Date.now()

        if (lastCharTime && now - lastCharTime > maxBufferDelayMs) {
          // too much idle time -> reset buffer
          reset()
        }

        lastCharTime = now

        // Ignore modifier-only keys
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return

        if (e.key === 'Enter' || e.key === 'Tab') {
          // finalize
          if (buffer.length >= minLength) {
            // Evaluate timings - consider it a scan if intervals are mostly below threshold
            const avg = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : Infinity
            const isFast = avg <= intervalThresholdMs

            if (isFast || buffer.length >= 8) {
              // Detected barcode
              const barcode = buffer
              // Reset before callback to avoid re-entrancy issues
              reset()
              onDetected(barcode)
            } else {
              // Not fast enough - treat as typed input -> reset
              reset()
            }
          } else {
            reset()
          }

          return
        }

        // Printable characters only
        if (e.key.length === 1) {
          if (lastCharTime && intervals.length >= 0) {
            // push interval for this char (difference already updated above)
            // we store the interval since previous char
            // If intervals length is n, it corresponds to n+1 chars; push the delta
            const lastInterval = intervals.length === 0 ? now - lastCharTime : now - (now - (now - (now - lastCharTime)))
            // simpler: compute delta since previous char: use now - (lastCharTime) but lastCharTime already set to now, so we need previous
          }

          // We will compute intervals differently: keep a prevTime variable
        }
      } catch (err) {
        // swallow
      }
    }

    // We'll implement a more robust listener using closure-scoped prevTime
    // Re-define with closure vars
    reset()
    let prevTime = 0

    const listener = (e: KeyboardEvent) => {
      const now = Date.now()

      if (prevTime && now - prevTime > maxBufferDelayMs) {
        buffer = ''
        intervals = []
      }

      // Ignore pure modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        prevTime = now
        return
      }

      // finalize on Enter/Tab
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= minLength) {
          const avg = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : Infinity
          const isFast = avg <= intervalThresholdMs
          if (isFast || buffer.length >= 8) {
            const barcode = buffer
            buffer = ''
            intervals = []
            prevTime = 0
            onDetected(barcode)
            return
          }
        }

        // Not a scan
        buffer = ''
        intervals = []
        prevTime = now
        return
      }

      // Append printable characters
      if (e.key.length === 1) {
        if (prevTime) {
          const delta = now - prevTime
          intervals.push(delta)
        }

        buffer += e.key
        prevTime = now
        // Do not auto-fire until terminator is seen
      } else {
        // other keys - treat as reset
        prevTime = now
      }
    }

    document.addEventListener('keydown', listener)

    return () => {
      document.removeEventListener('keydown', listener)
    }
  }, [onDetected, options.minLength, options.intervalThresholdMs, options.maxBufferDelayMs])
}

export default useGlobalBarcodeScanner
