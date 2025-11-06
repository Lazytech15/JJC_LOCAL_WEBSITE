import icon from '../../../public/icons/icon192.png'

function Reports({ items, calculateItemProgress, calculatePhaseProgress }) {
  const getStatistics = () => {
    const totalItems = items.length
    const completedItems = items.filter(item => calculateItemProgress(item) === 100).length
    const inProgressItems = items.filter(item => {
      const progress = calculateItemProgress(item)
      return progress > 0 && progress < 100
    }).length
    const notStartedItems = items.filter(item => calculateItemProgress(item) === 0).length
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      notStartedItems,
      overallProgress: totalItems > 0 ? Math.round(items.reduce((sum, item) => sum + calculateItemProgress(item), 0) / totalItems) : 0
    }
  }

  const stats = getStatistics()

  const exportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      items: items.map(item => ({
        name: item.name,
        description: item.description,
        progress: calculateItemProgress(item),
        phases: item.phases?.map(phase => ({
          name: phase.name,
          progress: calculatePhaseProgress(phase),
          subphases: phase.subphases
        })) || []
      }))
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operations-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const currentDate = new Date().toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // Create professional HTML document
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0.5in; }
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      margin: 0;
      padding: 20px;
      background: white;
    }
    .header-section { 
      border: 4px solid #DC143C;
      margin-bottom: 20px;
      background: white;
    }
    .header-top {
      background: linear-gradient(to right, #DC143C 0%, #DC143C 30%, white 30%, white 70%, #228B22 70%, #228B22 100%);
      padding: 5px;
    }
    .header-content {
      padding: 20px;
      text-align: center;
      background: white;
    }
    .company-name { 
      font-size: 28px;
      font-weight: bold;
      color: #DC143C;
      margin: 0 0 5px 0;
      letter-spacing: 0.5px;
    }
    .report-subtitle { 
      font-size: 18px;
      font-weight: bold;
      color: #228B22;
      margin: 5px 0;
    }
    .company-info { 
      font-size: 11px;
      color: #333;
      margin: 2px 0;
      line-height: 1.4;
    }
    .date-header {
      background: #f8f9fa;
      padding: 12px 20px;
      border: 2px solid #dee2e6;
      border-radius: 4px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .date-label {
      font-weight: bold;
      color: #495057;
      font-size: 13px;
    }
    .item-card {
      page-break-inside: avoid;
      margin-bottom: 25px;
      border: 3px solid #DC143C;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .item-title-bar {
      background: linear-gradient(135deg, #DC143C 0%, #C41E3A 50%, #228B22 100%);
      color: white;
      padding: 15px 20px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .item-body {
      background: white;
      padding: 0;
    }
    .info-table { 
      width: 100%;
      border-collapse: collapse;
    }
    .info-row {
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label { 
      background: #f8f9fa;
      color: #212529;
      padding: 12px 20px;
      font-weight: 600;
      font-size: 13px;
      width: 35%;
      border-right: 3px solid #DC143C;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value { 
      padding: 12px 20px;
      font-size: 13px;
      color: #495057;
      background: white;
    }
    .section-header {
      background: linear-gradient(to right, #DC143C 0%, #228B22 100%);
      color: white;
      padding: 10px 20px;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-completed { 
      background-color: #d4edda; 
      color: #155724; 
      font-weight: bold;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-progress { 
      background-color: #fff3cd; 
      color: #856404; 
      font-weight: bold;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-notstarted { 
      background-color: #f8d7da; 
      color: #721c24; 
      font-weight: bold;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
    }
    .progress-high { 
      color: #228B22; 
      font-weight: bold; 
      font-size: 16px;
    }
    .progress-medium { 
      color: #FFA500; 
      font-weight: bold; 
      font-size: 16px;
    }
    .progress-low { 
      color: #DC143C; 
      font-weight: bold; 
      font-size: 16px;
    }
    .positive-value {
      color: #228B22;
      font-weight: bold;
    }
    .negative-value {
      color: #DC143C;
      font-weight: bold;
    }
    .footer-section {
      margin-top: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 5px solid #DC143C;
      border-radius: 4px;
    }
    .footer-title {
      font-weight: bold;
      color: #DC143C;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .footer-text {
      font-size: 12px;
      color: #495057;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header-section">
    <div class="header-top"></div>
    <div class="header-content">
      <div class="company-name">JJC ENGINEERING WORKS & GENERAL SERVICES</div>
      <div class="report-subtitle">Operations Progress Report</div>
      <div class="company-info">#119 Sto. Niño St. Brgy. San Jose, Antipolo City</div>
      <div class="company-info">Telefax: 650-7362 | Tel. #: 795-5816</div>
      <div class="company-info">E-mail: jjcengworks@yahoo.com</div>
    </div>
  </div>
  
  <div class="date-header">
    <span class="date-label">Report Generated:</span>
    <span class="date-label">${currentDate}</span>
  </div>
`
    
    items.forEach((item, index) => {
      const progress = calculateItemProgress(item)
      
      // Get all employees involved across all subphases
      const allEmployees = new Set()
      let totalActualHours = 0
      let totalExpectedHours = 0
      
      // Calculate totals from subphases
      item.phases?.forEach(phase => {
        phase.subphases?.forEach(subphase => {
          if (subphase.employee_name) {
            allEmployees.add(subphase.employee_name)
          }
          totalActualHours += parseFloat(subphase.actual_hours || 0)
          totalExpectedHours += parseFloat(subphase.expected_duration || 0)
        })
      })
      
      // Use item's start_time and end_time
      const startTime = item.start_time ? new Date(item.start_time) : null
      const endTime = item.end_time ? new Date(item.end_time) : null
      
      // Format times for Philippines timezone
      const formatTimeForPH = (date) => {
        if (!date) return 'Not Started'
        return date.toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }
      
      const startTimeStr = formatTimeForPH(startTime)
      const endTimeStr = endTime ? formatTimeForPH(endTime) : (startTime ? 'In Progress' : 'Not Started')
      
      // Calculate duration
      let durationStr = '00:00:00'
      if (startTime) {
        const end = endTime || new Date()
        const durationMs = end - startTime
        const hours = Math.floor(durationMs / 3600000)
        const minutes = Math.floor((durationMs % 3600000) / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)
        durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      
      // Calculate statistics
      const totalPhases = item.phases?.length || 0
      const completedPhases = item.phases?.filter(p => calculatePhaseProgress(p) === 100).length || 0
      const totalTasks = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
      const completedTasks = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0
      
      const employeeList = Array.from(allEmployees).join(', ')
      const employeeCount = allEmployees.size
      
      // Calculate variance and efficiency
      const timeVariance = totalActualHours - totalExpectedHours
      const efficiency = totalExpectedHours > 0 ? ((totalExpectedHours / totalActualHours) * 100).toFixed(1) : 'N/A'
      
      // Determine status and styling
      let status = 'Not Started'
      let statusClass = 'status-notstarted'
      if (progress === 100 && endTime) {
        status = 'Completed'
        statusClass = 'status-completed'
      } else if (progress === 100 && !endTime) {
        status = 'Awaiting Stop'
        statusClass = 'status-progress'
      } else if (progress > 0) {
        status = 'In Progress'
        statusClass = 'status-progress'
      }
      
      const progressClass = progress >= 80 ? 'progress-high' : progress >= 40 ? 'progress-medium' : 'progress-low'
      
      // Build item card
      htmlContent += `
  <div class="item-card">
    <div class="item-title-bar">ITEM ${index + 1}: ${escapeHtml(item.name)}</div>
    <div class="item-body">
      <table class="info-table">
        <!-- Basic Information Section -->
        <tr><td colspan="2" class="section-header">Basic Information</td></tr>
        <tr class="info-row">
          <td class="info-label">Item Name</td>
          <td class="info-value" style="font-weight: bold; font-size: 14px;">${escapeHtml(item.name)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Description</td>
          <td class="info-value">${escapeHtml(item.description || 'N/A')}</td>
        </tr>
        ${item.part_number ? `
        <tr class="info-row">
          <td class="info-label">Part Number</td>
          <td class="info-value" style="font-family: monospace; font-weight: 600;">${escapeHtml(item.part_number)}</td>
        </tr>` : ''}
        
        <!-- Status & Progress Section -->
        <tr><td colspan="2" class="section-header">Status & Progress</td></tr>
        <tr class="info-row">
          <td class="info-label">Current Status</td>
          <td class="info-value"><span class="${statusClass}">${status}</span></td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Overall Progress</td>
          <td class="info-value"><span class="${progressClass}">${progress}%</span></td>
        </tr>
        
        <!-- Time Tracking Section -->
        <tr><td colspan="2" class="section-header">Time Tracking</td></tr>
        <tr class="info-row">
          <td class="info-label">Start Time</td>
          <td class="info-value">${escapeHtml(startTimeStr)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">End Time</td>
          <td class="info-value">${escapeHtml(endTimeStr)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Total Duration</td>
          <td class="info-value" style="font-family: monospace; font-weight: 600;">${durationStr}</td>
        </tr>
        
        <!-- Work Breakdown Section -->
        <tr><td colspan="2" class="section-header">Work Breakdown</td></tr>
        <tr class="info-row">
          <td class="info-label">Total Phases</td>
          <td class="info-value"><strong>${totalPhases}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Completed Phases</td>
          <td class="info-value"><span class="positive-value">${completedPhases}</span> of ${totalPhases}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Total Tasks</td>
          <td class="info-value"><strong>${totalTasks}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Completed Tasks</td>
          <td class="info-value"><span class="positive-value">${completedTasks}</span> of ${totalTasks}</td>
        </tr>
        
        <!-- Personnel Section -->
        <tr><td colspan="2" class="section-header">Personnel</td></tr>
        <tr class="info-row">
          <td class="info-label">Number of Employees</td>
          <td class="info-value"><strong>${employeeCount}</strong> ${employeeCount === 1 ? 'employee' : 'employees'}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Employee Names</td>
          <td class="info-value">${escapeHtml(employeeList || 'N/A')}</td>
        </tr>
        
        <!-- Performance Metrics Section -->
        <tr><td colspan="2" class="section-header">Performance Metrics</td></tr>
        <tr class="info-row">
          <td class="info-label">Actual Hours</td>
          <td class="info-value"><strong>${totalActualHours.toFixed(2)}</strong> hours</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Expected Hours</td>
          <td class="info-value"><strong>${totalExpectedHours.toFixed(2)}</strong> hours</td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Time Variance</td>
          <td class="info-value">
            <span class="${timeVariance >= 0 ? 'negative-value' : 'positive-value'}">
              ${timeVariance > 0 ? '+' : ''}${timeVariance.toFixed(2)} hours
              ${timeVariance > 0 ? ' (Over Budget)' : timeVariance < 0 ? ' (Under Budget)' : ' (On Budget)'}
            </span>
          </td>
        </tr>
        <tr class="info-row">
          <td class="info-label">Efficiency Rate</td>
          <td class="info-value">
            <span class="${efficiency !== 'N/A' && parseFloat(efficiency) < 100 ? 'negative-value' : 'positive-value'}" style="font-size: 15px;">
              ${efficiency}${typeof efficiency === 'string' ? '' : '%'}
            </span>
          </td>
        </tr>
      </table>
    </div>
  </div>
`
    })
    
    htmlContent += `
  <div class="footer-section">
    <div class="footer-title">Report Information</div>
    <div class="footer-text">
      This comprehensive operations progress report includes detailed time tracking, employee assignments, and efficiency metrics for all items. 
      All times are displayed in Philippines Standard Time (PST/GMT+8). The time variance indicates the difference between actual and expected hours, 
      where positive values indicate over budget and negative values indicate under budget. The efficiency rate shows how well the work is being 
      completed relative to estimates, with values over 100% indicating ahead-of-schedule performance.
    </div>
  </div>
</body>
</html>
`
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JJC-Operations-Report-${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }).split(',')[0].replace(/\//g, '-')}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Shipment & Reports</h2>
      
      {/* Summary Report */}
      <div className="bg-white/5 dark:bg-black/10 rounded-lg p-6 border border-gray-300/20 dark:border-gray-700/20 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Summary Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Total Items: <span className="font-bold text-gray-800 dark:text-gray-200">{stats.totalItems}</span></p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Completed: <span className="font-bold text-green-600 dark:text-green-400">{stats.completedItems}</span></p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">In Progress: <span className="font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgressItems}</span></p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Not Started: <span className="font-bold text-gray-600 dark:text-gray-400">{stats.notStartedItems}</span></p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Overall Progress: <span className="font-bold text-gray-800 dark:text-gray-200">{stats.overallProgress}%</span></p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Generated: <span className="font-bold text-gray-800 dark:text-gray-200">{new Date().toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      {/* Detailed Item Reports */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Detailed Item Reports</h3>
        {items.length > 0 ? (
          items.map(item => {
            const progress = calculateItemProgress(item)
            const completedPhases = item.phases?.filter(p => calculatePhaseProgress(p) === 100).length || 0
            const totalSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
            const completedSubPhases = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.filter(sp => sp.completed == 1).length || 0), 0) || 0
            
            // Use part_number as unique key
            const itemKey = item.part_number || item.id
            
            return (
              <div key={itemKey} className="bg-white/5 dark:bg-black/10 rounded-lg p-5 border border-gray-300/20 dark:border-gray-700/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    {item.part_number && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Part #: {item.part_number}</p>
                    )}
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-lg font-bold ${
                    progress === 100 ? 'bg-green-500 text-white' :
                    progress >= 50 ? 'bg-yellow-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {progress}%
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Phases</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{item.phases?.length || 0}</p>
                  </div>
                  <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Completed Phases</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedPhases}</p>
                  </div>
                  <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{totalSubPhases}</p>
                  </div>
                  <div className="bg-white/5 dark:bg-black/10 p-3 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Completed Tasks</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedSubPhases}</p>
                  </div>
                </div>

                {/* Phase Breakdown */}
                {item.phases && item.phases.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phase Breakdown:</p>
                    {item.phases.map(phase => {
                      const phaseProgress = calculatePhaseProgress(phase)
                      const totalExpected = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.expected_duration || 0), 0) || 0
                      const totalActual = phase.subphases?.reduce((sum, sp) => sum + parseFloat(sp.actual_hours || 0), 0) || 0
                      return (
                        <div key={phase.id} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">{phase.name}</span>
                            <div className="flex-1 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  phaseProgress === 100 ? 'bg-green-500' :
                                  phaseProgress >= 50 ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`}
                                style={{ width: `${phaseProgress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{phaseProgress}%</span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 ml-36">
                            Time: {totalActual.toFixed(1)}h / {totalExpected.toFixed(1)}h expected
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    progress === 100 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                    progress > 0 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                    'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                  }`}>
                    {progress === 100 ? 'Ready for Shipment' :
                     progress > 0 ? 'In Progress' :
                     'Not Started'}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No items to report. Create items to see reports.</p>
        )}
      </div>

      {/* Export Options */}
      <div className="mt-6 bg-white/5 dark:bg-black/10 rounded-lg p-5 border border-gray-300/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Export Options</h3>
        <div className="flex gap-3">
          <button
            onClick={exportJSON}
            className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            Export as JSON
          </button>
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            Export as Excel
          </button>
        </div>
      </div>
    </div>
  )
}

export default Reports