// ============================================================================
// service-worker.js - Optimized for Performance with Network First on Empty Cache
// ============================================================================

const CACHE_VERSION = "v14" // Increment version to force cache refresh
const STATIC_CACHE = `jjc-static-${CACHE_VERSION}`
const API_CACHE = `jjc-api-${CACHE_VERSION}`
const DYNAMIC_CACHE = `jjc-dynamic-${CACHE_VERSION}`
const PROFILE_CACHE = `jjc-profiles-${CACHE_VERSION}`
const UI_CACHE = `jjc-ui-${CACHE_VERSION}`
const LANDING_CACHE = `jjc-landing-${CACHE_VERSION}`
const GALLERY_CACHE = `jjc-gallery-${CACHE_VERSION}`
const DB_NAME = 'jjc-api-cache'
const DB_VERSION = 1
const STORE_NAME = 'operations-items'

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  PROFILE: 24 * 60 * 60 * 1000, // 24 hours
  LANDING: 7 * 24 * 60 * 60 * 1000, // 7 days
  GALLERY: 7 * 24 * 60 * 60 * 1000, // 7 days
  API: 5 * 60 * 1000, // 5 minutes
}

// Core assets to cache immediately on install
const CORE_ASSETS = [
  "/",
  "/index.html"
]

// Install event - cache only core assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...")
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        return await cache.addAll(CORE_ASSETS)
      } catch (err) {
        console.warn("[Service Worker] Failed to cache some core assets:", err)
      }
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith("jjc-") && 
                   name !== STATIC_CACHE && 
                   name !== API_CACHE && 
                   name !== DYNAMIC_CACHE &&
                   name !== PROFILE_CACHE &&
                   name !== UI_CACHE &&
                   name !== LANDING_CACHE &&
                   name !== GALLERY_CACHE
          })
          .map((name) => {
            return caches.delete(name)
          }),
      )
    }),
  )
  return self.clients.claim()
})

// Fetch event - implement optimized caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Real-time events (SSE/Polling) - always bypass cache and stream directly
  // Prevent timeouts or cached responses breaking live updates
  const acceptHeader = request.headers.get('accept') || ''
  if (url.pathname.startsWith('/api/events/') || acceptHeader.includes('text/event-stream')) {
    event.respondWith(fetch(request))
    return
  }

  

    // ============================================================================
  // Operations API - Use IndexedDB for caching
  // ============================================================================

// Handle get single item request
async function handleGetSingleItem(request, partNumber) {
  console.log('[Service Worker] 📄 Handling get single item:', partNumber)
  
  try {
    // First, try to get from IndexedDB
    const cachedItem = await getItemFromDB(partNumber)
    
    if (cachedItem) {
      console.log('[Service Worker] ✅ Returning item from IndexedDB:', partNumber)
      
      // Update from network in background (refresh cache)
      updateSingleItemInBackground(request, partNumber)
      
      return new Response(JSON.stringify(cachedItem), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Source': 'indexeddb',
          'X-Cached-At': cachedItem.cached_at
        }
      })
    }
    
    // No cache - fetch from network
    console.log('[Service Worker] 🌐 Fetching item from network:', partNumber)
    const response = await fetchWithTimeout(request, 10000)
    
    if (response.ok) {
      const data = await response.clone().json()
      
      // Save to IndexedDB in background
      if (data && data.part_number) {
        saveItemToDB(data).catch(err => {
          console.warn('[Service Worker] Background save failed:', err)
        })
      }
      
      return response
    }
    
    // Non-OK response from server - return it as-is instead of 503
    console.warn('[Service Worker] ⚠️ Server returned non-OK status:', response.status)
    return response
    
  } catch (error) {
    console.error('[Service Worker] ❌ Error handling get single item:', error)
    
    // Try to return cached data even if expired
    const cachedItem = await getItemFromDB(partNumber).catch(() => null)
    if (cachedItem) {
      console.log('[Service Worker] 📦 Using expired cache as emergency fallback:', partNumber)
      return new Response(JSON.stringify(cachedItem), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Source': 'indexeddb-emergency'
        }
      })
    }
    
    // No cache available - let the request fail naturally so the app can handle it
    console.error('[Service Worker] ❌ No cache available, passing through error')
    throw error
  }
}

// Helper function to fetch with timeout
async function fetchWithTimeout(request, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(request, { 
      signal: controller.signal,
      cache: 'no-cache'
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Background update function
async function updateSingleItemInBackground(request, partNumber) {
  try {
    const response = await fetchWithTimeout(request, 10000)
    if (response.ok) {
      const data = await response.json()
      if (data && data.part_number) {
        await saveItemToDB(data)
        console.log('[Service Worker] 🔄 Background update completed:', partNumber)
      }
    }
  } catch (error) {
    console.warn('[Service Worker] Background update failed:', error)
  }
}

async function handleGetAllItems(request) {
  console.log('[Service Worker] 📋 Handling get all items')
  
  try {
    // First, try to get from IndexedDB
    const cachedItems = await getAllItemsFromDB()
    
    if (cachedItems && cachedItems.length > 0) {
      console.log('[Service Worker] ✅ Returning items from IndexedDB:', cachedItems.length)
      
      // Update from network in background
      updateAllItemsInBackground(request)
      
      return new Response(JSON.stringify(cachedItems), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Source': 'indexeddb',
          'X-Item-Count': cachedItems.length.toString()
        }
      })
    }
    
    // No cache - fetch from network
    console.log('[Service Worker] 🌐 No cache, fetching all items from network')
    const response = await fetchWithTimeout(request, 15000)
    
    if (response.ok) {
      const data = await response.clone().json()
      
      // Save to IndexedDB in background
      if (Array.isArray(data) && data.length > 0) {
        batchSaveItemsToDB(data).catch(err => {
          console.warn('[Service Worker] Background batch save failed:', err)
        })
      }
      
      return response
    }
    
    // Non-OK response - return it as-is
    console.warn('[Service Worker] ⚠️ Server returned non-OK status:', response.status)
    return response
    
  } catch (error) {
    console.error('[Service Worker] ❌ Error handling get all items:', error)
    
    // Try to return cached data even if expired
    const cachedItems = await getAllItemsFromDB().catch(() => [])
    if (cachedItems.length > 0) {
      console.log('[Service Worker] 📦 Using cached items as emergency fallback:', cachedItems.length)
      return new Response(JSON.stringify(cachedItems), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Source': 'indexeddb-emergency'
        }
      })
    }
    
    // No cache available - let the error propagate
    console.error('[Service Worker] ❌ No cache available, passing through error')
    throw error
  }
}

// Background update for all items
async function updateAllItemsInBackground(request) {
  try {
    const response = await fetchWithTimeout(request, 15000)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        await batchSaveItemsToDB(data)
        console.log('[Service Worker] 🔄 Background update completed for all items')
      }
    }
  } catch (error) {
    console.warn('[Service Worker] Background update failed for all items:', error)
  }
}

  
  // Get all items - check IndexedDB first
  if (url.pathname === '/api/operations/items' && !url.searchParams.has('part_number')) {
    event.respondWith(handleGetAllItems(request))
    return
  }
  
  // Get single item by part_number query param - check IndexedDB first
  if (url.pathname === '/api/operations/items' && url.searchParams.has('part_number')) {
    const partNumber = url.searchParams.get('part_number')
    event.respondWith(handleGetSingleItem(request, partNumber))
    return
  }

  // Landing page images - Cache First with Network Fallback (no cache = direct network)
  if (url.pathname.includes("/api/profile/landing/")) {
    event.respondWith(cacheFirstWithNetworkFallback(request, LANDING_CACHE, CACHE_EXPIRATION.LANDING))
    return
  }

  // Gallery images - Cache First with Network Fallback (no cache = direct network)
  if (url.pathname.includes("/api/profile/gallery/")) {
    event.respondWith(cacheFirstWithNetworkFallback(request, GALLERY_CACHE, CACHE_EXPIRATION.GALLERY))
    return
  }

  // Profile pictures - Cache First with Network Fallback
  if (url.pathname.includes("/api/profile/")) {
    event.respondWith(cacheFirstWithNetworkFallback(request, PROFILE_CACHE, CACHE_EXPIRATION.PROFILE))
    return
  }

  // API requests - Network First with short cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 5000))
    return
  }

  // UI Assets - Cache First for hashed assets
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "manifest" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirstStrategy(request, UI_CACHE))
    return
  }

  // Images in UI - Network First (don't cache aggressively)
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
  ) {
    event.respondWith(networkFirstWithTimeout(request, DYNAMIC_CACHE, 3000))
    return
  }

  // HTML pages - Network First
  if (request.destination === "document" || url.pathname.endsWith(".html")) {
    event.respondWith(networkFirstWithTimeout(request, DYNAMIC_CACHE, 5000))
    return
  }

  // Everything else - Network only (don't cache)
  event.respondWith(fetch(request))
})

// Cache First with Network Fallback - Checks cache first, if not found goes to network
async function cacheFirstWithNetworkFallback(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Check if we have a valid cache
  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-date')
    if (dateHeader) {
      const cacheDate = new Date(dateHeader).getTime()
      const now = Date.now()
      
      // If cache is still valid, return it
      if (now - cacheDate < maxAge) {
        console.log(`[Service Worker] ✅ Cache hit (valid):`, request.url)
        
        // Update cache in background if it's getting old (>50% of maxAge)
        if (now - cacheDate > maxAge * 0.5) {
          console.log(`[Service Worker] 🔄 Refreshing cache in background:`, request.url)
          fetch(request, { cache: 'no-cache' })
            .then(response => {
              if (response.ok && response.status === 200) {
                cacheResponseWithDate(cache, request, response)
              }
            })
            .catch(() => {}) // Ignore background update errors
        }
        
        return cached
      } else {
        console.log(`[Service Worker] ⏰ Cache expired:`, request.url)
      }
    }
  }

  // No valid cache - fetch from network
  console.log(`[Service Worker] 🌐 No valid cache, fetching from network:`, request.url)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(request, { 
      signal: controller.signal,
      cache: 'no-cache'
    })
    clearTimeout(timeoutId)
    
    if (response.ok && response.status === 200) {
      console.log(`[Service Worker] ✅ Network fetch successful, caching:`, request.url)
      // Cache the response in background
      cacheResponseWithDate(cache, request, response.clone())
      return response
    }
    
    // Non-OK response
    console.warn(`[Service Worker] ⚠️ Network response not OK (${response.status}):`, request.url)
    
    // If we have expired cache, use it as fallback
    if (cached) {
      console.log(`[Service Worker] 📦 Using expired cache as fallback:`, request.url)
      return cached
    }
    
    return response
    
  } catch (error) {
    console.error(`[Service Worker] ❌ Network fetch failed (${error.name}):`, request.url)
    
    // If we have any cache (even expired), use it
    if (cached) {
      console.log(`[Service Worker] 📦 Network failed, using cached version:`, request.url)
      return cached
    }
    
    // No cache available - return error response
    return new Response(
      JSON.stringify({ 
        error: "Image temporarily unavailable",
        message: "Please check your connection and refresh",
        url: request.url 
      }), 
      { 
        status: 503,
        statusText: "Service Unavailable",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    )
  }
}

// Helper function to cache response with timestamp
async function cacheResponseWithDate(cache, request, response) {
  try {
    const blob = await response.blob()
    const headers = new Headers(response.headers)
    headers.set('sw-cache-date', new Date().toISOString())
    
    const responseToCache = new Response(blob, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    })
    
    await cache.put(request, responseToCache)
    console.log(`[Service Worker] 💾 Cached successfully:`, request.url)
  } catch (error) {
    console.warn(`[Service Worker] Failed to cache:`, error)
  }
}

// Cache First Strategy - Try cache first, then network
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      try {
        const proto = new URL(request.url).protocol
        if (proto === 'http:' || proto === 'https:') {
          await cache.put(request, response.clone())
        }
      } catch (putErr) {
        console.warn('[Service Worker] cache.put failed:', putErr)
      }
    }
    return response
  } catch (error) {
    console.error("[Service Worker] Fetch failed:", error)
    // Return offline page for documents
    if (request.destination === "document") {
      return cache.match("/offline.html") || new Response("Offline", { status: 503 })
    }
    return new Response("Offline", { status: 503 })
  }
}

// Network First Strategy - Try network first, fallback to cache
async function networkFirstStrategy(request, cacheName, timeout = 5000) {
  const cache = await caches.open(cacheName)

  try {
    // Race between fetch and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (response && response.ok) {
      // Cache in background
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch (error) {
    // Network failed or timed out, try cache
    const cached = await cache.match(request)
    if (cached) {
      console.log("[Service Worker] Network timeout/failed, using cache:", request.url)
      return cached
    }

    // Return error response
    if (request.destination === "document") {
      return cache.match("/offline.html") || new Response("Offline", { status: 503 })
    }

    return new Response(JSON.stringify({ error: "Network unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Wrapper used by the fetch handler
async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  return networkFirstStrategy(request, cacheName, timeoutMs)
}

// Background sync for failed requests
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag)
  if (event.tag === "sync-data") {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  console.log("[Service Worker] Syncing data...")
}

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || "JJC Portal Notification"
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192.jpg",
    badge: "/icons/icon-192.jpg",
    data: data.url || "/",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data))
})

// Message handler for cache management
self.addEventListener("message", (event) => {
  // Clear specific cache
  if (event.data && event.data.type === "CLEAR_CACHE") {
    const cacheName = event.data.cacheName
    event.waitUntil(
      caches.delete(cacheName).then(() => {
        console.log(`[Service Worker] Cache cleared: ${cacheName}`)
      })
    )
  }
  
  // Clear all image caches
  if (event.data && event.data.type === "CLEAR_IMAGE_CACHES") {
    event.waitUntil(
      Promise.all([
        caches.delete(PROFILE_CACHE),
        caches.delete(LANDING_CACHE),
        caches.delete(GALLERY_CACHE)
      ]).then(() => {
        console.log("[Service Worker] All image caches cleared")
      })
    )
  }
  
  // Clear specific profile
  if (event.data && event.data.type === "CLEAR_PROFILE") {
    const uid = event.data.uid
    event.waitUntil(
      caches.open(PROFILE_CACHE).then((cache) => {
        cache.keys().then((requests) => {
          requests.forEach((request) => {
            if (request.url.includes(`/api/profile/${uid}`)) {
              cache.delete(request)
              console.log("[Service Worker] Cleared profile cache for UID:", uid)
            }
          })
        })
      })
    )
  }
  
  // Skip waiting and activate new service worker
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
  
  // Prefetch images (only when explicitly requested)
  if (event.data && event.data.type === "PREFETCH_IMAGES") {
    const urls = event.data.urls || []
    event.waitUntil(prefetchImages(urls))
  }

  // Clear IndexedDB cache
  if (event.data && event.data.type === "CLEAR_INDEXEDDB") {
    event.waitUntil(
      clearAllItemsFromDB().then(() => {
        console.log("[Service Worker] IndexedDB cleared")
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true })
        }
      }).catch(err => {
        console.error("[Service Worker] Failed to clear IndexedDB:", err)
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message })
        }
      })
    )
  }
  
  // Refresh specific item in IndexedDB (after update/create)
  if (event.data && event.data.type === "REFRESH_ITEM") {
    const partNumber = event.data.partNumber
    event.waitUntil(
      deleteItemFromDB(partNumber).then(() => {
        console.log("[Service Worker] Item cache invalidated:", partNumber)
        // Fetch fresh data and cache it
        return fetch(`/api/operations/items?part_number=${encodeURIComponent(partNumber)}`)
          .then(response => response.json())
          .then(item => saveItemToDB(item))
      }).catch(err => {
        console.warn("[Service Worker] Failed to refresh item:", err)
      })
    )
  }
  
  // Refresh all items (after bulk operations)
  if (event.data && event.data.type === "REFRESH_ALL_ITEMS") {
    event.waitUntil(
      clearAllItemsFromDB().then(() => {
        console.log("[Service Worker] All items cache cleared, will refresh on next fetch")
      }).catch(err => {
        console.warn("[Service Worker] Failed to clear all items:", err)
      })
    )
  }
  
  // Force update items from network
  if (event.data && event.data.type === "FORCE_UPDATE_ITEMS") {
    event.waitUntil(
      fetch('/api/operations/items', { cache: 'no-cache' })
        .then(response => response.json())
        .then(data => {
          if (Array.isArray(data)) {
            return batchSaveItemsToDB(data)
          }
          throw new Error('Invalid data format')
        })
        .then(() => {
          console.log("[Service Worker] Forced update completed")
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: true })
          }
        })
        .catch(err => {
          console.error("[Service Worker] Forced update failed:", err)
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: err.message })
          }
        })
    )
  }
})

// Prefetch images only when requested
async function prefetchImages(urls) {
  console.log(`[Service Worker] Prefetching ${urls.length} images...`)
  const cache = await caches.open(PROFILE_CACHE)
  
  // Prefetch in batches of 5 to avoid overwhelming the network
  const batchSize = 5
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cacheResponseWithDate(cache, new Request(url), response)
          }
        } catch (error) {
          console.warn(`[Service Worker] Prefetch failed for ${url}:`, error)
        }
      })
    )
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  console.log("[Service Worker] Prefetch completed")
}

// ============================================================================
// IndexedDB Utility Functions for Caching Data for Operations Department
// ============================================================================

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'part_number' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        objectStore.createIndex('client_name', 'client_name', { unique: false })
        console.log('[Service Worker] IndexedDB object store created')
      }
    }
  })
}

// Save item to IndexedDB
async function saveItemToDB(item) {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // Add timestamp for cache invalidation
    const itemWithTimestamp = {
      ...item,
      timestamp: Date.now(),
      cached_at: new Date().toISOString()
    }
    
    await store.put(itemWithTimestamp)
    console.log(`[Service Worker] 💾 Saved item to IndexedDB:`, item.part_number)
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to save to IndexedDB:', error)
    return false
  }
}

// Get item from IndexedDB
async function getItemFromDB(partNumber) {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(partNumber)
      request.onsuccess = () => {
        const item = request.result
        if (item) {
          // Check if cache is still valid (24 hours)
          const cacheAge = Date.now() - item.timestamp
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours
          
          if (cacheAge < maxAge) {
            console.log(`[Service Worker] ✅ IndexedDB cache hit:`, partNumber)
            resolve(item)
          } else {
            console.log(`[Service Worker] ⏰ IndexedDB cache expired:`, partNumber)
            resolve(null)
          }
        } else {
          console.log(`[Service Worker] ❌ IndexedDB cache miss:`, partNumber)
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to get from IndexedDB:', error)
    return null
  }
}

// Get all items from IndexedDB
async function getAllItemsFromDB() {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const items = request.result || []
        console.log(`[Service Worker] 📦 Retrieved ${items.length} items from IndexedDB`)
        
        // Filter out expired items (older than 24 hours)
        const maxAge = 24 * 60 * 60 * 1000
        const validItems = items.filter(item => {
          const cacheAge = Date.now() - item.timestamp
          return cacheAge < maxAge
        })
        
        console.log(`[Service Worker] ✅ ${validItems.length} valid items (${items.length - validItems.length} expired)`)
        resolve(validItems)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to get all from IndexedDB:', error)
    return []
  }
}

// Clear all items from IndexedDB
async function clearAllItemsFromDB() {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.clear()
    console.log('[Service Worker] 🗑️ Cleared all items from IndexedDB')
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to clear IndexedDB:', error)
    return false
  }
}

// Delete specific item from IndexedDB
async function deleteItemFromDB(partNumber) {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.delete(partNumber)
    console.log(`[Service Worker] 🗑️ Deleted item from IndexedDB:`, partNumber)
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to delete from IndexedDB:', error)
    return false
  }
}

// Batch save items to IndexedDB
async function batchSaveItemsToDB(items) {
  try {
    const db = await initDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const timestamp = Date.now()
    const cachedAt = new Date().toISOString()
    
    for (const item of items) {
      const itemWithTimestamp = {
        ...item,
        timestamp,
        cached_at: cachedAt
      }
      store.put(itemWithTimestamp)
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[Service Worker] 💾 Batch saved ${items.length} items to IndexedDB`)
        resolve(true)
      }
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('[Service Worker] Failed to batch save to IndexedDB:', error)
    return false
  }
}

// End of Operations Department IndexedDB Utilities