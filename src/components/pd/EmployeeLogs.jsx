import React, { useState, useEffect } from 'react'
import apiService from "../../utils/api/api-service"
import { getStoredToken } from "../../utils/auth"
import { ModalPortal } from "./shared"
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
    showFilters: false,
    showDetailedView: false,
    selectedLog: null,
    employeeDetails: null,
    associatedItems: [],
    profileMap: {}, // uid -> url or null
    logProfileMap: {}, // logId -> url or null
    detailsLoading: false
  })

  const logsPerPage = 10
  const { logs, loading, initialLoading, error, searchTerm, dateFilter, currentPage, totalLogs, filters, visibleCount, selectedLogs, showFilters, showDetailedView, selectedLog, employeeDetails, associatedItems, detailsLoading } = state

  // Preload profiles for visible logs (cache by uid and map to log id)
  useEffect(() => {
    let cancelled = false

    const preload = async () => {
      if (!logs || logs.length === 0) return

      const visible = logs.slice(0, visibleCount)
      // Copy maps from state to update
      const profileMap = { ...(state.profileMap || {}) }
      const logProfileMap = { ...(state.logProfileMap || {}) }

      for (const log of visible) {
        if (cancelled) return

        // Skip if we already have a profile URL for this log
        if (logProfileMap[log.id] !== undefined) continue

        try {
          // Resolve employee to get uid (uses existing helper)
          const employee = await fetchEmployeeDetails(log)
          if (employee && employee.id) {
            const uid = employee.id

            // If we've already fetched for this uid, reuse
            if (profileMap[uid] !== undefined) {
              logProfileMap[log.id] = profileMap[uid]
              continue
            }

            // Try profile service (returns cached blob/url)
            try {
              const profileResult = await apiService.profiles.getProfileByUid(uid)
              if (profileResult && profileResult.success && profileResult.url) {
                profileMap[uid] = profileResult.url
                logProfileMap[log.id] = profileResult.url
                continue
              }
            } catch (e) {
              // ignore and try fallback
            }

            // Fallback: check existence and construct URL
            try {
              const hasProfile = await apiService.profiles.hasProfileByUid(uid)
              if (hasProfile) {
                const profileUrl = apiService.profiles.getProfileUrlByUid(uid)
                try {
                  const resp = await fetch(profileUrl, { method: 'GET', headers: { Authorization: `Bearer ${getStoredToken()}` } })
                  if (resp.ok) {
                    profileMap[uid] = profileUrl
                    logProfileMap[log.id] = profileUrl
                    continue
                  }
                } catch (e) {
                  // network failed, mark as null
                }
              }
            } catch (e) {
              // ignore
            }

            // No profile found
            profileMap[uid] = null
            logProfileMap[log.id] = null
          } else {
            // couldn't resolve employee, mark as null to avoid retrying constantly
            logProfileMap[log.id] = null
          }
        } catch (err) {
          console.warn('Preload profile failed for log', log.id, err)
          logProfileMap[log.id] = null
        }
      }

      if (!cancelled) {
        setState(prev => ({ ...prev, profileMap, logProfileMap }))
      }
    }

    preload()

    return () => { cancelled = true }
  }, [logs, visibleCount])

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
      setState(prev => ({ ...prev, loading: true }))

      switch (action) {
        case 'markReviewed':
          for (const logId of selectedLogs) {
            await apiService.employeeLogs.updateEmployeeLog(logId, {
              details: `${logs.find(log => log.id === logId)?.details || ''} [REVIEWED]`.trim()
            })
          }
          break

        case 'archive':
          for (const logId of selectedLogs) {
            await apiService.employeeLogs.updateEmployeeLog(logId, {
              details: `${logs.find(log => log.id === logId)?.details || ''} [ARCHIVED]`.trim()
            })
          }
          break

        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedLogs.length} log(s)? This action cannot be undone.`)) {
            for (const logId of selectedLogs) {
              await apiService.employeeLogs.deleteEmployeeLog(logId)
            }
          } else {
            setState(prev => ({ ...prev, loading: false }))
            return
          }
          break

        case 'export':
          exportLogs('csv')
          setState(prev => ({ ...prev, loading: false }))
          return
      }

      await fetchEmployeeLogs()
      setState(prev => ({ ...prev, selectedLogs: [], loading: false }))
    } catch (error) {
      console.error('Bulk action failed:', error)
      setState(prev => ({ ...prev, loading: false }))
      alert(`Failed to ${action} logs: ${error.message}`)
    }
  }

  const exportLogs = async (format) => {
    try {
      setState(prev => ({ ...prev, loading: true }))

      let logsToExport = []

      if (selectedLogs.length > 0) {
        logsToExport = logs.filter(log => selectedLogs.includes(log.id))
      } else {
        const params = {
          limit: 10000,
          sort_by: "created_at",
          sort_order: "DESC",
          ...(searchTerm.trim() && { search: searchTerm.trim() }),
          ...(dateFilter.dateFrom && { date_from: dateFilter.dateFrom }),
          ...(dateFilter.dateTo && { date_to: dateFilter.dateTo }),
          ...(filters.hasDetails && { has_details: true })
        }

        const result = await apiService.employeeLogs.getEmployeeLogs(params)
        if (result.success) {
          logsToExport = result.data || []
        } else {
          throw new Error(result.message || "Failed to fetch logs for export")
        }
      }

      exportData(logsToExport, format)
      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      console.error('Export failed:', error)
      setState(prev => ({ ...prev, loading: false }))
      alert(`Export failed: ${error.message}`)
    }
  }

  const exportData = (data, format) => {
    const filename = `employee_logs_${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      const headers = ['ID', 'Username', 'ID Number', 'ID Barcode', 'Activity', 'Date', 'Time', 'Details', 'Item Numbers', 'Created At']
      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          log.id,
          `"${log.username || 'N/A'}"`,
          `"${log.id_number || 'N/A'}"`,
          `"${log.id_barcode || 'N/A'}"`,
          `"${getActivityIcon(log.details)}"`,
          log.log_date || '',
          log.log_time || '',
          `"${log.details || ''}"`,
          `"${log.item_no || ''}"`,
          log.created_at
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.csv`
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

  const getActivityColor = (details) => {
    if (!details) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    const detailsLower = details.toLowerCase()
    if (detailsLower.includes("checkout")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
    if (detailsLower.includes("checkin")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    if (detailsLower.includes("stock")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
    if (detailsLower.includes("update")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
    if (detailsLower.includes("create")) return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
    if (detailsLower.includes("delete")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }

  const renderDetailsContent = (log, items) => {
    const detailsText = log?.details ? log.details.trim() : ''
    const lowerDetails = detailsText.toLowerCase()
    const hasCheckoutText = lowerDetails.includes('checkout')
    // If there are associated items, render a full, detailed item list inline with details.
    if (items && items.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📦</span>
            </div>
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100">{items.length} Item{items.length > 1 ? 's' : ''} Referenced</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Below are the referenced item(s) with full metadata.</div>
            </div>
          </div>

          <div className="grid gap-3">
            {items.map((it) => (
              <div key={it.item_no || Math.random()} className="bg-linear-to-r from-slate-50 to-purple-50 dark:from-slate-900/50 dark:to-purple-900/20 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">#{it.item_no}</span>
                      <div className="font-bold text-slate-900 dark:text-white">{it.item_name || 'Unknown item'}</div>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {it.brand && <span className="font-medium">{it.brand}</span>}
                      {it.location && <span className="ml-2">• {it.location}</span>}
                      {it.category && <span className="ml-2">• {it.category}</span>}
                    </div>
                    {it.description && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{it.description}</div>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">₱{it.price_per_unit ? Number(it.price_per_unit).toFixed(2) : '0.00'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">per unit</div>
                    {it.quantity && <div className="text-xs text-slate-500 mt-1">Qty: {it.quantity}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {detailsText !== '' && !hasCheckoutText && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-700 dark:text-slate-300">{detailsText}</div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="text-sm text-slate-700 dark:text-slate-300">{log.details || 'No details available'}</div>
    )
  }

  const fetchEmployeeDetails = async (log) => {
    try {
      let employeeResult = null
      
      if (log.username && log.username !== 'N/A' && log.username.trim() !== '') {
        const searchResult = await apiService.employees.getEmployees({ 
          search: log.username.trim(),
          limit: 1 
        })
        if (searchResult.success && searchResult.employees.length > 0) {
          employeeResult = searchResult.employees[0]
        }
      }
      
      if (!employeeResult && log.id_number && log.id_number.trim() !== '') {
        const searchResult = await apiService.employees.getEmployees({ 
          search: log.id_number.trim(),
          limit: 1 
        })
        if (searchResult.success && searchResult.employees.length > 0) {
          employeeResult = searchResult.employees[0]
        }
      }
      
      if (!employeeResult && log.id_barcode && log.id_barcode.trim() !== '') {
        const searchResult = await apiService.employees.getEmployees({ 
          search: log.id_barcode.trim(),
          limit: 1 
        })
        if (searchResult.success && searchResult.employees.length > 0) {
          employeeResult = searchResult.employees[0]
        }
      }
      
      return employeeResult
    } catch (error) {
      console.error('Error fetching employee details:', error)
      return null
    }
  }

  const fetchAssociatedItems = async (itemNos) => {
    if (!itemNos || itemNos.trim() === '') return []
    
    try {
      // Accept multiple formats for quantity, e.g. "123:2", "123x2", "123(2)" or just "123"
      const tokens = itemNos.split(';').map(t => t.trim()).filter(t => t !== '')
      if (tokens.length === 0) return []

      const parsed = tokens.map(tok => {
        let itemNo = tok
        let qty = 1

        // 1) colon format: 123:2
        if (tok.includes(':')) {
          const [a, b] = tok.split(':').map(s => s.trim())
          itemNo = a
          qty = parseInt(b, 10) || 1
        }
        // 2) x format: 123x2 or 123X2
        else if (tok.toLowerCase().includes('x')) {
          const parts = tok.toLowerCase().split('x').map(s => s.trim())
          itemNo = parts[0]
          qty = parseInt(parts[1], 10) || 1
        }
        // 3) parentheses: 123(2)
        else {
          const m = tok.match(/^(.*)\((\d+)\)\s*$/)
          if (m) {
            itemNo = m[1].trim()
            qty = parseInt(m[2], 10) || 1
          }
        }

        return { itemNo, qty }
      })

      const promises = parsed.map(p => apiService.items.getItem(p.itemNo).then(res => ({ res, qty: p.qty })).catch(err => ({ res: { success: false, error: err }, qty: p.qty })))
      const results = await Promise.all(promises)

      // Attach quantity to each successful item result
      return results
        .filter(r => r && r.res && r.res.success)
        .map(r => ({ ...(r.res.data || {}), quantity: r.qty }))
    } catch (error) {
      console.error('Error fetching associated items:', error)
      return []
    }
  }

  const openDetailedView = async (log) => {
    setState(prev => ({ ...prev, showDetailedView: true, selectedLog: log, detailsLoading: true, employeeDetails: null, associatedItems: [] }))

    try {
      const [employeeResult, associatedItems] = await Promise.all([
        fetchEmployeeDetails(log),
        fetchAssociatedItems(log.item_no)
      ])

      let finalEmployee = employeeResult
      try {
        if (!finalEmployee) finalEmployee = null
        if (finalEmployee && !finalEmployee.profilePicture && finalEmployee.id) {
          // Follow HR pattern: try the profile service helper which returns a cached blob/url when available
          try {
            const profileResult = await apiService.profiles.getProfileByUid(finalEmployee.id)
            if (profileResult && profileResult.success && profileResult.url) {
              finalEmployee = { ...finalEmployee, profilePicture: profileResult.url }
            } else {
              // Fallback: check info endpoint then construct direct profile URL and verify it
              const hasProfile = await apiService.profiles.hasProfileByUid(finalEmployee.id)
              if (hasProfile) {
                const profileUrl = apiService.profiles.getProfileUrlByUid(finalEmployee.id)
                try {
                  const resp = await fetch(profileUrl, { method: 'GET', headers: { Authorization: `Bearer ${getStoredToken()}` } })
                  if (resp.ok) {
                    finalEmployee = { ...finalEmployee, profilePicture: profileUrl }
                  }
                } catch (e) {
                  console.warn('Profile image fetch failed (fallback):', e)
                }
              }
            }
          } catch (e) {
            console.warn('Profile image lookup failed:', e)
          }
        }
      } catch (err) {
        console.warn('Profile picture lookup failed:', err)
      }

      setState(prev => ({ 
        ...prev, 
        employeeDetails: finalEmployee, 
        associatedItems, 
        detailsLoading: false 
      }))
    } catch (error) {
      console.error('Error loading detailed view:', error)
      setState(prev => ({ ...prev, detailsLoading: false }))
    }
  }

  const closeDetailedView = () => {
    setState(prev => ({ 
      ...prev, 
      showDetailedView: false, 
      selectedLog: null, 
      employeeDetails: null, 
      associatedItems: [] 
    }))
  }

  const totalPages = Math.ceil(totalLogs / logsPerPage)
  const hasActiveFilters = searchTerm || dateFilter.dateFrom || dateFilter.dateTo || filters.hasDetails

  if (initialLoading) {
    return <EmployeeLogsSkeleton />
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-linear-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employee Activity Logs</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Track and manage employee activities</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button 
                onClick={fetchEmployeeLogs} 
                disabled={loading}
                className="px-4 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <button 
                onClick={() => exportLogs('csv')} 
                className="px-4 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search by name, ID number, or barcode..."
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              onClick={toggleFilters}
              className={`px-5 py-3 rounded-xl transition-all font-semibold flex items-center gap-2 ${
                showFilters 
                  ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  {[searchTerm, dateFilter.dateFrom, dateFilter.dateTo, filters.hasDetails].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-5 py-3 bg-linear-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-700 dark:text-red-300 rounded-xl hover:from-red-200 hover:to-rose-200 dark:hover:from-red-900/50 dark:hover:to-rose-900/50 transition-all font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Clear All</span>
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Date From</label>
                  <input
                    type="date"
                    value={dateFilter.dateFrom}
                    onChange={(e) => handleDateFilterChange("dateFrom", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Date To</label>
                  <input
                    type="date"
                    value={dateFilter.dateTo}
                    onChange={(e) => handleDateFilterChange("dateTo", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Select:</span>
                <button onClick={() => setTimeRange('today')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-all font-medium">Today</button>
                <button onClick={() => setTimeRange('week')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-all font-medium">Last 7 Days</button>
                <button onClick={() => setTimeRange('month')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-all font-medium">Last 30 Days</button>
                
                <div className="ml-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasDetails}
                      onChange={(e) => handleFilterChange("hasDetails", e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Show logs with details only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Showing <span className="text-blue-600 dark:text-blue-400 font-bold">{logs.length}</span> of <span className="font-bold">{totalLogs}</span> logs
              {totalPages > 1 && <span className="text-slate-500 ml-1">• Page {currentPage} of {totalPages}</span>}
            </span>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium">Loading...</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-linear-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-l-4 border-red-500 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-800 dark:text-red-300 text-base">Error Loading Logs</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedLogs.length > 0 && (
          <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-l-4 border-blue-600 rounded-2xl p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">{selectedLogs.length}</span>
                </div>
                <div>
                  <span className="font-bold text-blue-900 dark:text-blue-100 text-base">{selectedLogs.length} log{selectedLogs.length > 1 ? 's' : ''} selected</span>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Choose an action to apply</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleBulkAction('markReviewed')} className="px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all shadow-md font-semibold text-sm">✓ Mark Reviewed</button>
                <button onClick={() => handleBulkAction('archive')} className="px-4 py-2 bg-linear-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white rounded-lg transition-all shadow-md font-semibold text-sm">📦 Archive</button>
                <button onClick={() => handleBulkAction('export')} className="px-4 py-2 bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg transition-all shadow-md font-semibold text-sm">📤 Export</button>
                <button onClick={() => handleBulkAction('delete')} className="px-4 py-2 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg transition-all shadow-md font-semibold text-sm">🗑️ Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Grid */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-slate-100 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedLogs.length === logs.slice(0, visibleCount).length && logs.slice(0, visibleCount).length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {!loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-lg">No logs found</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.slice(0, visibleCount).map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => openDetailedView(log)} 
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-all duration-200 cursor-pointer group"
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedLogs.includes(log.id)} 
                          onChange={(e) => handleLogSelect(log.id, e.target.checked)} 
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getActivityColor(log.details)} font-semibold text-sm`}>
                          <span className="text-lg">{getActivityIcon(log.details)}</span>
                          <span className="font-mono text-xs opacity-75">#{log.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shadow-md bg-linear-to-br from-blue-500 to-indigo-500">
                            {state.logProfileMap && state.logProfileMap[log.id] ? (
                              <img src={state.logProfileMap[log.id]} alt={log.username || 'profile'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-base">{(log.username || 'N')[0].toUpperCase()}</div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{log.username || 'N/A'}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {log.id_number && (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono">ID: {log.id_number}</span>
                              )}
                              {log.id_barcode && (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono">BC: {log.id_barcode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-900 dark:text-white">{formatDateTime(log.log_date, log.log_time)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Created: {new Date(log.created_at).toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <div className="text-sm text-slate-700 dark:text-slate-300 truncate group-hover:text-clip">
                          {log.details || <span className="text-slate-400 italic">No details</span>}
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
            <div className="p-4 text-center border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setState(prev => ({ ...prev, visibleCount: Math.min(prev.visibleCount + 20, logs.length) }))}
                className="px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-semibold"
              >
                Load More ({Math.min(20, logs.length - visibleCount)} more)
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => setState(prev => ({ ...prev, currentPage: Math.max(prev.currentPage - 1, 1) }))}
              disabled={currentPage === 1 || loading}
              className="px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg"
            >
              ← Previous
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setState(prev => ({ ...prev, currentPage: pageNum }))}
                    disabled={loading}
                    className={`w-12 h-12 rounded-xl transition-all font-bold shadow-md text-sm ${
                      currentPage === pageNum
                        ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-110"
                        : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
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
              className="px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg"
            >
              Next →
            </button>
          </div>
        )}

      </div>

      {/* Detailed View Modal */}
      {showDetailedView && selectedLog && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-9999 p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-200 dark:border-slate-700 animate-scaleIn">
              {/* Modal Header */}
              <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-2xl">Activity Log Details</h3>
                      <p className="text-blue-100 text-sm mt-1">Log ID: #{selectedLog.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={closeDetailedView} 
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {detailsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full"></div>
                    <span className="mt-4 text-slate-600 dark:text-slate-300 font-medium">Loading details...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employee Card */}
                    <div className="col-span-1">
                      <div className="bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-600 shadow-lg">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-28 h-28 rounded-full bg-linear-to-br from-blue-500 to-indigo-500 overflow-hidden shadow-xl ring-4 ring-white dark:ring-slate-800">
                            {employeeDetails && employeeDetails.profilePicture ? (
                              <img src={employeeDetails.profilePicture} alt={employeeDetails.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl text-white">
                                {(selectedLog.username || 'N')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <h4 className="mt-4 font-bold text-slate-900 dark:text-white text-xl">
                            {employeeDetails ? employeeDetails.fullName : (selectedLog.username || 'N/A')}
                          </h4>
                          {employeeDetails && (
                            <>
                              <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">{employeeDetails.position}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{employeeDetails.department}</p>
                            </>
                          )}
                          
                          <div className="mt-4 w-full space-y-2 text-sm">
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">ID Number</div>
                              <div className="text-slate-900 dark:text-white font-mono font-semibold mt-1">
                                {employeeDetails?.id_number || selectedLog.id_number || '—'}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Barcode</div>
                              <div className="text-slate-900 dark:text-white font-mono font-semibold mt-1">
                                {employeeDetails?.id_barcode || selectedLog.id_barcode || '—'}
                              </div>
                            </div>
                            {employeeDetails && (
                              <>
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Email</div>
                                  <div className="text-slate-900 dark:text-white font-medium mt-1 text-xs truncate">
                                    {employeeDetails.email || '—'}
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Contact</div>
                                  <div className="text-slate-900 dark:text-white font-medium mt-1">
                                    {employeeDetails.contactNumber || '—'}
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Status</div>
                                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                                    employeeDetails.status === 'Active' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {employeeDetails.status || '—'}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Log Details */}
                    <div className="col-span-2 space-y-4">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getActivityColor(selectedLog.details)}`}>
                            {getActivityIcon(selectedLog.details)}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-900 dark:text-white">Log Information</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Complete activity details</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Log ID</div>
                            <div className="text-slate-900 dark:text-white font-mono font-bold mt-1">#{selectedLog.id}</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Created At</div>
                            <div className="text-slate-900 dark:text-white font-medium mt-1 text-sm">{new Date(selectedLog.created_at).toLocaleString()}</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 col-span-2">
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Activity Date & Time</div>
                            <div className="text-slate-900 dark:text-white font-semibold mt-1">{formatDateTime(selectedLog.log_date, selectedLog.log_time)}</div>
                          </div>
                        </div>

                        {selectedLog.purpose && (
                          <div className="mb-4">
                            <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wide">Purpose</h5>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                              <p className="text-sm text-slate-700 dark:text-slate-300">{selectedLog.purpose}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wide">Activity Details</h5>
                          {renderDetailsContent(selectedLog, associatedItems)}
                        </div>
                      </div>

                      {/* Associated Items */}
                      {/* Associated items are now rendered inline within Activity Details */}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 flex justify-end gap-3 border-t-2 border-slate-200 dark:border-slate-700">
                <button 
                  onClick={closeDetailedView} 
                  className="px-6 py-3 bg-linear-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  )
}

export default EmployeeLogs