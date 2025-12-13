import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, Calendar, Download, ChevronLeft, ChevronRight, X, FileText, User, Clock, Package, Filter, Menu } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useToast } from "../hooks/use-toast"
import { apiService } from "../lib/api_service"
import { exportLogsToXLSX } from "../lib/export-utils"
import { pollingManager } from "../../src/utils/api/websocket/polling-manager.jsx"
import { SOCKET_EVENTS } from "../../src/utils/api/websocket/constants/events.js"

interface Log {
  id: number | string
  username: string
  id_number?: string
  id_barcode?: string
  details?: string
  log_date: string
  log_time: string
  purpose?: string
  item_no?: string
  created_at?: string
}

interface EmployeeLogsViewProps {
  className?: string
}

export function EmployeeLogsView({ className = "" }: EmployeeLogsViewProps) {
  const [logs, setLogs] = useState<Log[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { toast } = useToast()

  const logsPerPage = 15

  // Fetch logs from API
  const fetchLogs = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      setError(null)

      const params: any = {
        offset: (currentPage - 1) * logsPerPage,
        limit: logsPerPage,
        sort_by: "created_at",
        sort_order: "DESC",
      }

      if (searchTerm.trim()) params.search = searchTerm.trim()
      if (dateFilter.from) params.date_from = dateFilter.from
      if (dateFilter.to) params.date_to = dateFilter.to

      const result = await apiService.fetchTransactions(params)

      if (result && Array.isArray(result.data)) {
        setLogs(result.data)
        setTotalLogs(result.total || result.data.length)
      }
    } catch (err: any) {
      console.error("[EmployeeLogs] Fetch error:", err)
      setError(err?.message || "Failed to load logs")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchTerm, dateFilter])

  // Initial load and filter changes
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Real-time updates
  useEffect(() => {
    pollingManager.initialize()

    const unsub1 = pollingManager.subscribeToUpdates(
      SOCKET_EVENTS.INVENTORY.LOG_CREATED,
      () => {
        if (currentPage === 1) {
          fetchLogs(true)
        }
      }
    )

    const unsub2 = pollingManager.subscribeToUpdates(
      "inventory:logs:refresh",
      () => fetchLogs(true)
    )

    return () => {
      unsub1?.()
      unsub2?.()
    }
  }, [fetchLogs, currentPage])

  // Export handler
  const handleExport = async () => {
    try {
      const allLogs = await apiService.fetchTransactions({ limit: 10000, offset: 0 })
      if (allLogs?.data && allLogs.data.length > 0) {
        exportLogsToXLSX(allLogs.data, { filename: `employee-logs-${new Date().toISOString().split("T")[0]}` })
        toast({ title: "Export Successful", description: "Logs exported to Excel" })
      } else {
        toast({ title: "No Data", description: "No logs to export", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Export Failed", description: "Could not export logs", variant: "destructive" })
    }
  }

  // Quick date filters
  const setQuickDate = (range: "today" | "week" | "month" | "clear") => {
    const now = new Date()
    const today = now.toISOString().split("T")[0] ?? ""
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? ""
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? ""
    
    switch (range) {
      case "today":
        setDateFilter({ from: today, to: today })
        break
      case "week":
        setDateFilter({ from: weekAgo, to: today })
        break
      case "month":
        setDateFilter({ from: monthAgo, to: today })
        break
      case "clear":
        setDateFilter({ from: "", to: "" })
        break
    }
    setCurrentPage(1)
  }

  // Activity icon based on details
  const getActivityIcon = (details?: string) => {
    if (!details) return "📋"
    const d = details.toLowerCase()
    if (d.includes("checkout")) return "📤"
    if (d.includes("checkin")) return "📥"
    if (d.includes("stock")) return "📦"
    if (d.includes("update")) return "✏️"
    return "📋"
  }

  // Activity color
  const getActivityVariant = (details?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!details) return "secondary"
    const d = details.toLowerCase()
    if (d.includes("checkout")) return "destructive"
    if (d.includes("checkin")) return "default"
    return "secondary"
  }

  // Format date/time
  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return "—"
    const d = new Date(date)
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    if (!time) return formatted
    const parts = time.split(":")
    const h = parts[0] || "0"
    const m = parts[1] || "00"
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    return `${formatted} ${hour % 12 || 12}:${m} ${ampm}`
  }

  const totalPages = Math.ceil(totalLogs / logsPerPage)
  const hasFilters = searchTerm || dateFilter.from || dateFilter.to

  // Sidebar content component (reused for mobile and desktop)
  const SidebarContent = () => (
    <div className="p-4 space-y-5">
      {/* Search */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Name, ID..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Quick Date Filters */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Filters</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant={dateFilter.from === new Date().toISOString().split("T")[0] && dateFilter.to === dateFilter.from ? "default" : "outline"} 
            size="sm" 
            onClick={() => setQuickDate("today")} 
            className="h-8 text-xs"
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuickDate("week")} 
            className="h-8 text-xs"
          >
            This Week
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuickDate("month")} 
            className="h-8 text-xs"
          >
            This Month
          </Button>
          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchTerm(""); setDateFilter({ from: "", to: "" }); setCurrentPage(1) }} 
              className="h-8 text-xs text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Range</h3>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input 
              type="date" 
              value={dateFilter.from} 
              onChange={(e) => { setDateFilter(p => ({ ...p, from: e.target.value })); setCurrentPage(1) }} 
              className="h-8 text-xs" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input 
              type="date" 
              value={dateFilter.to} 
              onChange={(e) => { setDateFilter(p => ({ ...p, to: e.target.value })); setCurrentPage(1) }} 
              className="h-8 text-xs" 
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchLogs()} 
            disabled={isLoading}
            className="w-full h-9 justify-start"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={logs.length === 0}
            className="w-full h-9 justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Logs</span>
          <Badge variant="secondary">{totalLogs}</Badge>
        </div>
        {hasFilters && (
          <p className="text-xs text-muted-foreground">
            Showing filtered results
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className={`flex min-h-[calc(100vh-5rem)] bg-card rounded-lg shadow-sm border ${className}`}>
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card border-r z-50 lg:hidden overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Filters</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Desktop Sidebar - Sticky */}
      <div className="hidden lg:flex lg:flex-col w-64 bg-card border-r shrink-0">
        <div className="sticky top-0 h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Sidebar Header */}
          <div className="p-4 border-b sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-medium text-foreground">Filters</h2>
            </div>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Activity Logs</h2>
            <Badge variant="outline" className="ml-1">{totalLogs}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchLogs()} className="mt-3">Retry</Button>
            </Card>
          ) : logs.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No logs found</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <Card
                  key={log.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { setSelectedLog(log); setIsDetailOpen(true) }}
                >
                  <div className="flex items-start gap-4">
                    {/* Activity Icon */}
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {getActivityIcon(log.details)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{log.username || "Unknown"}</span>
                        {log.id_number && (
                          <Badge variant="outline" className="text-xs">{log.id_number}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {log.details || log.purpose || "No details"}
                      </p>
                    </div>

                    {/* Time & Badge */}
                    <div className="text-right shrink-0">
                      <Badge variant={getActivityVariant(log.details)} className="text-xs mb-1.5">
                        #{log.id}
                      </Badge>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.log_date, log.log_time)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{getActivityIcon(selectedLog?.details)}</span>
              Log #{selectedLog?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedLog.username || "Unknown"}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {selectedLog.id_number && <span>ID: {selectedLog.id_number}</span>}
                    {selectedLog.id_barcode && <span>• Barcode: {selectedLog.id_barcode}</span>}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    Date & Time
                  </div>
                  <p className="font-medium">{formatDateTime(selectedLog.log_date, selectedLog.log_time)}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    Created
                  </div>
                  <p className="font-medium text-xs">
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              {/* Purpose */}
              {selectedLog.purpose && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs font-medium text-blue-500 mb-1">Purpose</p>
                  <p className="text-sm">{selectedLog.purpose}</p>
                </div>
              )}

              {/* Details */}
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Activity Details</p>
                <p className="text-sm">{selectedLog.details || "No details recorded"}</p>
              </div>

              {/* Item Numbers */}
              {selectedLog.item_no && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                    <Package className="w-3 h-3" />
                    Item Numbers
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.item_no.split(",").map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{item.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmployeeLogsView
