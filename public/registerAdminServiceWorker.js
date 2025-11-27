// Register the admin-specific service worker only for /jjcewgsaccess routes
export const registerAdminServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Only register if we're on the admin route
      if (window.location.pathname.startsWith('/jjcewgsaccess')) {
        navigator.serviceWorker
          .register('/service-worker-admin.js', {
            scope: '/jjcewgsaccess/'
          })
          .then((registration) => {
            console.log('[Admin SW] Registered with scope:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  if (confirm('New version available! Refresh to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            });
          })
          .catch((error) => {
            console.error('[Admin SW] Registration failed:', error);
          });
      }
    });
  }
};

export const unregisterAdminServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.scope.includes('/jjcewgsaccess/')) {
          registration.unregister().then(() => {
            console.log('[Admin SW] Unregistered');
          });
        }
      });
    });
  }
};

// Helper to clear admin caches
export const clearAdminCaches = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_ALL_CACHES'
    });
  }
};

export const clearAdminProfileCache = (uid) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_PROFILE',
      uid: uid
    });
  }
};