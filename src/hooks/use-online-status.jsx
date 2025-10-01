"use client"

import { useState, useEffect } from "react"

/**
 * Hook for online/offline status detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionQuality, setConnectionQuality] = useState("good")

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      checkConnectionQuality()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality("offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check connection quality periodically
    const qualityInterval = setInterval(checkConnectionQuality, 30000)

    // Initial check
    checkConnectionQuality()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(qualityInterval)
    }
  }, [])

  const checkConnectionQuality = async () => {
    if (!navigator.onLine) {
      setConnectionQuality("offline")
      return
    }

    try {
      const start = Date.now()
      await fetch("/api/ping", { method: "HEAD" })
      const duration = Date.now() - start

      if (duration < 200) {
        setConnectionQuality("good")
      } else if (duration < 500) {
        setConnectionQuality("fair")
      } else {
        setConnectionQuality("slow")
      }
    } catch (error) {
      setConnectionQuality("poor")
    }
  }

  return {
    isOnline,
    connectionQuality,
    checkConnectionQuality,
  }
}
