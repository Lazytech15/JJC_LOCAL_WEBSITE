/**
 * Mobile Utilities
 * Handles touch gestures, offline support, and mobile optimizations
 */

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook for handling swipe gestures
 * @param {Object} options - Configuration options
 * @returns {Object} - Gesture handlers and state
 */
export const useSwipeGesture = (options = {}) => {
  const {
    onSwipeLeft = null,
    onSwipeRight = null,
    onSwipeUp = null,
    onSwipeDown = null,
    threshold = 50,
    preventDefaultTouchMove = false
  } = options

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const touchEndRef = useRef({ x: 0, y: 0, time: 0 })
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = useCallback((e) => {
    setIsSwiping(true)
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (preventDefaultTouchMove && Math.abs(e.touches[0].clientX - touchStartRef.current.x) > 10) {
      e.preventDefault()
    }
    touchEndRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    }
  }, [preventDefaultTouchMove])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)
    
    const deltaX = touchEndRef.current.x - touchStartRef.current.x
    const deltaY = touchEndRef.current.y - touchStartRef.current.y
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time

    // Calculate velocity (pixels per ms)
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime

    // Determine if it's a valid swipe (distance > threshold and fast enough)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold

    if (isHorizontalSwipe) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight({ deltaX, velocityX })
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft({ deltaX: Math.abs(deltaX), velocityX })
      }
    } else if (isVerticalSwipe) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown({ deltaY, velocityY })
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp({ deltaY: Math.abs(deltaY), velocityY })
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    isSwiping
  }
}

/**
 * Hook for offline detection and data sync
 * @returns {Object} - Offline state and sync methods
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Back online, syncing pending changes...')
      setIsOnline(true)
      syncPendingChanges()
    }

    const handleOffline = () => {
      console.log('[OfflineSync] Gone offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending changes from localStorage
    try {
      const stored = localStorage.getItem('pendingLogChanges')
      if (stored) {
        setPendingChanges(JSON.parse(stored))
      }
    } catch (e) {
      console.error('[OfflineSync] Failed to load pending changes:', e)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Save changes to local storage when offline
   */
  const queueChange = useCallback((change) => {
    const newChanges = [...pendingChanges, {
      ...change,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    }]
    
    setPendingChanges(newChanges)
    
    try {
      localStorage.setItem('pendingLogChanges', JSON.stringify(newChanges))
    } catch (e) {
      console.error('[OfflineSync] Failed to save pending change:', e)
    }
  }, [pendingChanges])

  /**
   * Sync pending changes when back online
   */
  const syncPendingChanges = useCallback(async () => {
    if (pendingChanges.length === 0 || isSyncing) return

    setIsSyncing(true)
    const failedChanges = []

    for (const change of pendingChanges) {
      try {
        // Execute the pending API call
        await change.apiCall()
        console.log('[OfflineSync] Synced change:', change.id)
      } catch (error) {
        console.error('[OfflineSync] Failed to sync change:', change.id, error)
        failedChanges.push(change)
      }
    }

    // Keep only failed changes
    setPendingChanges(failedChanges)
    try {
      localStorage.setItem('pendingLogChanges', JSON.stringify(failedChanges))
    } catch (e) {
      console.error('[OfflineSync] Failed to update pending changes:', e)
    }

    setIsSyncing(false)
  }, [pendingChanges, isSyncing])

  /**
   * Clear all pending changes
   */
  const clearPendingChanges = useCallback(() => {
    setPendingChanges([])
    try {
      localStorage.removeItem('pendingLogChanges')
    } catch (e) {
      console.error('[OfflineSync] Failed to clear pending changes:', e)
    }
  }, [])

  return {
    isOnline,
    pendingChanges,
    isSyncing,
    queueChange,
    syncPendingChanges,
    clearPendingChanges
  }
}

/**
 * Hook for responsive mobile detection
 * @returns {Object} - Device information
 */
export const useMobileDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  })

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait'
      })
    }

    updateDeviceInfo()
    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

/**
 * Hook for local caching with TTL
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Object} - Cache methods
 */
export const useLocalCache = (key, ttl = 5 * 60 * 1000) => {
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      if (age > ttl) {
        localStorage.removeItem(key)
        return null
      }

      return data
    } catch (e) {
      console.error('[LocalCache] Failed to get cached data:', e)
      return null
    }
  }, [key, ttl])

  const setCachedData = useCallback((data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('[LocalCache] Failed to set cached data:', e)
    }
  }, [key])

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error('[LocalCache] Failed to clear cache:', e)
    }
  }, [key])

  return {
    getCachedData,
    setCachedData,
    clearCache
  }
}

/**
 * Hook for pull-to-refresh functionality
 * @param {Function} onRefresh - Callback when pull-to-refresh triggered
 * @returns {Object} - Pull-to-refresh state and handlers
 */
export const usePullToRefresh = (onRefresh) => {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullThreshold = 80
  const touchStartYRef = useRef(0)
  const scrollTopRef = useRef(0)

  const handleTouchStart = useCallback((e) => {
    scrollTopRef.current = window.pageYOffset || document.documentElement.scrollTop
    if (scrollTopRef.current === 0) {
      touchStartYRef.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (scrollTopRef.current > 0) return

    const touchY = e.touches[0].clientY
    const distance = touchY - touchStartYRef.current

    if (distance > 0) {
      setIsPulling(true)
      setPullDistance(Math.min(distance, pullThreshold * 1.5))
      
      if (distance > pullThreshold * 0.3) {
        e.preventDefault()
      }
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > pullThreshold) {
      try {
        await onRefresh()
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error)
      }
    }
    
    setIsPulling(false)
    setPullDistance(0)
    touchStartYRef.current = 0
  }, [pullDistance, onRefresh])

  return {
    isPulling,
    pullDistance,
    pullProgress: Math.min((pullDistance / pullThreshold) * 100, 100),
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}
