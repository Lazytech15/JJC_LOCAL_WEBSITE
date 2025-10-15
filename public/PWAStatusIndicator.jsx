import { usePWA } from './usePWA';
import { Wifi, WifiOff } from 'lucide-react';

export const PWAStatusIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-slide-down">
        <WifiOff size={18} />
        <span className="text-sm font-medium">You're offline</span>
      </div>
    </div>
  );
};

export default PWAStatusIndicator;