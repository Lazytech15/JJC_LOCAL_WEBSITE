/**
 * Report Generation Component
 * Handles creating, scheduling, and exporting employee log reports
 */

import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import apiService from '../../../utils/api/api-service'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const ReportBuilder = ({ isOpen, onClose, logs = [] }) => {
  const [reportConfig, setReportConfig] = useState({
    title: 'Employee Activity Report',
    dateRange: 'custom',
    dateFrom: '',
    dateTo: '',
    includeStats: true,
    includeCharts: true,
    includeDetails: true,
    groupBy: 'date', // date, user, activity
    format: 'pdf', // pdf, csv, excel
    schedule: 'none', // none, daily, weekly, monthly
    emailTo: '',
  })

  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(1) // 1: Config, 2: Preview, 3: Export

  const updateConfig = (key, value) => {
    setReportConfig(prev => ({ ...prev, [key]: value }))
  }

  /**
   * Generate PDF report with charts
   */
  const generatePDF = useCallback(async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Header
    doc.setFontSize(20)
    doc.setTextColor(30, 58, 138) // Blue
    doc.text(reportConfig.title, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // Date range
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const dateRange = reportConfig.dateFrom && reportConfig.dateTo
      ? `${reportConfig.dateFrom} to ${reportConfig.dateTo}`
      : 'All Time'
    doc.text(`Report Period: ${dateRange}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Statistics
    if (reportConfig.includeStats) {
      doc.setFontSize(14)
      doc.setTextColor(30, 58, 138)
      doc.text('Summary Statistics', 14, yPosition)
      yPosition += 8

      const stats = calculateStats(logs)
      
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Total Activities: ${stats.totalLogs}`, 14, yPosition)
      yPosition += 6
      doc.text(`Unique Users: ${stats.uniqueUsers}`, 14, yPosition)
      yPosition += 6
      doc.text(`Date Range: ${stats.dateRange}`, 14, yPosition)
      yPosition += 6
      doc.text(`Most Active User: ${stats.mostActiveUser}`, 14, yPosition)
      yPosition += 12
    }

    // Details Table
    if (reportConfig.includeDetails && logs.length > 0) {
      doc.setFontSize(14)
      doc.setTextColor(30, 58, 138)
      doc.text('Activity Details', 14, yPosition)
      yPosition += 8

      const tableData = logs.map(log => [
        log.log_date || 'N/A',
        log.log_time || 'N/A',
        log.username || 'N/A',
        (log.details || log.purpose || '').substring(0, 40) + '...',
        log.item_no || '-'
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Time', 'User', 'Activity', 'Item']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          3: { cellWidth: 60 }
        }
      })
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    return doc
  }, [reportConfig, logs])

  /**
   * Generate CSV report
   */
  const generateCSV = useCallback(() => {
    const headers = ['Date', 'Time', 'Username', 'Details', 'Purpose', 'Item No', 'ID Number']
    const rows = logs.map(log => [
      log.log_date || '',
      log.log_time || '',
      log.username || '',
      (log.details || '').replace(/"/g, '""'), // Escape quotes
      (log.purpose || '').replace(/"/g, '""'),
      log.item_no || '',
      log.id_number || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }, [logs])

  /**
   * Calculate statistics from logs
   */
  const calculateStats = (logsData) => {
    const uniqueUsers = new Set(logsData.map(l => l.username).filter(Boolean)).size
    const dates = logsData.map(l => l.log_date).filter(Boolean).sort()
    const dateRange = dates.length > 0 
      ? `${dates[0]} to ${dates[dates.length - 1]}`
      : 'N/A'
    
    // Most active user
    const userCounts = {}
    logsData.forEach(log => {
      if (log.username) {
        userCounts[log.username] = (userCounts[log.username] || 0) + 1
      }
    })
    const mostActiveUser = Object.keys(userCounts).length > 0
      ? Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A'

    return {
      totalLogs: logsData.length,
      uniqueUsers,
      dateRange,
      mostActiveUser
    }
  }

  /**
   * Handle report generation
   */
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      if (reportConfig.format === 'pdf') {
        const doc = await generatePDF()
        doc.save(`${reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      } else if (reportConfig.format === 'csv') {
        const csv = generateCSV()
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }

      // If email is specified, send via API
      if (reportConfig.emailTo) {
        await sendReportEmail()
      }

      // If scheduled, save schedule configuration
      if (reportConfig.schedule !== 'none') {
        await saveSchedule()
      }

      onClose()
    } catch (error) {
      console.error('Report generation failed:', error)
      alert('Failed to generate report: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  /**
   * Send report via email (API call)
   */
  const sendReportEmail = async () => {
    try {
      const reportData = await apiService.employeeLogs.generateReport({
        filters: {
          date_from: reportConfig.dateFrom,
          date_to: reportConfig.dateTo
        }
      })

      await apiService.employeeLogs.emailReport({
        recipients: reportConfig.emailTo.split(',').map(e => e.trim()),
        subject: reportConfig.title,
        message: `Please find attached the ${reportConfig.title} for the period ${reportConfig.dateFrom || 'All'} to ${reportConfig.dateTo || 'Present'}.`,
        report_data: reportData
      })

      console.log('✅ Report email sent successfully to:', reportConfig.emailTo)
    } catch (error) {
      console.error('❌ Failed to send report email:', error)
      throw new Error('Failed to send email: ' + error.message)
    }
  }

  /**
   * Save report schedule (API call)
   */
  const saveSchedule = async () => {
    try {
      const scheduleData = {
        name: reportConfig.title,
        filters: {
          date_from: reportConfig.dateFrom,
          date_to: reportConfig.dateTo
        },
        schedule: {
          frequency: reportConfig.schedule,
          time: '08:00',
          day: reportConfig.schedule === 'weekly' ? 'monday' : undefined,
          day_of_month: reportConfig.schedule === 'monthly' ? 1 : undefined
        },
        recipients: reportConfig.emailTo.split(',').map(e => e.trim()),
        format: reportConfig.format,
        enabled: true
      }

      const result = await apiService.employeeLogs.scheduleReport(scheduleData)
      console.log('✅ Report schedule saved successfully:', result)
    } catch (error) {
      console.error('❌ Failed to save report schedule:', error)
      throw new Error('Failed to save schedule: ' + error.message)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-9999 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 sm:border-2 animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg sm:text-xl lg:text-2xl">Report Builder</h3>
                <p className="text-purple-100 text-sm mt-1">Create custom activity reports</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {[
              { num: 1, label: 'Configure' },
              { num: 2, label: 'Preview' },
              { num: 3, label: 'Export' }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                {idx > 0 && <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-4" />}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                    step === s.num
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg scale-110'
                      : step > s.num
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={reportConfig.dateFrom}
                    onChange={(e) => updateConfig('dateFrom', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={reportConfig.dateTo}
                    onChange={(e) => updateConfig('dateTo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Include in Report
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'includeStats', label: 'Summary Statistics' },
                    { key: 'includeCharts', label: 'Charts & Graphs' },
                    { key: 'includeDetails', label: 'Activity Details' }
                  ].map(option => (
                    <label key={option.key} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={reportConfig[option.key]}
                        onChange={(e) => updateConfig(option.key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Export Format
                </label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => updateConfig('format', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="csv">CSV Spreadsheet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Schedule (Optional)
                </label>
                <select
                  value={reportConfig.schedule}
                  onChange={(e) => updateConfig('schedule', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="none">One-time Report</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Email To (Optional)
                </label>
                <input
                  type="email"
                  value={reportConfig.emailTo}
                  onChange={(e) => updateConfig('emailTo', e.target.value)}
                  placeholder="email@example.com, user2@example.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Separate multiple emails with commas. Leave empty to only download.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Report Preview</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p><strong>Title:</strong> {reportConfig.title}</p>
                  <p><strong>Period:</strong> {reportConfig.dateFrom && reportConfig.dateTo ? `${reportConfig.dateFrom} to ${reportConfig.dateTo}` : 'All Time'}</p>
                  <p><strong>Format:</strong> {reportConfig.format.toUpperCase()}</p>
                  <p><strong>Records:</strong> {logs.length} activities</p>
                </div>
              </div>

              {logs.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 font-semibold text-sm text-slate-700 dark:text-slate-300">
                    Sample Data (First 5 records)
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {logs.slice(0, 5).map((log, idx) => (
                      <div key={idx} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">{log.username || 'N/A'}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{log.log_date} {log.log_time}</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {log.details || log.purpose || 'No details'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No data available for the selected period
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ready to Generate!</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click "Generate Report" to create and download your report.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 p-6 flex justify-between gap-3 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="flex gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Back
              </button>
            )}
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              Cancel
            </button>
          </div>

          <div>
            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !reportConfig.title}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button 
                onClick={handleGenerate}
                disabled={generating || logs.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

