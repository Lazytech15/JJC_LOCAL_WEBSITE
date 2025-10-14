// ============================================================================
// service-worker.js - Enhanced with Profile Picture Caching
// ============================================================================

const CACHE_VERSION = "v1"
const STATIC_CACHE = `jjc-static-${CACHE_VERSION}`
const API_CACHE = `jjc-api-${CACHE_VERSION}`
const DYNAMIC_CACHE = `jjc-dynamic-${CACHE_VERSION}`
const PROFILE_CACHE = `jjc-profiles-${CACHE_VERSION}` // New: Profile pictures cache

const STATIC_ASSETS = ["/", "/offline.html", "/manifest.json"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...")
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[Service Worker] Caching static assets")
      return cache.addAll(STATIC_ASSETS)
    }),
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
                   name !== PROFILE_CACHE
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

  // Static assets - Cache First
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  // Dynamic content - Stale While Revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE))
})

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
      // Clone the response before caching
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

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error("[Service Worker] Fetch failed:", error)
    return new Response("Offline", { status: 503 })
  }
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log("[Service Worker] Network failed, trying cache")
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
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

// Message handler for clearing profile cache
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_PROFILE_CACHE") {
    event.waitUntil(
      caches.delete(PROFILE_CACHE).then(() => {
        console.log("[Service Worker] Profile cache cleared")
        return caches.open(PROFILE_CACHE)
      })
    )
  }
  
  if (event.data && event.data.type === "CLEAR_PROFILE") {
    const uid = event.data.uid
    event.waitUntil(
      caches.open(PROFILE_CACHE).then((cache) => {
        // Remove specific profile from cache
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
})