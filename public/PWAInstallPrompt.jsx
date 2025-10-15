import { useState, useEffect } from 'react';
import { usePWA } from './usePWA';
import { X, Download } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const { isInstallable, installPWA } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    // Show again after 7 days
    if (dismissed && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed > 7) {
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.removeItem('pwa-install-dismissed-time');
      }
    }

    if (isInstallable && !dismissed) {
      // Show prompt after 3 seconds
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-lg shadow-2xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-3 mb-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Download size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Install JJC Portal</h3>
            <p className="text-sm text-white/90">
              Get quick access and work offline. Install our app on your device!
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white/90 hover:text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;