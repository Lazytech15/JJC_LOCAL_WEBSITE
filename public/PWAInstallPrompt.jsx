import { useState, useEffect, useCallback } from 'react';
import { usePWA } from './usePWA';
import { X, Download, Smartphone } from 'lucide-react';

// Check if running as installed PWA
const isRunningAsPWA = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://') ||
         window.matchMedia('(display-mode: fullscreen)').matches;
};

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);

  // Safe way to get current pathname without useLocation hook
  const getCurrentPath = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }, []);

  useEffect(() => {
    // NEVER show install prompt if already running as installed PWA
    if (isInstalled || isRunningAsPWA()) {
      setShowPrompt(false);
      return;
    }

    const pathname = getCurrentPath();
    // Only show prompt if user is on /jjcewgsaccess route or /employee route
    const isOnValidRoute = pathname.startsWith('/jjcewgsaccess') || pathname.startsWith('/employee');
    
    if (!isOnValidRoute) {
      setShowPrompt(false);
      return;
    }

    // Check dismissal history
    const dismissCount = parseInt(localStorage.getItem('pwa-install-dismiss-count') || '0');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    // Calculate how long to wait before showing again based on dismiss count
    // 1st dismiss: show again after 1 day
    // 2nd dismiss: show again after 3 days
    // 3rd dismiss: show again after 7 days
    // 4th+ dismiss: show again after 30 days
    const waitDays = dismissCount === 0 ? 0 : 
                     dismissCount === 1 ? 1 : 
                     dismissCount === 2 ? 3 : 
                     dismissCount === 3 ? 7 : 30;
    
    let shouldShowPrompt = true;
    
    if (dismissedTime && dismissCount > 0) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      shouldShowPrompt = daysSinceDismissed >= waitDays;
    }

    if (isInstallable && shouldShowPrompt) {
      // Show prompt after 3 seconds
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowPrompt(false);
    }
  }, [isInstallable, isInstalled, getCurrentPath]);

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      setShowPrompt(false);
      // Clear dismiss history on successful install
      localStorage.removeItem('pwa-install-dismiss-count');
      localStorage.removeItem('pwa-install-dismissed-time');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Increment dismiss count
    const currentCount = parseInt(localStorage.getItem('pwa-install-dismiss-count') || '0');
    localStorage.setItem('pwa-install-dismiss-count', (currentCount + 1).toString());
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  // Don't render anything if running as PWA or not showing
  if (!showPrompt || isInstalled || isRunningAsPWA()) return null;

  return (
    <div className="fixed bottom-[env(safe-area-inset-bottom,16px)] left-2 right-2 sm:left-4 sm:right-4 md:left-auto md:right-4 md:w-96 z-[60] animate-slide-up">
      <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-white rounded-2xl shadow-2xl p-4 sm:p-5 border border-zinc-700/50 backdrop-blur-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-start gap-3 sm:gap-4 mb-4 pr-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-2.5 sm:p-3 shadow-lg flex-shrink-0">
            <Smartphone size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg mb-1 leading-tight">Install JJC Portal</h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Quick access, work offline, and get notifications. Install our app on your device!
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
          >
            <Download size={18} />
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 sm:py-3 text-zinc-300 hover:text-white border border-zinc-600 rounded-xl hover:bg-zinc-800 hover:border-zinc-500 transition-all text-sm sm:text-base active:scale-[0.98]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;