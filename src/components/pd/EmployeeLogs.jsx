import React, { useState, useEffect } from 'react'
import apiService from "../../utils/api/api-service"
import { EmployeeLogsSkeleton } from "../skeletons/ProcurementSkeletons"

function EmployeeLogs() {
  const [state, setState] = useState({
    logs: [],
    loading: true,
    initialLoading: true,
    error: null,
    searchTerm: "",
    dateFilter: { dateFrom: "", dateTo: "" },
    currentPage: 1,
    totalLogs: 0,
    filters: { hasDetails: false },
    visibleCount: 50,
    selectedLogs: [],
    showFilters: false
  })

  const logsPerPage = 10
  const { logs, loading, initialLoading, error, searchTerm, dateFilter, currentPage, totalLogs, filters, visibleCount, selectedLogs, showFilters } = state

  useEffect(() => {
    fetchEmployeeLogs()
  }, [currentPage, searchTerm, dateFilter, filters])

  const fetchEmployeeLogs = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const params = {
        offset: (currentPage - 1) * logsPerPage,
        limit: logsPerPage,
        sort_by: "created_at",
        sort_order: "DESC",
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(dateFilter.dateFrom && { date_from: dateFilter.dateFrom }),
        ...(dateFilter.dateTo && { date_to: dateFilter.dateTo }),
        ...(filters.hasDetails && { has_details: true })
      }

      const result = await apiService.employeeLogs.getEmployeeLogs(params)

      if (result.success) {
        setState(prev => ({
          ...prev,
          logs: result.data || [],
          totalLogs: result.total || 0,
          loading: false,
          initialLoading: false
        }))
      } else {
        throw new Error(result.message || "Failed to fetch employee logs")
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message,
        loading: false,
        initialLoading: false
      }))
      console.error("Employee logs fetch error:", err)
    }
  }

  const handleSearch = (e) => setState(prev => ({ ...prev, searchTerm: e.target.value, currentPage: 1 }))

  const handleDateFilterChange = (field, value) => setState(prev => ({
    ...prev,
    dateFilter: { ...prev.dateFilter, [field]: value },
    currentPage: 1
  }))

  const handleFilterChange = (field, value) => setState(prev => ({
    ...prev,
    filters: { ...prev.filters, [field]: value },
    currentPage: 1
  }))

  const clearFilters = () => setState(prev => ({
    ...prev,
    searchTerm: "",
    dateFilter: { dateFrom: "", dateTo: "" },
    filters: { hasDetails: false },
    currentPage: 1
  }))

  const toggleFilters = () => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))

  const handleSelectAll = (checked) => setState(prev => ({
    ...prev,
    selectedLogs: checked ? logs.slice(0, visibleCount).map(log => log.id) : []
  }))

  const handleLogSelect = (logId, checked) => setState(prev => ({
    ...prev,
    selectedLogs: checked
      ? [...prev.selectedLogs, logId]
      : prev.selectedLogs.filter(id => id !== logId)
  }))

  const handleBulkAction = async (action) => {
    if (selectedLogs.length === 0) return

    try {
      switch (action) {
        case 'markReviewed': console.log('Marking logs as reviewed:', selectedLogs); break
        case 'archive': console.log('Archiving logs:', selectedLogs); break
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedLogs.length} log(s)?`)) {
            console.log('Deleting logs:', selectedLogs)
          }
          break
        case 'export': exportData(logs.filter(log => selectedLogs.includes(log.id)), 'csv'); break
      }
      setState(prev => ({ ...prev, selectedLogs: [] }))
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  const exportLogs = (format) => exportData(logs.slice(0, visibleCount), format)

  const exportData = (data, format) => {
    if (format === 'csv') {
      const headers = ['ID', 'Username', 'Activity', 'Date', 'Time', 'Details', 'Created At']
      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          log.id,
          `"${log.username || 'N/A'}"`,
          `"${getActivityIcon(log.details)}"`,
          log.log_date || '',
          log.log_time || '',
          `"${log.details || ''}"`,
          log.created_at
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `employee_logs_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    }
  }

  const setTimeRange = (range) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const ranges = {
      today: { dateFrom: today, dateTo: today },
      week: { dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dateTo: today },
      month: { dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dateTo: today },
      clear: { dateFrom: "", dateTo: "" }
    }
    setState(prev => ({ ...prev, dateFilter: ranges[range], currentPage: 1 }))
  }

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    
    if (!timeString) return formattedDate
    
    // Convert to 12-hour format
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    
    return `${formattedDate} ${hour12}:${minutes} ${ampm}`
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

  const totalPages = Math.ceil(totalLogs / logsPerPage)
  const hasActiveFilters = searchTerm || dateFilter.dateFrom || dateFilter.dateTo || filters.hasDetails

  if (initialLoading) {
    return <EmployeeLogsSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-lg">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  Employee Activity Logs
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Monitor employee activities and transactions
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button 
                onClick={fetchEmployeeLogs} 
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-sm"
              >
                <span className="text-base">🔄</span>
                <span>Refresh</span>
              </button>
              <button 
                onClick={() => exportLogs('csv')} 
                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-sm"
              >
                <span className="text-base">📊</span>
                <span>CSV</span>
              </button>
              <button 
                onClick={() => exportLogs('pdf')} 
                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-sm"
              >
                <span className="text-base">📄</span>
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search logs by activity, details..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={toggleFilters}
              className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-1.5 text-sm ${
                showFilters 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-base">🎛️</span>
              <span>Filters</span>
              {hasActiveFilters && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {[searchTerm, dateFilter.dateFrom, dateFilter.dateTo, filters.hasDetails].filter(Boolean).length}
              </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-medium flex items-center gap-1.5 text-sm"
              >
                <span>✕</span>
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
                  <input
                    type="date"
                    value={dateFilter.dateFrom}
                    onChange={(e) => handleDateFilterChange("dateFrom", e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
                  <input
                    type="date"
                    value={dateFilter.dateTo}
                    onChange={(e) => handleDateFilterChange("dateTo", e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Quick:</span>
                <button onClick={() => setTimeRange('today')} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-all text-xs font-medium">Today</button>
                <button onClick={() => setTimeRange('week')} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-all text-xs font-medium">7 Days</button>
                <button onClick={() => setTimeRange('month')} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-all text-xs font-medium">30 Days</button>
                <button onClick={() => setTimeRange('clear')} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-all text-xs font-medium">Clear</button>
                
                <div className="ml-auto">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasDetails}
                      onChange={(e) => handleFilterChange("hasDetails", e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Details only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary Bar */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            <span className="font-bold text-blue-600 dark:text-blue-400">{logs.length}</span> of <span className="font-bold">{totalLogs}</span>
            {totalPages > 1 && <span className="text-gray-500"> • Page {currentPage}/{totalPages}</span>}
          </span>
          {loading && (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <div className="animate-spin w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-xs font-medium">Loading...</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-3 shadow-md">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300 text-sm">Error Loading Logs</h3>
                <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedLogs.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 rounded-lg p-3 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">{selectedLogs.length}</span>
                </div>
                <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                  {selectedLogs.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => handleBulkAction('markReviewed')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-all shadow-sm font-medium">✓ Review</button>
                <button onClick={() => handleBulkAction('archive')} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md transition-all shadow-sm font-medium">📦 Archive</button>
                <button onClick={() => handleBulkAction('export')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-all shadow-sm font-medium">📤 Export</button>
                <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-all shadow-sm font-medium">🗑️ Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLogs.length === logs.slice(0, visibleCount).length && logs.slice(0, visibleCount).length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Log no</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {!loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-3xl">📭</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">No logs found</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Try adjusting your filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.slice(0, visibleCount).map((log, index) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLogs.includes(log.id)}
                          onChange={(e) => handleLogSelect(log.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{log.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{log.username || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-100 font-medium text-sm">{formatDateTime(log.log_date, log.log_time)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          {log.details ? (
                            <p className="text-gray-700 dark:text-gray-300 text-xs break-words line-clamp-2 group-hover:line-clamp-none transition-all">
                              {log.details}
                            </p>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic text-xs">No details</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {logs.length > visibleCount && (
            <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setState(prev => ({ ...prev, visibleCount: Math.min(prev.visibleCount + 20, logs.length) }))}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-sm hover:shadow-md font-medium text-sm"
              >
                Load More ({Math.min(20, logs.length - visibleCount)} more)
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setState(prev => ({ ...prev, currentPage: Math.max(prev.currentPage - 1, 1) }))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm text-sm"
            >
              ← Prev
            </button>
            
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setState(prev => ({ ...prev, currentPage: pageNum }))}
                    disabled={loading}
                    className={`w-9 h-9 rounded-lg transition-all font-semibold shadow-sm text-sm ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105"
                        : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setState(prev => ({ ...prev, currentPage: Math.min(prev.currentPage + 1, totalPages) }))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm text-sm"
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default EmployeeLogs