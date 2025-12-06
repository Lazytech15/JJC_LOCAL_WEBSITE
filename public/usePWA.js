import { useState, useEffect, useCallback } from 'react';

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Safe way to get current pathname without useLocation hook
  const getCurrentPath = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }, []);

  useEffect(() => {
    // Check if running as PWA
    const checkIfPWA = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true;
      setIsInstalled(isPWA);
    };
    checkIfPWA();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      const currentPath = getCurrentPath();
      // Capture prompt for admin routes or employee routes
      if (currentPath.startsWith('/jjcewgsaccess') || currentPath.startsWith('/employee')) {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Handle location changes for SPAs
    const handlePopState = () => {
      // Re-check installability on route changes
      if (deferredPrompt) {
        const currentPath = getCurrentPath();
        const shouldBeInstallable = currentPath.startsWith('/jjcewgsaccess') || currentPath.startsWith('/employee');
        setIsInstallable(shouldBeInstallable);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [getCurrentPath, deferredPrompt]);

  const installPWA = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    
    return false;
  };

  const clearProfileCache = (uid) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_PROFILE',
        uid: uid
      });
    }
  };

  const clearAllProfileCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_ALL_CACHES'
      });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installPWA,
    clearProfileCache,
    clearAllProfileCache
  };
};