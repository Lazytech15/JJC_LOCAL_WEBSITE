// ============================================================================
// service-worker.js - Enhanced with Profile Picture & UI Caching
// ============================================================================

const CACHE_VERSION = "v3" // Increment version for UI caching
const STATIC_CACHE = `jjc-static-${CACHE_VERSION}`
const API_CACHE = `jjc-api-${CACHE_VERSION}`
const DYNAMIC_CACHE = `jjc-dynamic-${CACHE_VERSION}`
const PROFILE_CACHE = `jjc-profiles-${CACHE_VERSION}`
const UI_CACHE = `jjc-ui-${CACHE_VERSION}` // New: UI assets cache
const LANDING_CACHE = `jjc-landing-${CACHE_VERSION}` // NEW
const GALLERY_CACHE = `jjc-gallery-${CACHE_VERSION}` // NEW

// Core assets to cache immediately on install
const CORE_ASSETS = [
  "/",
  "/index.html"
]

// Optional assets (fail gracefully if not available)
const OPTIONAL_ASSETS = [
  "/offline.html",
  "/manifest.json"
]

// Static assets to cache
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/ToolBoxlogo.png",
  "/manifest.json",
  "/favicon.ico"
]

// UI assets (will be populated dynamically)
const UI_ASSETS = [
  // These will be added dynamically during runtime
]

// Install event - cache static and UI assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...")
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[Service Worker] Caching static assets")
        return cache.addAll(CORE_ASSETS)
      }),
      // Cache UI assets (optional)
      caches.open(UI_CACHE).then((cache) => {
        console.log("[Service Worker] Caching UI assets")
        return Promise.allSettled(
          UI_ASSETS.map(asset => 
            cache.add(asset).catch(err => {
              console.warn("[Service Worker] Failed to cache UI asset:", asset, err.message)
              return null
            })
          )
        )
      })
    ])
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

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

    // Landing page images - Cache First
  if (url.pathname.includes("/api/profile/landing/")) {
    event.respondWith(imageCacheStrategy(request, LANDING_CACHE))
    return
  }

  // Gallery images - Cache First
  if (url.pathname.includes("/api/profile/gallery/")) {
    event.respondWith(imageCacheStrategy(request, GALLERY_CACHE))
    return
  }

  // Profile pictures - Cache First with Long TTL
  if (url.pathname.includes("/api/profile/")) {
    event.respondWith(profileCacheStrategy(request, PROFILE_CACHE))
    return
  }

  // API requests - Network First with Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request, API_CACHE))
    return
  }

  // UI Assets (CSS, JS, Images, Fonts) - Cache First with Network Fallback
  // This handles all Vite-built assets with hash names
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest" ||
    url.pathname.startsWith("/assets/") || // Vite puts built files in /assets/
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|ico|json)$/)
  ) {
    event.respondWith(cacheFirstStrategy(request, UI_CACHE))
    return
  }

  // HTML pages - Network First with Cache Fallback (for fresh content)
  if (request.destination === "document" || url.pathname.endsWith(".html")) {
    event.respondWith(networkFirstStrategy(request, UI_CACHE))
    return
  }

  // Dynamic content - Stale While Revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE))
})

// New image cache strategy
async function imageCacheStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    console.log(`[Service Worker] Image from cache (${cacheName}):`, request.url)
    return cached
  }

  try {
    console.log(`[Service Worker] Fetching image for ${cacheName}:`, request.url)
    const response = await fetch(request)
    
    if (response.ok && response.status === 200) {
      const responseToCache = response.clone()
      cache.put(request, responseToCache)
      console.log(`[Service Worker] Image cached in ${cacheName}:`, request.url)
    }
    
    return response
  } catch (error) {
    console.error(`[Service Worker] Image fetch failed (${cacheName}):`, error)
    return new Response("Image not available", { 
      status: 503,
      headers: { "Content-Type": "text/plain" }
    })
  }
}

// Profile Cache Strategy - Cache First with long expiration
async function profileCacheStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Return cached profile if exists
  if (cached) {
    console.log("[Service Worker] Profile from cache:", request.url)
    
    // Update in background (optional - for fresh data)
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          cache.put(request, response.clone())
          console.log("[Service Worker] Profile updated in cache:", request.url)
        }
      })
      .catch(() => {
        // Ignore background update errors
      })
    
    return cached
  }

  // Fetch and cache if not in cache
  try {
    console.log("[Service Worker] Fetching profile:", request.url)
    const response = await fetch(request)
    
    if (response.ok && response.status === 200) {
      const responseToCache = response.clone()
      cache.put(request, responseToCache)
      console.log("[Service Worker] Profile cached:", request.url)
    }
    
    return response
  } catch (error) {
    console.error("[Service Worker] Profile fetch failed:", error)
    return new Response("Profile not available", { status: 503 })
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
      cache.put(request, response.clone())
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
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (response.ok) {
      console.log("[Service Worker] Network response, updating cache:", request.url)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log("[Service Worker] Network failed, trying cache:", request.url)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    
    // Return offline page for documents
    if (request.destination === "document") {
      return cache.match("/offline.html") || new Response("Offline", { status: 503 })
    }
    
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Stale While Revalidate Strategy - Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        console.log("[Service Worker] Background update:", request.url)
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)

  return cached || fetchPromise
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
  // Clear all UI cache
  if (event.data && event.data.type === "CLEAR_UI_CACHE") {
    event.waitUntil(
      caches.delete(UI_CACHE).then(() => {
        console.log("[Service Worker] UI cache cleared")
        return caches.open(UI_CACHE)
      })
    )
  }
  
  // Clear profile cache
  if (event.data && event.data.type === "CLEAR_PROFILE_CACHE") {
    event.waitUntil(
      caches.delete(PROFILE_CACHE).then(() => {
        console.log("[Service Worker] Profile cache cleared")
        return caches.open(PROFILE_CACHE)
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
})