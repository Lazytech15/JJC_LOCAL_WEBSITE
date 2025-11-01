// ============================================================================
// service-worker.js - Optimized for Performance
// ============================================================================

const CACHE_VERSION = "v5" // Increment version to force cache refresh
const STATIC_CACHE = `jjc-static-${CACHE_VERSION}`
const API_CACHE = `jjc-api-${CACHE_VERSION}`
const DYNAMIC_CACHE = `jjc-dynamic-${CACHE_VERSION}`
const PROFILE_CACHE = `jjc-profiles-${CACHE_VERSION}`
const UI_CACHE = `jjc-ui-${CACHE_VERSION}`
const LANDING_CACHE = `jjc-landing-${CACHE_VERSION}`
const GALLERY_CACHE = `jjc-gallery-${CACHE_VERSION}`

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
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[Service Worker] Caching core assets only")
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn("[Service Worker] Failed to cache some core assets:", err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...")
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
            console.log("[Service Worker] Deleting old cache:", name)
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

  // Landing page images - Network First (lazy cache)
  if (url.pathname.includes("/api/profile/landing/")) {
    event.respondWith(lazyImageCacheStrategy(request, LANDING_CACHE, CACHE_EXPIRATION.LANDING))
    return
  }

  // Gallery images - Network First (lazy cache)
  if (url.pathname.includes("/api/profile/gallery/")) {
    event.respondWith(lazyImageCacheStrategy(request, GALLERY_CACHE, CACHE_EXPIRATION.GALLERY))
    return
  }

  // Profile pictures - Network First (lazy cache with shorter expiration)
  if (url.pathname.includes("/api/profile/")) {
    event.respondWith(lazyImageCacheStrategy(request, PROFILE_CACHE, CACHE_EXPIRATION.PROFILE))
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

// Lazy Image Cache Strategy - Only cache on first successful load
async function lazyImageCacheStrategy(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Check if cache is still valid
  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-date')
    if (dateHeader) {
      const cacheDate = new Date(dateHeader).getTime()
      const now = Date.now()
      
      if (now - cacheDate < maxAge) {
        console.log(`[Service Worker] Image from cache (${cacheName}):`, request.url)
        
        // Update in background without blocking
        fetch(request)
          .then(async (response) => {
            if (response.ok && response.status === 200) {
              const newResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              })
              newResponse.headers.append('sw-cache-date', new Date().toISOString())
              await cache.put(request, newResponse)
            }
          })
          .catch(() => {}) // Ignore background update errors
        
        return cached
      } else {
        // Cache expired, delete it
        await cache.delete(request)
      }
    }
  }

  // Fetch from network
  try {
    const response = await fetch(request)
    
    if (response.ok && response.status === 200) {
      // Cache in background, don't block response
      const responseToCache = response.clone()
      try { 
        // Only cache http(s) requests; skip extensions or unsupported schemes
        const proto = new URL(request.url).protocol
        if (proto === 'http:' || proto === 'https:') {
          await cache.put(request, responseToCache)
          console.log(`[Service Worker] Image cached in ${cacheName}:`, request.url)
        } else {
          console.log(`[Service Worker] Skipping cache for unsupported scheme (${proto}):`, request.url)
        }
      } catch (putErr) {
        console.warn(`[Service Worker] Failed to put image in cache:`, putErr)
      }
    }
    
    return response
  } catch (error) {
    console.error(`[Service Worker] Image fetch failed (${cacheName}):`, error)
    
    // Return cached version even if expired as fallback
    if (cached) {
      return cached
    }
    
    return new Response("Image not available", { 
      status: 503,
      headers: { "Content-Type": "text/plain" }
    })
  }
}

// Helper function to cache response asynchronously
async function cacheResponse(cache, request, response) {
  try {
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
    newResponse.headers.append('sw-cache-date', new Date().toISOString())
    await cache.put(request, newResponse)
    console.log("[Service Worker] Cached in background:", request.url)
  } catch (error) {
    console.warn("[Service Worker] Failed to cache:", error)
  }
}

// Cache First Strategy - Try cache first, then network
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    console.log("[Service Worker] Serving from cache:", request.url)
    return cached
  }

  try {
    console.log("[Service Worker] Fetching and caching:", request.url)
    const response = await fetch(request)
    if (response.ok) {
      try {
        const proto = new URL(request.url).protocol
        if (proto === 'http:' || proto === 'https:') {
          await cache.put(request, response.clone())
        } else {
          console.log(`[Service Worker] Skipping cache for unsupported scheme (${proto}):`, request.url)
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

// Network First Strategy - Try network first, fallback to cache with timeout
async function networkFirstWithTimeout(request, cacheName, timeout = 5000) {
  const cache = await caches.open(cacheName)
  
  try {
    // Race between fetch and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (response.ok) {
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

// Network First Strategy - Try network first, fallback to cache (deprecated, use networkFirstWithTimeout)
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  
  try {
    // Race between fetch and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (response.ok) {
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

// Cache First Strategy - For static assets only
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch (error) {
    console.error("[Service Worker] Fetch failed:", error)
    return new Response("Offline", { status: 503 })
  }
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
            const newResponse = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            })
            newResponse.headers.append('sw-cache-date', new Date().toISOString())
            await cache.put(url, newResponse)
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