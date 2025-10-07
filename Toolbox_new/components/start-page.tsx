"use client"

import { useState, useEffect } from "react"
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  Cog, 
  Wrench, 
  HardHat,
  Zap,
  Database,
  CloudOff,
  Check,
  AlertTriangle
} from "lucide-react"

import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"

interface StartPageProps {
  onStart: () => void
  apiUrl: string
  onApiUrlChange: (url: string) => void
  isConnected: boolean
  apiError?: string | null
  isTestingConnection?: boolean
  hasCachedData?: boolean
  isDataLoading?: boolean
}

export function StartPage({
  onStart,
  apiUrl,
  onApiUrlChange,
  isConnected,
  apiError,
  isTestingConnection,
  hasCachedData = false,
  isDataLoading = false,
}: StartPageProps) {
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [cogsRotation, setCogsRotation] = useState(0)

  // Animate cogs rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCogsRotation(prev => (prev + 2) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const handleSaveSettings = () => {
    onApiUrlChange(tempApiUrl)
    setIsSettingsOpen(false)
  }

  // Determine system status
  const getSystemStatus = () => {
    if (isTestingConnection || isDataLoading) {
      return {
        icon: <Cog className="w-6 h-6 text-blue-500 animate-spin" />,
        title: "Initializing Systems",
        subtitle: "Connecting to mainframe...",
        color: "blue",
        showSpinner: true
      }
    }
    
    if (isConnected) {
      return {
        icon: <Check className="w-6 h-6 text-emerald-500" />,
        title: "Ready to Serve!",
        subtitle: "All systems operational",
        color: "emerald",
        showSpinner: false
      }
    }
    
    if (hasCachedData && !isConnected) {
      return {
        icon: <Database className="w-6 h-6 text-amber-500" />,
        title: "Serving in Offline Mode",
        subtitle: "Using cached inventory data",
        color: "amber",
        showSpinner: false
      }
    }
    
    return {
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      title: "Out of Service",
      subtitle: "No connection or cached data available",
      color: "red",
      showSpinner: false
    }
  }

  const systemStatus = getSystemStatus()
  const canStart = (isConnected || hasCachedData) && !isDataLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Engineering Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #94a3b8 1px, transparent 1px),
            linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Diagonal Technical Lines */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-slate-400 to-transparent transform -skew-x-12"></div>
          <div className="absolute top-0 left-3/4 w-1 h-full bg-gradient-to-b from-transparent via-slate-400 to-transparent transform skew-x-12"></div>
        </div>
      </div>

      {/* Animated Floating Cogs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large Cog - Top Right */}
        <div className="absolute top-10 right-10 opacity-5">
          <Cog 
            className="w-48 h-48 text-slate-300" 
            style={{ transform: `rotate(${cogsRotation}deg)` }}
          />
        </div>
        
        {/* Medium Cog - Bottom Left */}
        <div className="absolute bottom-20 left-20 opacity-5">
          <Cog 
            className="w-32 h-32 text-slate-300" 
            style={{ transform: `rotate(${-cogsRotation * 1.5}deg)` }}
          />
        </div>
        
        {/* Small Cog - Top Left */}
        <div className="absolute top-32 left-1/4 opacity-5">
          <Cog 
            className="w-24 h-24 text-slate-300" 
            style={{ transform: `rotate(${cogsRotation * 2}deg)` }}
          />
        </div>

        {/* Wrench Icon - Floating */}
        <div className="absolute top-1/4 right-1/4 opacity-5 animate-float">
          <Wrench className="w-20 h-20 text-slate-300 rotate-45" />
        </div>
        
        {/* Hard Hat Icon */}
        <div className="absolute bottom-1/3 right-1/3 opacity-5 animate-float" style={{ animationDelay: '1s' }}>
          <HardHat className="w-16 h-16 text-slate-300" />
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 border-slate-700 bg-slate-800/95 backdrop-blur-xl">
        <CardHeader className="text-center pb-4 border-b border-slate-700">
          <div className="mx-auto mb-4 relative">
            {/* Logo with Industrial Frame */}
            <div className="absolute inset-0 border-4 border-slate-600 rounded-lg transform rotate-45 scale-110"></div>
            <div className="relative bg-slate-900 p-3 rounded-lg border-2 border-slate-600">
              <img 
                src="/ToolBoxlogo.png" 
                alt="Toolbox Logo" 
                className="w-20 h-20 object-contain"
              />
              {/* Corner Bolts */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="absolute top-1 right-1 w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="absolute bottom-1 left-1 w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="absolute bottom-1 right-1 w-2 h-2 bg-slate-500 rounded-full"></div>
            </div>
          </div>
          
          <CardTitle className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 mb-2 tracking-wider">
            TOOLBOX
          </CardTitle>
          
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-mono">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>INDUSTRIAL POS SYSTEM</span>
            <Zap className="w-4 h-4 text-yellow-500" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* System Status Display */}
          <div className={`relative p-6 rounded-xl border-2 bg-gradient-to-br overflow-hidden ${
            systemStatus.color === 'emerald' 
              ? 'from-emerald-950/50 to-emerald-900/30 border-emerald-500' 
              : systemStatus.color === 'amber'
              ? 'from-amber-950/50 to-amber-900/30 border-amber-500'
              : systemStatus.color === 'red'
              ? 'from-red-950/50 to-red-900/30 border-red-500'
              : 'from-blue-950/50 to-blue-900/30 border-blue-500'
          }`}>
            {/* Animated background bars */}
            <div className="absolute inset-0 opacity-10">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-1 bg-white animate-pulse"
                  style={{
                    top: `${25 + i * 30}%`,
                    left: '-100%',
                    width: '100%',
                    animation: `slideRight 3s ease-in-out ${i * 0.5}s infinite`
                  }}
                ></div>
              ))}
            </div>

            <div className="relative flex items-center gap-4">
              <div className="shrink-0">
                {systemStatus.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${
                  systemStatus.color === 'emerald' ? 'text-emerald-400' :
                  systemStatus.color === 'amber' ? 'text-amber-400' :
                  systemStatus.color === 'red' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {systemStatus.title}
                </h3>
                <p className="text-slate-400 text-sm font-mono">{systemStatus.subtitle}</p>
              </div>
              
              {systemStatus.color === 'emerald' && (
                <Zap className="w-8 h-8 text-yellow-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="space-y-3">
            {/* API Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm font-medium text-slate-300">API Server</span>
              </div>
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                isConnected 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Cache Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-slate-300">Local Cache</span>
              </div>
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                hasCachedData 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-slate-700 text-slate-500'
              }`}>
                {hasCachedData ? 'AVAILABLE' : 'EMPTY'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {apiError && !isConnected && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-800">
              <div className="flex items-start gap-3">
                <CloudOff className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium mb-2">Connection Failed</p>
                  <p className="text-xs text-red-400/80 mb-2">{apiError}</p>
                  <div className="text-xs text-red-400/60 space-y-1 font-mono">
                    <p>→ Check API server status</p>
                    <p>→ Verify network connection</p>
                    {hasCachedData && <p>→ Offline mode available</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Out of Service Warning */}
          {!isConnected && !hasCachedData && !isTestingConnection && (
            <div className="p-4 rounded-lg bg-red-950/30 border-2 border-red-600 animate-pulse-slow">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-base font-bold text-red-400">Service Unavailable</p>
                  <p className="text-xs text-red-300 font-mono mt-1">
                    Please check back later or contact support
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={onStart}
              disabled={!canStart}
              className={`w-full h-14 text-lg font-bold relative overflow-hidden group transition-all duration-300 ${
                canStart
                  ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 text-white shadow-lg hover:shadow-xl border-2 border-slate-500'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed border-2 border-slate-700'
              }`}
            >
              {/* Button shine effect */}
              {canStart && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
              
              <span className="relative flex items-center justify-center gap-3">
                <HardHat className="w-6 h-6" />
                {isDataLoading ? 'LOADING...' : canStart ? 'START OPERATIONS' : 'SYSTEM OFFLINE'}
                <HardHat className="w-6 h-6" />
              </span>
            </Button>

            {/* Settings Button */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-2 border-slate-600 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-200"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 text-slate-100">
                    <Settings className="w-5 h-5" />
                    <span>API Configuration</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-url" className="text-slate-300">API Base URL</Label>
                    <Input
                      id="api-url"
                      placeholder="http://192.168.68.106:3001"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="font-mono text-sm bg-slate-900 border-slate-600 text-slate-100"
                    />
                    <p className="text-xs text-slate-400">
                      Enter the base URL for your API server. This changes daily.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveSettings} className="flex-1 bg-slate-700 hover:bg-slate-600">
                      Save Settings
                    </Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="flex-1 border-slate-600">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Footer Info */}
          <div className="text-center pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-500 font-mono space-y-1">
              <span className="block">TOOLBOX v2.0 • INDUSTRIAL GRADE</span>
              <span className="block text-slate-600">Built for Heavy-Duty Operations</span>
            </p>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-600 space-y-0.5">
                <span className="block">© {new Date().getFullYear()} JJC Engineering. All rights reserved.</span>
                <span className="block text-slate-700">Developed by KEIYK & Lazytech15</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes slideRight {
          0%, 100% { left: -100%; }
          50% { left: 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
