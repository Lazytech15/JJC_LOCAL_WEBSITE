import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

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
      // Only capture prompt if on admin routes
      if (location.pathname.startsWith('/jjcewgsaccess')) {
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [location.pathname]);

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