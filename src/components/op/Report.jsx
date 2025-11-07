import { FileText, Package, User, Clock, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"

function Reports({
  items: initialItems,
  calculateItemProgress,
  calculatePhaseProgress,
  getPhaseElapsedTime,
  formatTime,
  apiService
}) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [showAll, setShowAll] = useState(false);


  // Sync with parent items when they change
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const refreshData = async () => {
    if (!apiService) return

    try {
      setLoading(true)
      console.log('Refreshing report data...')

      // Fetch fresh data for all items
      const itemsResponse = await apiService.operations.getItems()

      let itemsArray = []
      if (Array.isArray(itemsResponse)) {
        itemsArray = itemsResponse
      } else if (itemsResponse && typeof itemsResponse === 'object') {
        const numericKeys = Object.keys(itemsResponse).filter(key => !isNaN(key))
        if (numericKeys.length > 0) {
          itemsArray = numericKeys.map(key => itemsResponse[key])
        } else {
          itemsArray = itemsResponse.items || itemsResponse.data || itemsResponse.results || []
        }
      }

      // Load full details for all items to get accurate phase data
      if (itemsArray.length > 0) {
        const itemsWithDetails = await Promise.all(
          itemsArray.map(item => apiService.operations.getItem(item.part_number))
        )
        setItems(itemsWithDetails)
        setLastRefresh(new Date())
        console.log('Report data refreshed successfully')
      }
    } catch (error) {
      console.error('Failed to refresh report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatistics = () => {
    const totalItems = items.length
    const completedItems = items.filter((item) => calculateItemProgress(item) === 100).length
    const inProgressItems = items.filter((item) => {
      const progress = calculateItemProgress(item)
      return progress > 0 && progress < 100
    }).length
    const notStartedItems = items.filter((item) => calculateItemProgress(item) === 0).length

    return {
      totalItems,
      completedItems,
      inProgressItems,
      notStartedItems,
      overallProgress:
        totalItems > 0 ? Math.round(items.reduce((sum, item) => sum + calculateItemProgress(item), 0) / totalItems) : 0,
    }
  }

  const stats = getStatistics()

  const formatTimeForPH = (date) => {
    if (!date) return "Not Started"
    return new Date(date).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return "00:00:00"
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const durationMs = end - start
    const hours = Math.floor(durationMs / 3600000)
    const minutes = Math.floor((durationMs % 3600000) / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const exportPDF = async () => {
    // Refresh data before exporting to ensure latest information
    await refreshData()

    const sortedItems = [...items].sort((a, b) => {
      const priorityOrder = { High: 0, Medium: 1, Low: 2 }
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
    })

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow popups to export PDF")
      return
    }

    const currentDate = new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JJC Engineering - Operations Report</title>
  <style>
    @page { 
      margin: 0.2in;
      size: letter;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { 
      font-family: 'Segoe UI', 'Arial', sans-serif; 
      margin: 0;
      padding: 0;
      background: white;
      color: #000;
      font-size: 7pt;
      line-height: 1.05;
    }
    .header-section { 
      border: 1.5px solid #333;
      margin-bottom: 2px;
      background: white;
      page-break-after: avoid;
    }
    .header-content {
      padding: 2px 5px;
      text-align: center;
      background: white;
      border-bottom: 2px solid #2196F3;
    }
    .company-name { 
      font-size: 12px;
      font-weight: bold;
      color: #333;
      margin: 0 0 1px 0;
      letter-spacing: 0.3px;
    }
    .report-subtitle { 
      font-size: 9px;
      font-weight: 600;
      color: #666;
      margin: 0.5px 0;
    }
    .company-info { 
      font-size: 6px;
      color: #555;
      margin: 0;
      line-height: 1.05;
    }
    .summary-section {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 3px;
      margin-bottom: 2px;
      page-break-inside: avoid;
    }
    .summary-title {
      font-size: 8px;
      font-weight: bold;
      color: #333;
      margin: 0 0 2px 0;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 2px;
    }
    .summary-card {
      background: white;
      padding: 2px;
      border-radius: 2px;
      text-align: center;
      border: 1px solid #e0e0e0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .summary-card-title {
      font-size: 6px;
      color: #666;
      text-transform: uppercase;
      margin: 0 0 1px 0;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .summary-card-value {
      font-size: 14px;
      font-weight: bold;
      margin: 0;
      color: #333;
    }
    .item-card {
      page-break-inside: avoid;
      margin-bottom: 3px;
      border: 1px solid #ddd;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .item-header {
      background: #424242;
      color: white;
      padding: 2px 5px;
      font-size: 8.5px;
      font-weight: bold;
      border-bottom: 2px solid #2196F3;
    }
    .item-body {
      background: white;
      padding: 3px 4px;
    }
    .section-title {
      font-size: 7.5px;
      font-weight: bold;
      color: #333;
      margin: 3px 0 2px 0;
      padding-left: 4px;
      border-left: 2px solid #2196F3;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2px;
      margin-bottom: 2px;
    }
    .info-item {
      font-size: 6.5px;
    }
    .info-label {
      font-weight: 600;
      color: #666;
      margin: 0 0 0.5px 0;
      font-size: 6px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .info-value {
      color: #333;
      margin: 0;
      font-size: 6.5px;
      line-height: 1.1;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 2px;
      margin: 2px 0;
    }
    .stat-box {
      background: #f5f5f5;
      padding: 2px;
      text-align: center;
      border: 1px solid #e0e0e0;
      border-radius: 2px;
    }
    .stat-label {
      font-size: 5.5px;
      color: #666;
      margin: 0 0 0.5px 0;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .stat-value {
      font-size: 10px;
      font-weight: bold;
      color: #333;
      margin: 0;
    }
    .phase-section {
      background: #fafafa;
      padding: 2px;
      margin: 2px 0;
      border: 1px solid #e0e0e0;
      border-radius: 2px;
      page-break-inside: avoid;
    }
    .phase-header {
      font-weight: bold;
      color: #333;
      margin: 0 0 2px 0;
      display: flex;
      justify-content: space-between;
      font-size: 7px;
    }
    .subphase-item {
      background: white;
      padding: 2px;
      margin: 1px 0;
      border-left: 2px solid #4CAF50;
      font-size: 6px;
      border-radius: 1px;
      line-height: 1.1;
    }
    .subphase-item.incomplete {
      border-left-color: #FF9800;
    }
    .remarks-box {
      background: #FFF9C4;
      padding: 2px;
      border-left: 2px solid #FFC107;
      margin: 2px 0;
      font-size: 6px;
      border-radius: 1px;
      line-height: 1.1;
    }
    .remarks-box ul {
      margin: 1px 0;
      padding-left: 0.7rem;
    }
    .remarks-box li {
      margin-bottom: 1px;
      line-height: 1.1;
    }
    .priority-high { 
      background: #333; 
      color: white; 
      padding: 1px 3px; 
      font-weight: 600; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .priority-medium { 
      background: #666; 
      color: white; 
      padding: 1px 3px; 
      font-weight: 600; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .priority-low { 
      background: #999; 
      color: white; 
      padding: 1px 3px; 
      font-weight: 600; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .status-completed { 
      background: #E8F5E9; 
      color: #2E7D32; 
      padding: 1px 3px; 
      font-weight: 600; 
      border: 1px solid #81C784; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .status-progress { 
      background: #FFF3E0; 
      color: #E65100; 
      padding: 1px 3px; 
      font-weight: 600; 
      border: 1px solid #FFB74D; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .status-notstarted { 
      background: #FAFAFA; 
      color: #424242; 
      padding: 1px 3px; 
      font-weight: 600; 
      border: 1px solid #BDBDBD; 
      font-size: 5.5px; 
      border-radius: 1px;
      display: inline-block;
    }
    .footer-note {
      margin-top: 2px;
      padding: 2px;
      background: #f5f5f5;
      border-left: 2px solid #2196F3;
      page-break-inside: avoid;
      font-size: 5.5px;
      line-height: 1.1;
      border-radius: 1px;
    }
    .two-column-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2px;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="header-section">
    <div class="header-content">
      <div class="company-name">JJC ENGINEERING WORKS & GENERAL SERVICES</div>
      <div class="report-subtitle">Operations Progress Report</div>
      <div class="company-info">#119 Sto. Niño St. Brgy. San Jose, Antipolo City | Tel. 795-5816</div>
      <div class="company-info" style="font-weight: bold; margin-top: 1px;">Generated: ${currentDate}</div>
    </div>
  </div>

  <div class="summary-section">
    <div class="summary-title">Executive Summary</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-title">Total</div>
        <div class="summary-card-value">${stats.totalItems}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Done</div>
        <div class="summary-card-value" style="color: #4CAF50;">${stats.completedItems}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">In Progress</div>
        <div class="summary-card-value" style="color: #FF9800;">${stats.inProgressItems}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Not Started</div>
        <div class="summary-card-value" style="color: #757575;">${stats.notStartedItems}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Progress</div>
        <div class="summary-card-value" style="color: ${stats.overallProgress >= 80 ? "#4CAF50" : stats.overallProgress >= 40 ? "#FF9800" : "#757575"};">${stats.overallProgress}%</div>
      </div>
    </div>
  </div>
`

    sortedItems.forEach((item, index) => {
      const progress = calculateItemProgress(item)

      const allEmployees = new Set()
      let totalActualHours = 0
      let totalExpectedHours = 0
      let totalExpectedQty = 0
      let totalCompletedQty = 0
      let totalPhaseTimeSeconds = 0

      item.phases?.forEach((phase) => {
        totalPhaseTimeSeconds += getPhaseElapsedTime(phase)

        phase.subphases?.forEach((subphase) => {
          if (subphase.employee_name) {
            allEmployees.add(`${subphase.employee_name} (${subphase.employee_barcode})`)
          }
          totalActualHours += Number.parseFloat(subphase.actual_hours || 0)
          totalExpectedHours += Number.parseFloat(subphase.expected_duration || 0)
          totalExpectedQty += Number.parseInt(subphase.expected_quantity || 0)
          totalCompletedQty += Number.parseInt(subphase.current_completed_quantity || 0)
        })
      })
      const totalPhaseTimeHours = (totalPhaseTimeSeconds / 3600).toFixed(2)

      const totalPhases = item.phases?.length || 0
      const completedPhases = item.phases?.filter((p) => calculatePhaseProgress(p) === 100).length || 0
      const totalTasks = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
      const completedTasks =
        item.phases?.reduce(
          (sum, phase) => sum + (phase.subphases?.filter((sp) => sp.completed == 1).length || 0),
          0,
        ) || 0

      const timeVariance = totalActualHours - totalExpectedHours
      const efficiency = totalExpectedHours > 0 ? ((totalExpectedHours / totalActualHours) * 100).toFixed(1) : "N/A"

      let status = "Not Started"
      let statusClass = "status-notstarted"
      if (progress === 100 && item.end_time) {
        status = "Completed"
        statusClass = "status-completed"
      } else if (progress > 0) {
        status = "In Progress"
        statusClass = "status-progress"
      }

      htmlContent += `
  <div class="item-card">
    <div class="item-header">
      ITEM ${index + 1}: ${item.name} ${item.part_number ? "| PN: " + item.part_number.split("-BATCH")[0] : ""}
    </div>
    <div class="item-body">
      <div class="section-title">Overview</div>
      <div class="two-column-grid">
        ${item.client_name
          ? `<div class="info-item">
          <div class="info-label">Client:</div>
          <div class="info-value" style="color: #2196F3; font-weight: bold;">${item.client_name}</div>
        </div>`
          : ""
        }
        <div class="info-item">
          <div class="info-label">Status:</div>
          <div class="info-value"><span class="${statusClass}">${status}</span></div>
        </div>
        ${item.priority
          ? `<div class="info-item">
          <div class="info-label">Priority:</div>
          <div class="info-value"><span class="priority-${item.priority.toLowerCase()}">${item.priority}</span></div>
        </div>`
          : ""
        }
        <div class="info-item">
          <div class="info-label">Progress:</div>
          <div class="info-value" style="font-weight: bold; color: ${progress >= 80 ? "#4CAF50" : progress >= 40 ? "#FF9800" : "#757575"};">${progress}%</div>
        </div>
      </div>

      <div class="section-title">Metrics</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Phases</div>
          <div class="stat-value">${completedPhases}/${totalPhases}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Tasks</div>
          <div class="stat-value">${completedTasks}/${totalTasks}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Time</div>
          <div class="stat-value">${totalPhaseTimeHours}h</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Team</div>
          <div class="stat-value">${allEmployees.size}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Efficiency</div>
          <div class="stat-value" style="color: ${efficiency !== "N/A" && Number.parseFloat(efficiency) < 100 ? "#757575" : "#4CAF50"};">${efficiency}%</div>
        </div>
      </div>

      <div class="section-title">Timeline</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Start:</div>
          <div class="info-value">${(() => {
          const firstPhase = item.phases?.[0];
          const time = formatTimeForPH(firstPhase?.start_time || item.start_time);
          return time.replace(/\//g, '/').substring(0, 14);
        })()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">End:</div>
          <div class="info-value">${(() => {
          const lastPhase = item.phases?.[item.phases.length - 1];
          if (lastPhase?.end_time) {
            const time = formatTimeForPH(lastPhase.end_time);
            return time.substring(0, 14);
          } else if (item.phases?.[0]?.start_time) {
            return "In Progress";
          } else {
            return "N/S";
          }
        })()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Duration:</div>
          <div class="info-value" style="font-family: monospace; font-weight: bold;">${(() => {
          const firstPhase = item.phases?.[0];
          const lastPhase = item.phases?.[item.phases.length - 1];

          if (!firstPhase?.start_time) return "00:00:00";

          const startTime = new Date(firstPhase.start_time);
          const endTime = lastPhase?.end_time ? new Date(lastPhase.end_time) : new Date();
          const durationSeconds = Math.floor((endTime - startTime) / 1000);

          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.floor((durationSeconds % 3600) / 60);
          const seconds = durationSeconds % 60;
          return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        })()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Variance:</div>
          <div class="info-value" style="font-weight: bold; color: ${timeVariance >= 0 ? "#757575" : "#4CAF50"};">
            ${timeVariance > 0 ? "+" : ""}${timeVariance.toFixed(1)}h
          </div>
        </div>
      </div>

      ${totalExpectedQty > 0
          ? `
      <div class="section-title">Quantity</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Expected</div>
          <div class="stat-value">${totalExpectedQty}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Done</div>
          <div class="stat-value" style="color: #4CAF50;">${totalCompletedQty}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Remaining</div>
          <div class="stat-value" style="color: #FF9800;">${totalExpectedQty - totalCompletedQty}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Rate</div>
          <div class="stat-value">${totalExpectedQty > 0 ? ((totalCompletedQty / totalExpectedQty) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>`
          : ""
        }

      ${allEmployees.size > 0
          ? `
      <div class="section-title">Team (${allEmployees.size})</div>
      <div class="info-item">
        <div class="info-value" style="font-size: 6px;">${Array.from(allEmployees).join(" | ")}</div>
      </div>`
          : ""
        }

${item.remarks
          ? `
  <div class="remarks-box">
    <strong>Remarks Summary:</strong>
    <ul style="padding-left: 0.8rem; margin-top: 0.3rem;">
      ${item.remarks
            .trim()
            .split('\n')
            .map((line, i) => {
              const outMatch = line.match(
                /\[(.*?)\] Transferred OUT (\d+) units to (.+?) \((.+?)\) - (.+?) > (.+?) \| From: (.+?) > (.+?): (.+)/
              );
              const inMatch = line.match(
                /\[(.*?)\] Received IN (\d+) units from (.+?) \((.+?)\) - (.+?) > (.+?) \| To: (.+?) > (.+?): (.+)/
              );

              if (outMatch) {
                const [
                  ,
                  timestamp,
                  qty,
                  client,
                  partNumberRaw,
                  targetPhase,
                  targetSubphase,
                  sourcePhase,
                  sourceSubphase,
                  note,
                ] = outMatch;

                const partNumber = partNumberRaw.split('-BATCH')[0];

                return `
              <li>
                <strong>Transaction ${i + 1} – Transferred OUT</strong><br/>
                Date & Time: ${timestamp}<br/>
                To: <strong>${client}</strong> (<code>Part Number: ${partNumber}</code>)<br/>
                Target: ${targetPhase} > ${targetSubphase}<br/>
                Source: ${sourcePhase} > ${sourceSubphase}<br/>
                Quantity: ${qty} units<br/>
                Note: ${note}
              </li>
            `;
              }

              if (inMatch) {
                const [
                  ,
                  timestamp,
                  qty,
                  client,
                  partNumberRaw,
                  sourcePhase,
                  sourceSubphase,
                  targetPhase,
                  targetSubphase,
                  note,
                ] = inMatch;

                const partNumber = partNumberRaw.split('-BATCH')[0];

                return `
              <li>
                <strong>Transaction ${i + 1} – Received IN</strong><br/>
                Date & Time: ${timestamp}<br/>
                From: <strong>${client}</strong> (<code>Part Number: ${partNumber}</code>)<br/>
                Source: ${sourcePhase} > ${sourceSubphase}<br/>
                Target: ${targetPhase} > ${targetSubphase}<br/>
                Quantity: ${qty} units<br/>
                Note: ${note}
              </li>
            `;
              }

              return `<li>${line}</li>`;
            })
            .join('')}
    </ul>
  </div>`
          : ''
        }

      ${item.phases && item.phases.length > 0
          ? `
      <div class="section-title">Phases (${completedPhases}/${totalPhases})</div>
      ${item.phases
            .map((phase, phaseIndex) => {
              const phaseProgress = calculatePhaseProgress(phase)
              const phaseElapsedSeconds = getPhaseElapsedTime(phase)
              return `
      <div class="phase-section">
        <div class="phase-header">
          <span>P${phaseIndex + 1}: ${phase.name}${phase.start_time && !phase.pause_time && !phase.end_time ? ' [RUN]' : phase.pause_time && !phase.end_time ? ' [PAUSE]' : phase.end_time ? ' [✓]' : ''}</span>
          <span>${phaseProgress}% | ${formatTime(phaseElapsedSeconds)}</span>
        </div>
        ${phase.subphases && phase.subphases.length > 0
                  ? `
        <div>
          ${phase.subphases
                    .map(
                      (subphase) => `
          <div class="subphase-item ${subphase.completed == 1 ? "" : "incomplete"}">
            ${subphase.completed == 1 ? "✓" : "○"} ${subphase.name} | E:${subphase.expected_duration || 0}h A:${subphase.actual_hours || 0}h${subphase.employee_name ? ` | ${subphase.employee_name}` : ""}
          </div>
          `,
                    )
                    .join("")}
        </div>`
                  : ""
                }
      </div>
        `
            })
            .join("")}`
          : ""
        }
    </div>
  </div>
`
    })

    htmlContent += `
  <div class="footer-note">
    <strong>REPORT:</strong> Real-time phase tracking, time metrics (excl. pauses), efficiency data. PST/GMT+8. JJC Engineering Operations Management System.
  </div>
</body>
</html>
`

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const printStyles = `
    @page { 
      margin: 0.75in;
      size: letter;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      .avoid-break { page-break-inside: avoid; }
      .print-header { display: block !important; }
      .summary-grid { display: grid !important; }
    }
    @media screen {
      .print-header { display: none; }
    }
    .print-header {
      border: 2px solid #333;
      margin-bottom: 25px;
      background: white;
    }
    .print-header-content {
      padding: 30px;
      text-align: center;
      background: white;
      border-bottom: 3px solid #2196F3;
    }
    .print-company-name { 
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin: 0 0 10px 0;
      letter-spacing: 1px;
    }
    .print-subtitle { 
      font-size: 18px;
      font-weight: 600;
      color: #666;
      margin: 8px 0;
    }
    .print-company-info { 
      font-size: 12px;
      color: #555;
      margin: 3px 0;
      line-height: 1.5;
    }
  `

  return (
    <div>
      <style>{printStyles}</style>

      {/* Print-only header */}
      <div className="print-header">
        <div className="print-header-content">
          <div className="print-company-name">JJC ENGINEERING WORKS & GENERAL SERVICES</div>
          <div className="print-subtitle">Comprehensive Operations Progress Report</div>
          <div className="print-company-info">#119 Sto. Niño St. Brgy. San Jose, Antipolo City</div>
          <div className="print-company-info">Telefax: 650-7362 | Tel. #: 795-5816</div>
          <div className="print-company-info">E-mail: jjcengworks@yahoo.com</div>
          <div className="print-company-info" style={{ marginTop: "10px", fontWeight: "bold" }}>
            Generated:{" "}
            {new Date().toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 no-print">Reports & Analytics</h2>
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-md transition-colors font-medium shadow-sm"
            title="Refresh report data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila" })}
          </div>
        </div>
      </div>

      {/* Summary Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 avoid-break shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wide">Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 summary-grid">
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">Total Items</p>
            <p className="text-4xl font-bold text-gray-800 dark:text-gray-200">{stats.totalItems}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">Completed</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.completedItems}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">In Progress</p>
            <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.inProgressItems}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">Not Started</p>
            <p className="text-4xl font-bold text-gray-600 dark:text-gray-400">{stats.notStartedItems}</p>
          </div>
        </div>
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider font-semibold">Overall Progress</p>
          <p className="text-5xl font-bold text-gray-800 dark:text-gray-200">{stats.overallProgress}%</p>
        </div>
      </div>

      {/* Detailed Item Reports */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Detailed Item Reports</h3>
        {items.length > 0 ? (
          items.map((item, index) => {
            const progress = calculateItemProgress(item)

            // Calculate metrics
            const allEmployees = new Set()
            let totalActualHours = 0
            let totalExpectedHours = 0
            let totalExpectedQty = 0
            let totalCompletedQty = 0
            let totalPhaseTimeSeconds = 0

            item.phases?.forEach((phase) => {
              totalPhaseTimeSeconds += getPhaseElapsedTime(phase)

              phase.subphases?.forEach((subphase) => {
                if (subphase.employee_name) {
                  allEmployees.add(`${subphase.employee_name} (${subphase.employee_barcode})`)
                }
                totalActualHours += Number.parseFloat(subphase.actual_hours || 0)
                totalExpectedHours += Number.parseFloat(subphase.expected_duration || 0)
                totalExpectedQty += Number.parseInt(subphase.expected_quantity || 0)
                totalCompletedQty += Number.parseInt(subphase.current_completed_quantity || 0)
              })
            })

            const totalPhaseTimeHours = (totalPhaseTimeSeconds / 3600).toFixed(2)

            const totalPhases = item.phases?.length || 0
            const completedPhases = item.phases?.filter((p) => calculatePhaseProgress(p) === 100).length || 0
            const totalTasks = item.phases?.reduce((sum, phase) => sum + (phase.subphases?.length || 0), 0) || 0
            const completedTasks =
              item.phases?.reduce(
                (sum, phase) => sum + (phase.subphases?.filter((sp) => sp.completed == 1).length || 0),
                0,
              ) || 0

            const employeeCount = allEmployees.size
            const timeVariance = totalActualHours - totalExpectedHours
            const efficiency =
              totalExpectedHours > 0 ? ((totalExpectedHours / totalActualHours) * 100).toFixed(1) : "N/A"

            const itemKey = item.part_number || item.id

            return (
              <div
                key={itemKey}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden avoid-break shadow-sm"
                style={{ pageBreakBefore: index > 0 ? "always" : "auto" }}
              >
                {/* Item Header */}
                <div className="bg-gray-800 dark:bg-gray-900 p-5 border-b-4 border-blue-500">
                  <h4 className="text-xl font-bold text-white">
                    ITEM {index + 1}: {item.name}
                  </h4>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide">Basic Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Item Name:</span>
                        <p className="text-gray-800 dark:text-gray-200 font-bold text-base mt-1">{item.name}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Description:</span>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">{item.description || "N/A"}</p>
                      </div>
                      {item.part_number && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Part Number:</span>
                          <p className="text-gray-800 dark:text-gray-200 font-mono font-bold mt-1">{item.part_number}</p>
                        </div>
                      )}
                      {item.client_name && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Client:</span>
                          <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">{item.client_name}</p>
                        </div>
                      )}
                      {item.priority && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Priority:</span>
                          <span
                            className={`inline-block px-3 py-1 rounded-sm font-semibold text-white ml-2 text-xs ${item.priority === "High"
                              ? "bg-gray-800"
                              : item.priority === "Medium"
                                ? "bg-gray-600"
                                : "bg-gray-400"
                              }`}
                          >
                            {item.priority}
                          </span>
                        </div>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Batch Quantity:</span>
                          <p className="text-gray-800 dark:text-gray-200 font-bold mt-1">{item.quantity} units</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Progress */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide">Status & Progress</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Current Status:</span>
                        <span
                          className={`inline-block px-3 py-1 rounded-sm font-semibold ml-2 text-xs ${progress === 100 && item.end_time
                            ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400"
                            : progress > 0
                              ? "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                        >
                          {progress === 100
                            ? "Completed"
                            : progress > 0
                              ? "In Progress"
                              : "Not Started"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Overall Progress:</span>
                        <span
                          className={`inline-block px-3 py-1 rounded-sm font-bold text-lg ml-2 ${progress >= 80 ? "text-green-600" : progress >= 40 ? "text-orange-600" : "text-gray-600"
                            }`}
                        >
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Time Tracking */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Clock size={18} />
                      Time Tracking
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Start Time:</span>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold mt-1">
                          {(() => {
                            const firstPhase = item.phases?.[0];
                            return formatTimeForPH(firstPhase?.start_time || item.start_time);
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">End Time:</span>
                        <p className="text-gray-800 dark:text-gray-200 font-semibold mt-1">
                          {(() => {
                            const lastPhase = item.phases?.[item.phases.length - 1];
                            if (lastPhase?.end_time) {
                              return formatTimeForPH(lastPhase.end_time);
                            } else if (item.phases?.[0]?.start_time) {
                              return "In Progress";
                            } else {
                              return "Not Started";
                            }
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Duration:</span>
                        <p className="text-blue-600 dark:text-blue-400 font-bold font-mono text-lg mt-1">
                          {(() => {
                            const firstPhase = item.phases?.[0];
                            const lastPhase = item.phases?.[item.phases.length - 1];

                            if (!firstPhase?.start_time) return "00:00:00";

                            const startTime = new Date(firstPhase.start_time);
                            const endTime = lastPhase?.end_time ? new Date(lastPhase.end_time) : new Date();
                            const durationSeconds = Math.floor((endTime - startTime) / 1000);

                            return formatTime(durationSeconds);
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Work Breakdown */}
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide">Work Breakdown</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Phases</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{completedPhases}/{totalPhases}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Tasks</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{completedTasks}/{totalTasks}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Total Employees</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{employeeCount}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Task Completion Rate:{" "}
                      </span>
                      <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                        {totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Quantity Tracking */}
                  {totalExpectedQty > 0 && (
                    <div className="border-l-4 border-orange-500 pl-4">
                      <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Package size={18} />
                        Quantity Tracking
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Total Expected</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{totalExpectedQty}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Completed</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCompletedQty}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Remaining</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {totalExpectedQty - totalCompletedQty}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider font-semibold">Completion Rate</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                            {totalExpectedQty > 0 ? ((totalCompletedQty / totalExpectedQty) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personnel */}
                  <div className="border-l-4 border-teal-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <User size={18} />
                      Personnel & Resources
                    </h5>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Number of Employees:</span>
                        <span className="ml-2 text-lg font-bold text-gray-800 dark:text-gray-200">
                          {employeeCount} {employeeCount === 1 ? "employee" : "employees"}
                        </span>
                      </div>
                      {employeeCount > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-3">Employee Assignments:</span>
                          <div className="space-y-3">
                            {(() => {
                              const employeeMap = new Map();
                              item.phases?.forEach((phase) => {
                                phase.subphases?.forEach((subphase) => {
                                  if (subphase.employee_name) {
                                    const key = `${subphase.employee_name} (${subphase.employee_barcode})`;
                                    if (!employeeMap.has(key)) {
                                      employeeMap.set(key, []);
                                    }
                                    employeeMap.get(key).push({
                                      phaseName: phase.name,
                                      subphaseName: subphase.name,
                                      actualHours: subphase.actual_hours || 0,
                                      expectedHours: subphase.expected_duration || 0,
                                      completed: subphase.completed == 1
                                    });
                                  }
                                });
                              });

                              const entries = Array.from(employeeMap.entries());
                              const visibleEntries = showAll ? entries : entries.slice(0, 1);

                              return (
                                <>
                                  {visibleEntries.map(([employeeName, assignments], idx) => {
                                    const totalActual = assignments.reduce((sum, a) => sum + parseFloat(a.actualHours), 0);
                                    const totalExpected = assignments.reduce((sum, a) => sum + parseFloat(a.expectedHours), 0);
                                    const completedCount = assignments.filter(a => a.completed).length;
                                    const completionPercent = Math.round((completedCount / assignments.length) * 100);

                                    return (
                                      <div key={idx} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                                        <div className="flex justify-between items-start mb-2">
                                          <p className="font-bold text-gray-800 dark:text-gray-200">{employeeName}</p>
                                          <div className="text-right text-xs space-y-1">
                                            <p className="text-gray-600 dark:text-gray-400">
                                              <span className="font-semibold">Tasks:</span> {completedCount}/{assignments.length}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400">
                                              <span className="font-semibold">Complete:</span> {completionPercent}%
                                            </p>
                                            <div className="w-28 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-green-500 rounded-full transition-all"
                                                style={{ width: `${completionPercent}%` }}
                                              />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400">
                                              <span className="font-semibold">Hours:</span> {totalActual.toFixed(1)}h / {totalExpected.toFixed(1)}h
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1.5 mt-2">
                                          {assignments.map((assignment, assignIdx) => (
                                            <div key={assignIdx} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border-l-2 border-blue-400">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <span className={assignment.completed ? "text-green-600 dark:text-green-400 font-semibold" : "text-orange-600 dark:text-orange-400 font-semibold"}>
                                                    {assignment.completed ? "✓" : "○"}
                                                  </span>
                                                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                                                    {assignment.phaseName} → {assignment.subphaseName}
                                                  </span>
                                                </div>
                                                <span className="text-gray-600 dark:text-gray-400 text-xs ml-2 whitespace-nowrap">
                                                  {assignment.actualHours}h / {assignment.expectedHours}h
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {entries.length > 1 && (
                                    <button
                                      onClick={() => setShowAll(!showAll)}
                                      className="text-sm text-blue-600 dark:text-blue-400 mt-2 underline"
                                    >
                                      {showAll ? "Show Less" : `Show ${entries.length - 1} More`}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="border-l-4 border-cyan-500 pl-4">
                    <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide">Performance Metrics</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actual Phase Time (excl. pauses):</span>
                        <p className="text-gray-800 dark:text-gray-200 font-bold text-base mt-1">
                          {totalPhaseTimeHours} hours ({formatTime(totalPhaseTimeSeconds)})
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actual Hours Worked:</span>
                        <p className="text-gray-800 dark:text-gray-200 font-bold text-base mt-1">
                          {totalActualHours.toFixed(2)} hours
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Expected Hours:</span>
                        <p className="text-gray-800 dark:text-gray-200 font-bold text-base mt-1">
                          {totalExpectedHours.toFixed(2)} hours
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Time Variance:</span>
                        <p className={`font-bold text-base mt-1 ${timeVariance >= 0 ? "text-gray-600" : "text-green-600"}`}>
                          {timeVariance > 0 ? "+" : ""}
                          {timeVariance.toFixed(2)} hours
                          {timeVariance > 0 ? " (Over Budget)" : timeVariance < 0 ? " (Under Budget)" : " (On Budget)"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Efficiency Rate:</span>
                        <p
                          className={`font-bold text-base mt-1 ${efficiency !== "N/A" && Number.parseFloat(efficiency) < 100
                            ? "text-gray-600"
                            : "text-green-600"
                            }`}
                        >
                          {efficiency}
                          {typeof efficiency === "string" ? "" : "%"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {item.remarks && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-sm">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                        <FileText size={16} />
                        Remarks Summary:
                      </p>
                      <ul className="pl-5 mt-2 space-y-4 text-sm text-gray-800 dark:text-gray-200">
                        {item.remarks
                          .trim()
                          .split('\n')
                          .map((line, i) => {
                            const outMatch = line.match(
                              /\[(.*?)\] Transferred OUT (\d+) units to (.+?) \((.+?)\) - (.+?) > (.+?) \| From: (.+?) > (.+?): (.+)/
                            );
                            const inMatch = line.match(
                              /\[(.*?)\] Received IN (\d+) units from (.+?) \((.+?)\) - (.+?) > (.+?) \| To: (.+?) > (.+?): (.+)/
                            );

                            if (outMatch) {
                              const [
                                ,
                                timestamp,
                                qty,
                                client,
                                partNumberRaw,
                                targetPhase,
                                targetSubphase,
                                sourcePhase,
                                sourceSubphase,
                                note,
                              ] = outMatch;

                              const partNumber = partNumberRaw.split('-BATCH')[0];

                              return (
                                <li key={i}>
                                  <strong>Transaction {i + 1} – Transferred OUT</strong><br />
                                  Date & Time: {timestamp}<br />
                                  To: <strong>{client}</strong> (<code>Part Number: {partNumber}</code>)<br />
                                  Target: {targetPhase} &gt; {targetSubphase}<br />
                                  Source: {sourcePhase} &gt; {sourceSubphase}<br />
                                  Quantity: {qty} units<br />
                                  Note: {note}
                                </li>
                              );
                            }

                            if (inMatch) {
                              const [
                                ,
                                timestamp,
                                qty,
                                client,
                                partNumberRaw,
                                sourcePhase,
                                sourceSubphase,
                                targetPhase,
                                targetSubphase,
                                note,
                              ] = inMatch;

                              const partNumber = partNumberRaw.split('-BATCH')[0];

                              return (
                                <li key={i}>
                                  <strong>Transaction {i + 1} – Received IN</strong><br />
                                  Date & Time: {timestamp}<br />
                                  From: <strong>{client}</strong> (<code>Part Number: {partNumber}</code>)<br />
                                  Source: {sourcePhase} &gt; {sourceSubphase}<br />
                                  Target: {targetPhase} &gt; {targetSubphase}<br />
                                  Quantity: {qty} units<br />
                                  Note: {note}
                                </li>
                              );
                            }

                            return <li key={i}>{line}</li>;
                          })}
                      </ul>
                    </div>
                  )}

                  {/* Phase Details */}
                  {item.phases && item.phases.length > 0 && (
                    <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
                      <h5 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wide">PHASE DETAILS</h5>
                      <div className="space-y-4">
                        {item.phases.map((phase, phaseIndex) => {
                          const phaseProgress = calculatePhaseProgress(phase)
                          const phaseElapsedSeconds = getPhaseElapsedTime(phase)

                          return (
                            <div key={phase.id} className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 avoid-break border border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-center mb-3">
                                <h6 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                  Phase {phaseIndex + 1}: {phase.name}
                                  {phase.start_time && !phase.pause_time && !phase.end_time && (
                                    <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-sm">RUNNING</span>
                                  )}
                                  {phase.pause_time && !phase.end_time && (
                                    <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-1 rounded-sm">PAUSED</span>
                                  )}
                                  {phase.end_time && (
                                    <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-sm">COMPLETED</span>
                                  )}
                                </h6>
                                <div className="text-right">
                                  <span className={`font-bold text-lg ${phaseProgress >= 80 ? "text-green-600" : phaseProgress >= 40 ? "text-orange-600" : "text-gray-600"
                                    }`}>
                                    {phaseProgress}%
                                  </span>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1">
                                    Time: {formatTime(phaseElapsedSeconds)}
                                  </p>
                                </div>
                              </div>
                              {phase.subphases && phase.subphases.length > 0 && (
                                <div className="space-y-2 ml-4">
                                  {phase.subphases.map((subphase) => (
                                    <div
                                      key={subphase.id}
                                      className={`bg-white dark:bg-gray-800 p-3 rounded-sm border-l-4 ${subphase.completed == 1 ? "border-green-500" : "border-orange-500"
                                        }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="text-lg">{subphase.completed == 1 ? "✓" : "○"}</span>
                                        <div className="flex-1">
                                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                            {subphase.name}
                                          </p>
                                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
                                            <div>
                                              <strong>Expected:</strong> {subphase.expected_duration || 0}h
                                            </div>
                                            {subphase.expected_quantity > 0 && (
                                              <>
                                                <div>
                                                  <strong>Qty Expected:</strong> {subphase.expected_quantity}
                                                </div>
                                                <div>
                                                  <strong>Qty Completed:</strong>{" "}
                                                  {subphase.current_completed_quantity || 0}
                                                </div>
                                              </>
                                            )}
                                            {subphase.employee_name && (
                                              <div className="col-span-2">
                                                <strong>Employee:</strong> {subphase.employee_name} (
                                                {subphase.employee_barcode})
                                              </div>
                                            )}
                                            {subphase.subphase_condition && (
                                              <div className="col-span-2 italic">
                                                <strong>Condition:</strong> {subphase.subphase_condition}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              No items to report. Create items to see reports.
            </p>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 no-print shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide">Export Options</h3>
        <div className="flex gap-3">
          <button
            onClick={exportPDF}
            className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors font-medium flex items-center gap-2 shadow-sm"
          >
            <FileText size={18} />
            Export as PDF
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          Click the button above to open the print dialog. Data will be refreshed before export. Use "Save as PDF" or "Microsoft Print to PDF" option to
          export the report as a PDF file.
        </p>
      </div>
    </div>
  )
}

export default Reports
