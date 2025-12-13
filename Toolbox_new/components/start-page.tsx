"use client"

import { useState } from "react"
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  Package,
  Database,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react"

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
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

  const handleSaveSettings = () => {
    onApiUrlChange(tempApiUrl)
    setIsSettingsOpen(false)
  }

  const canStart = (isConnected || hasCachedData) && !isDataLoading

  // Status indicator
  const getStatusInfo = () => {
    if (isTestingConnection || isDataLoading) {
      return { icon: Loader2, label: "Connecting...", color: "text-muted-foreground", spin: true }
    }
    if (isConnected) {
      return { icon: Check, label: "Ready", color: "text-green-500", spin: false }
    }
    if (hasCachedData) {
      return { icon: Database, label: "Offline Mode", color: "text-amber-500", spin: false }
    }
    return { icon: AlertCircle, label: "Unavailable", color: "text-destructive", spin: false }
  }

  const status = getStatusInfo()
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="relative w-full max-w-sm border-slate-700/50 bg-slate-800/80 backdrop-blur-xl shadow-2xl">
        <CardContent className="pt-8 pb-6 px-6 space-y-6">
          {/* Logo & Title */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl blur-lg opacity-50"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-xl border border-slate-600/50 overflow-hidden">
                <img 
                  src="/ToolBoxlogo.png" 
                  alt="Toolbox Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <Package className="w-10 h-10 text-teal-400 hidden" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wide">TOOLBOX</h1>
              <p className="text-sm text-slate-400">Inventory Management System</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-700/50 border border-slate-600/30">
            <StatusIcon className={`w-4 h-4 ${status.color} ${status.spin ? 'animate-spin' : ''}`} />
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>

          {/* Connection Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm text-slate-300">Server</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/30 text-slate-500'}`}>
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Cache</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hasCachedData ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/30 text-slate-500'}`}>
                {hasCachedData ? 'Available' : 'Empty'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {apiError && !isConnected && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{apiError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={onStart}
              disabled={!canStart}
              className="w-full h-12 font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25 border-0"
              size="lg"
            >
              {isDataLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : canStart ? (
                'Open Toolbox'
              ) : (
                'Unavailable'
              )}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full h-10 text-slate-400 hover:text-white hover:bg-slate-700/50">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">API Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-url" className="text-slate-300">Server URL</Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.example.com"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="font-mono text-sm bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} className="flex-1 bg-teal-600 hover:bg-teal-700">
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 pt-2">
            © {new Date().getFullYear()} JJC Engineering
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
