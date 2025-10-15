import React, { useState, useEffect } from 'react'
import { useAuth } from "../../contexts/AuthContext"
import apiService from "../../utils/api/api-service"
import { EmployeeLogsSkeleton } from "../skeletons/ProcurementSkeletons"
import { useRealtimeEvents } from "../../hooks/use-realtime"

function EmployeeLogs() {
  const { isDarkMode } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState({
    dateFrom: "",
    dateTo: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [filters, setFilters] = useState({
    username: "",
    hasDetails: false,
    activityType: ""
  })
  const [visibleCount, setVisibleCount] = useState(50)
  const [editingLog, setEditingLog] = useState(null)
  const [editForm, setEditForm] = useState({ details: '', adminNotes: '' })
  const [activityFilter, setActivityFilter] = useState('all')
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false)

  const logsPerPage = 50

  useEffect(() => {
    fetchEmployeeLogs()
  }, [currentPage, searchTerm, dateFilter, filters])

  // Real-time updates for new logs
  useRealtimeEvents({
    'log_created': () => {
      console.log('[EmployeeLogs] New log created, refreshing...')
      fetchEmployeeLogs()
    },
    'log_updated': () => {
      console.log('[EmployeeLogs] Log updated, refreshing...')
      fetchEmployeeLogs()
    },
    'log_deleted': () => {
      console.log('[EmployeeLogs] Log deleted, refreshing...')
      fetchEmployeeLogs()
    }
  }, [], 'http://localhost:3000')

  const fetchEmployeeLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        offset: (currentPage - 1) * logsPerPage,
        limit: logsPerPage,
        sort_by: "created_at",
        sort_order: "DESC"
      }

      // Add search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      // Add date filters
      if (dateFilter.dateFrom) {
        params.date_from = dateFilter.dateFrom
      }
      if (dateFilter.dateTo) {
        params.date_to = dateFilter.dateTo
      }

      // Add username filter
      if (filters.username.trim()) {
        params.username = filters.username.trim()
      }

      // Add activity type filter
      if (filters.activityType) {
        params.activity_type = filters.activityType
      }

      // Add details filter
      if (filters.hasDetails) {
        params.has_details = true
      }

      const result = await apiService.employeeLogs.getEmployeeLogs(params)
      
      if (result.success) {
        setLogs(result.data || [])
        setTotalLogs(result.total || 0)
      } else {
        throw new Error(result.message || "Failed to fetch employee logs")
      }

    } catch (err) {
      setError(err.message)
      console.error("Employee logs fetch error:", err)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDateFilter({ dateFrom: "", dateTo: "" })
    setFilters({ username: "", hasDetails: false, activityType: "" })
    setCurrentPage(1)
  }

  const toggleRowExpansion = (logId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const toggleLogSelection = (logId) => {
    setSelectedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    const visibleLogIds = filteredLogs.slice(0, visibleCount).map(log => log.id)
    const allSelected = visibleLogIds.every(id => selectedLogs.has(id))
    
    if (allSelected) {
      // Deselect all visible logs
      setSelectedLogs(prev => {
        const newSet = new Set(prev)
        visibleLogIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Select all visible logs
      setSelectedLogs(prev => new Set([...prev, ...visibleLogIds]))
    }
  }

  const exportLogs = (format = 'csv') => {
    const logsToExport = selectedLogs.size > 0 
      ? logs.filter(log => selectedLogs.has(log.id))
      : logs

    if (logsToExport.length === 0) return

    if (format === 'csv') {
      const headers = ['ID', 'Username', 'Activity Date', 'Activity Time', 'Details', 'Created At']
      const csvContent = [
        headers.join(','),
        ...logsToExport.map(log => [
          log.id,
          `"${log.username || 'N/A'}"`,
          log.log_date || '',
          log.log_time || '',
          `"${log.details || ''}"`,
          log.created_at
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  const deleteSelectedLogs = async () => {
    if (selectedLogs.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedLogs.size} log(s)? This action cannot be undone.`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedLogs).map(logId =>
        apiService.employeeLogs.deleteLog(logId)
      )
      
      await Promise.all(deletePromises)
      setSelectedLogs(new Set())
      setBulkActionMode(false)
      fetchEmployeeLogs() // Refresh the list
    } catch (error) {
      console.error('Error deleting logs:', error)
      alert('Error deleting logs. Please try again.')
    }
  }

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A"
    
    const date = new Date(dateString)
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    
    return timeString ? `${formattedDate} ${timeString}` : formattedDate
  }

  const getActivityIcon = (details) => {
    if (!details) return "📝"
    
    const detailsLower = details.toLowerCase()
    if (detailsLower.includes("checkout")) return "📤"
    if (detailsLower.includes("checkin")) return "📥"
    if (detailsLower.includes("stock")) return "📦"
    if (detailsLower.includes("update")) return "✏️"
    if (detailsLower.includes("create")) return "➕"
    if (detailsLower.includes("delete")) return "🗑️"
    
    return "📋"
  }

  const getActivityType = (details) => {
    if (!details) return "other"
    
    const detailsLower = details.toLowerCase()
    if (detailsLower.includes("checkout")) return "checkout"
    if (detailsLower.includes("checkin")) return "checkin"
    if (detailsLower.includes("stock")) return "stock"
    if (detailsLower.includes("update")) return "update"
    if (detailsLower.includes("create")) return "create"
    if (detailsLower.includes("delete")) return "delete"
    
    return "other"
  }

  // Edit functionality
  const startEditingLog = (log) => {
    setEditingLog(log.id)
    setEditForm({
      details: log.details || '',
      adminNotes: log.admin_notes || ''
    })
  }

  const cancelEditing = () => {
    setEditingLog(null)
    setEditForm({ details: '', adminNotes: '' })
  }

  const saveLogEdit = async () => {
    if (!editingLog) return

    try {
      setLoading(true)
      await apiService.employeeLogs.updateLog(editingLog, {
        details: editForm.details,
        admin_notes: editForm.adminNotes
      })
      
      setEditingLog(null)
      setEditForm({ details: '', adminNotes: '' })
      fetchEmployeeLogs() // Refresh the list
    } catch (error) {
      console.error('Error updating log:', error)
      setError('Failed to update log. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Flag suspicious activity
  const toggleFlagLog = async (logId, currentlyFlagged) => {
    try {
      await apiService.employeeLogs.flagLog(logId, !currentlyFlagged)
      fetchEmployeeLogs() // Refresh to show updated flag status
    } catch (error) {
      console.error('Error flagging log:', error)
      setError('Failed to flag log. Please try again.')
    }
  }

  // Individual delete
  const deleteSingleLog = async (logId) => {
    if (!confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await apiService.employeeLogs.deleteLog(logId)
      fetchEmployeeLogs() // Refresh the list
    } catch (error) {
      console.error('Error deleting log:', error)
      setError('Failed to delete log. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalLogs / logsPerPage)

  if (initialLoading) {
    return <EmployeeLogsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Employee Activity Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track employee activities and transactions
          </p>
        </div>
        <div className="flex gap-2">
          {bulkActionMode && selectedLogs.size > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                Cancel ({selectedLogs.size} selected)
              </button>
              <button
                onClick={() => exportLogs('csv')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                📊 Export CSV
              </button>
              <button
                onClick={deleteSelectedLogs}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                🗑️ Delete Selected
              </button>
            </>
          )}
          {!bulkActionMode && (
            <>
              <button
                onClick={() => setBulkActionMode(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                ⚡ Bulk Actions
              </button>
              <button
                onClick={() => exportLogs('csv')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                📊 Export All
              </button>
            </>
          )}
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            disabled={!searchTerm && !dateFilter.dateFrom && !dateFilter.dateTo && !filters.username && !filters.hasDetails && !filters.activityType}
          >
            Clear Filters
          </button>
          <button
            onClick={fetchEmployeeLogs}
            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-gray-700/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Username Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => handleFilterChange("username", e.target.value)}
              placeholder="Filter by username..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFilter.dateFrom}
              onChange={(e) => handleDateFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateFilter.dateTo}
              onChange={(e) => handleDateFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
          </div>

          {/* Activity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Activity Type
            </label>
            <select
              value={filters.activityType}
              onChange={(e) => handleFilterChange("activityType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            >
              <option value="">All Activities</option>
              <option value="checkout">📤 Checkout</option>
              <option value="checkin">📥 Check-in</option>
              <option value="stock">📦 Stock Update</option>
              <option value="update">✏️ Update</option>
              <option value="create">➕ Create</option>
              <option value="delete">🗑️ Delete</option>
              <option value="other">📋 Other</option>
            </select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.hasDetails}
              onChange={(e) => handleFilterChange("hasDetails", e.target.checked)}
              className="mr-2 rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show only logs with details</span>
          </label>
          
          {/* Activity Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Type:</label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="checkout">Check Out</option>
              <option value="checkin">Check In</option>
              <option value="stock">Stock Updates</option>
              <option value="create">Creations</option>
              <option value="update">Updates</option>
              <option value="delete">Deletions</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Flagged Filter */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showFlaggedOnly}
              onChange={(e) => setShowFlaggedOnly(e.target.checked)}
              className="mr-2 rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show only flagged logs</span>
          </label>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {filteredLogs.slice(0, visibleCount).length} of {filteredLogs.length} logs
          {filteredLogs.length !== logs.length && ` (filtered from ${logs.length} total)`}
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </span>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-zinc-600 dark:border-zinc-400 border-t-transparent rounded-full"></div>
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/10 dark:bg-black/20">
              <tr className="border-b border-gray-300/20 dark:border-gray-700/20">
                {bulkActionMode && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredLogs.slice(0, visibleCount).every(log => selectedLogs.has(log.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Activity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Details</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
              {!loading && filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={bulkActionMode ? "6" : "5"} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {logs.length === 0 ? 'No employee logs found' : 'No logs match the current filters'}
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, visibleCount).map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`hover:bg-white/5 dark:hover:bg-black/10 transition-colors cursor-pointer ${
                        expandedRows.has(log.id) ? 'bg-white/10 dark:bg-black/20' : ''
                      } ${log.is_flagged ? 'bg-red-50/50 dark:bg-red-900/10 border-l-4 border-red-500' : ''}`}
                      onClick={() => toggleRowExpansion(log.id)}
                    >
                      {bulkActionMode && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLogs.has(log.id)}
                            onChange={() => toggleLogSelection(log.id)}
                            className="rounded border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/20 text-zinc-600 focus:ring-zinc-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getActivityIcon(log.details)}</span>
                          {log.is_flagged && <span className="text-red-500" title="Flagged as suspicious">🚩</span>}
                          <span className="text-xs text-gray-500 dark:text-gray-400">ID: {log.id}</span>
                          <span className={`text-xs ml-2 transition-transform ${expandedRows.has(log.id) ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {log.username || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 dark:text-gray-300">
                          {formatDateTime(log.log_date, log.log_time)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 dark:text-gray-300 max-w-md truncate">
                          {log.details ? log.details : (
                            <span className="text-gray-500 dark:text-gray-400 italic">No details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleRowExpansion(log.id)}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => startEditingLog(log)}
                            className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
                            title="Edit Log"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => toggleFlagLog(log.id, log.is_flagged)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              log.is_flagged 
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30'
                                : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-900/30'
                            }`}
                            title={log.is_flagged ? "Unflag as suspicious" : "Flag as suspicious"}
                          >
                            🚩
                          </button>
                          <button
                            onClick={() => deleteSingleLog(log.id)}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Log"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(log.id) && (
                      <tr className="bg-white/5 dark:bg-black/10">
                        <td colSpan={bulkActionMode ? "6" : "5"} className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Detailed Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Log ID:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{log.id}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Username:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{log.username || "N/A"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Activity Date:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{log.log_date || "N/A"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Activity Time:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{log.log_time || "N/A"}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Created At:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
                                <span className="ml-2 text-gray-800 dark:text-gray-200">{log.updated_at ? new Date(log.updated_at).toLocaleString() : "N/A"}</span>
                              </div>
                            </div>
                            {log.details && (
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Full Details:</span>
                                <div className="mt-1 p-3 bg-white/20 dark:bg-black/20 rounded-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                  {log.details}
                                </div>
                              </div>
                            )}
                            {log.admin_notes && (
                              <div>
                                <span className="font-medium text-amber-600 dark:text-amber-400">Admin Notes:</span>
                                <div className="mt-1 p-3 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                  {log.admin_notes}
                                </div>
                              </div>
                            )}
                            {log.is_flagged && (
                              <div className="flex items-center gap-2 p-3 bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <span className="text-red-500">🚩</span>
                                <span className="font-medium text-red-700 dark:text-red-300">This log has been flagged as suspicious</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {filteredLogs.length > visibleCount && (
          <div className="p-4 text-center border-t border-gray-300/20 dark:border-gray-700/20">
            <button
              onClick={() => setVisibleCount((c) => Math.min(c + 20, filteredLogs.length))}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Load more ({Math.min(20, filteredLogs.length - visibleCount)})
            </button>
          </div>
        )}
      </div>

      {/* Edit Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Edit Employee Log</h3>
                <button
                  onClick={cancelEditing}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Log Details
                  </label>
                  <textarea
                    value={editForm.details}
                    onChange={(e) => setEditForm(prev => ({ ...prev, details: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-vertical"
                    placeholder="Enter log details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={editForm.adminNotes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-vertical"
                    placeholder="Add administrative notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelEditing}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLogEdit}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-zinc-600 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? "bg-zinc-600 dark:bg-zinc-700 text-white"
                      : "bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default EmployeeLogs