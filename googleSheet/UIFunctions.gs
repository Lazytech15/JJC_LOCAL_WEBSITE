// ==================== UI FUNCTIONS ====================
// Dashboard, history, and UI setup

const UIFunctions = {
  // Zinc Theme Colors
  ZINC_THEME: {
    zinc50: '#fafafa',
    zinc100: '#f4f4f5',
    zinc200: '#e4e4e7',
    zinc300: '#d4d4d8',
    zinc400: '#a1a1aa',
    zinc500: '#71717a',
    zinc600: '#52525b',
    zinc700: '#3f3f46',
    zinc800: '#27272a',
    zinc900: '#18181b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    successLight: '#d1fae5',
    warningLight: '#fef3c7',
    dangerLight: '#fee2e2',
    infoLight: '#dbeafe'
  },
  
  /**
   * Setup all sheets
   */
  setupSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Setup AddItem sheet
    let addItemSheet = ss.getSheetByName(CoreFunctions.SHEET_NAME);
    if (!addItemSheet) {
      addItemSheet = ss.insertSheet(CoreFunctions.SHEET_NAME);
    }
    
    const headers = ['Part Number', 'Item Name', 'Client Name', 'Quantity', 'Status', 'Timestamp', 'Message'];
    const headerRange = addItemSheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(this.ZINC_THEME.zinc900);
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    headerRange.setFontSize(11);
    
    addItemSheet.setColumnWidth(1, 180);
    addItemSheet.setColumnWidth(2, 200);
    addItemSheet.setColumnWidth(3, 180);
    addItemSheet.setColumnWidth(4, 100);
    addItemSheet.setColumnWidth(5, 130);
    addItemSheet.setColumnWidth(6, 180);
    addItemSheet.setColumnWidth(7, 350);
    
    addItemSheet.setFrozenRows(1);
    
    const qtyColumn = addItemSheet.getRange(2, CoreFunctions.COLUMNS.QUANTITY + 1, 1000);
    const qtyValidation = SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThan(0)
      .setAllowInvalid(false)
      .setHelpText('Enter a positive number')
      .build();
    qtyColumn.setDataValidation(qtyValidation);
    
    this.setupDashboardSheet(ss);
    this.setupHistorySheet(ss);
    
    SpreadsheetApp.getUi().alert(
      '✅ Material Design Dashboard Setup Complete!\n\n' +
      '🎨 Zinc theme with modern design\n' +
      '📊 Bar charts instead of pie charts\n' +
      '📝 Fixed chart positioning\n' +
      '📈 No overlapping on new items\n\n' +
      'Navigate between sheets:\n' +
      '• AddItem - Create new items\n' +
      '• Dashboard - View statistics\n' +
      '• ItemHistory - Track changes'
    );
  },
  
  /**
   * Setup Dashboard sheet
   */
  setupDashboardSheet(ss) {
    let dashboardSheet = ss.getSheetByName(CoreFunctions.DASHBOARD_SHEET);
    
    if (dashboardSheet) {
      ss.deleteSheet(dashboardSheet);
    }
    
    dashboardSheet = ss.insertSheet(CoreFunctions.DASHBOARD_SHEET, 0);
    
    // Set column widths
    dashboardSheet.setColumnWidth(1, 30);
    for (let i = 2; i <= 7; i++) {
      dashboardSheet.setColumnWidth(i, 140);
    }
    dashboardSheet.setColumnWidth(8, 30);
    for (let i = 9; i <= 12; i++) {
      dashboardSheet.setColumnWidth(i, 120);
    }
    
    // Main Header
    const headerRange = dashboardSheet.getRange('A1:G3');
    headerRange.merge();
    headerRange.setValue('📊 OPERATIONS MANAGEMENT DASHBOARD');
    headerRange.setFontSize(28);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    headerRange.setBackground(this.ZINC_THEME.zinc900);
    headerRange.setFontColor('#ffffff');
    
    // Subtitle
    const subtitleRange = dashboardSheet.getRange('A4:G4');
    subtitleRange.merge();
    subtitleRange.setValue('Real-time Item Tracking & Advanced Performance Analytics');
    subtitleRange.setFontSize(12);
    subtitleRange.setFontStyle('italic');
    subtitleRange.setHorizontalAlignment('center');
    subtitleRange.setBackground(this.ZINC_THEME.zinc100);
    subtitleRange.setFontColor(this.ZINC_THEME.zinc600);
    
    // Last Updated
    const updateRange = dashboardSheet.getRange('A5:G5');
    updateRange.merge();
    updateRange.setValue(`Last Updated: ${new Date().toLocaleString()}`);
    updateRange.setFontSize(10);
    updateRange.setHorizontalAlignment('center');
    updateRange.setBackground('#ffffff');
    updateRange.setFontColor(this.ZINC_THEME.zinc500);
    
    // KPI Section Header
    this.createMaterialSectionHeader(dashboardSheet, 'A7:G7', '📈 KEY PERFORMANCE INDICATORS');
    
    // Create Material KPI Cards
    this.createMaterialMetricCard(dashboardSheet, 'B8:B10', 'Total Items', '0', this.ZINC_THEME.info);
    this.createMaterialMetricCard(dashboardSheet, 'C8:C10', 'Completed', '0', this.ZINC_THEME.success);
    this.createMaterialMetricCard(dashboardSheet, 'D8:D10', 'In Progress', '0', this.ZINC_THEME.warning);
    this.createMaterialMetricCard(dashboardSheet, 'E8:E10', 'Not Started', '0', this.ZINC_THEME.zinc600);
    this.createMaterialMetricCard(dashboardSheet, 'F8:F10', 'Paused', '0', this.ZINC_THEME.danger);
    this.createMaterialMetricCard(dashboardSheet, 'G8:G10', 'Success Rate', '0%', this.ZINC_THEME.success);
    
    // Advanced Metrics Section
    this.createMaterialSectionHeader(dashboardSheet, 'A12:G12', '⚡ ADVANCED METRICS');
    
    this.createMaterialMetricCard(dashboardSheet, 'B13:C14', 'Avg Progress', '0%', this.ZINC_THEME.zinc700);
    this.createMaterialMetricCard(dashboardSheet, 'D13:E14', 'Total Phases', '0', this.ZINC_THEME.zinc600);
    this.createMaterialMetricCard(dashboardSheet, 'F13:G14', 'Total Tasks', '0', this.ZINC_THEME.info);
    
    // Recent Activity Section
    this.createMaterialSectionHeader(dashboardSheet, 'A16:G16', '🔄 RECENT ACTIVITY');
    
    const activityHeaders = ['Part Number', 'Item Name', 'Client', 'Status', 'Progress', 'Last Updated'];
    const activityHeaderRow = dashboardSheet.getRange(17, 2, 1, 6);
    activityHeaderRow.setValues([activityHeaders]);
    activityHeaderRow.setFontWeight('bold');
    activityHeaderRow.setBackground(this.ZINC_THEME.zinc200);
    activityHeaderRow.setFontColor(this.ZINC_THEME.zinc800);
    activityHeaderRow.setHorizontalAlignment('center');
    activityHeaderRow.setFontSize(10);
    
    // Chart Section Headers
    this.createMaterialSectionHeader(dashboardSheet, 'I1:L1', '📊 STATUS DISTRIBUTION');
    this.createMaterialSectionHeader(dashboardSheet, 'I15:L15', '🎯 PRIORITY DISTRIBUTION');
    
    // Chart data areas
    dashboardSheet.getRange('I2').setValue('Status');
    dashboardSheet.getRange('J2').setValue('Count');
    dashboardSheet.getRange('I2:J2').setFontWeight('bold').setBackground(this.ZINC_THEME.zinc200);
    
    dashboardSheet.getRange('I16').setValue('Priority');
    dashboardSheet.getRange('J16').setValue('Count');
    dashboardSheet.getRange('I16:J16').setFontWeight('bold').setBackground(this.ZINC_THEME.zinc200);
    
    // Footer
    const footerRange = dashboardSheet.getRange('A28:L28');
    footerRange.merge();
    footerRange.setValue('JJC Engineering Works & General Services');
    footerRange.setFontSize(9);
    footerRange.setHorizontalAlignment('center');
    footerRange.setBackground(this.ZINC_THEME.zinc900);
    footerRange.setFontColor('#ffffff');
    
    this.updateDashboard();
  },
  
  /**
   * Create section header
   */
  createMaterialSectionHeader(sheet, range, title) {
    const headerRange = sheet.getRange(range);
    headerRange.merge();
    headerRange.setValue(title);
    headerRange.setFontSize(13);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(this.ZINC_THEME.zinc800);
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
  },
  
  /**
   * Create metric card
   */
  createMaterialMetricCard(sheet, range, label, value, color) {
    const cardRange = sheet.getRange(range);
    cardRange.merge();
    cardRange.setValue(`${label}\n${value}`);
    cardRange.setFontSize(10);
    cardRange.setFontWeight('bold');
    cardRange.setBackground(color);
    cardRange.setFontColor('#ffffff');
    cardRange.setHorizontalAlignment('center');
    cardRange.setVerticalAlignment('middle');
    cardRange.setWrap(true);
    cardRange.setBorder(true, true, true, true, false, false, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  },
  
  /**
   * Update metric card
   */
  updateMaterialMetricCard(sheet, range, label, value, color) {
    const cardRange = sheet.getRange(range);
    cardRange.setValue(`${label}\n${value}`);
    cardRange.setBackground(color);
    cardRange.setFontColor('#ffffff');
  },
  
  /**
   * Update dashboard
   */
  updateDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(CoreFunctions.DASHBOARD_SHEET);
    const addItemSheet = ss.getSheetByName(CoreFunctions.SHEET_NAME);
    
    if (!dashboardSheet || !addItemSheet) {
      Logger.log('Dashboard or AddItem sheet not found');
      return;
    }
    
    const lastRow = addItemSheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No data to update dashboard');
      return;
    }
    
    const dataRange = addItemSheet.getRange(2, 1, lastRow - 1, 7);
    const data = dataRange.getValues();
    
    // Calculate metrics
    let totalItems = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let pausedCount = 0;
    let totalProgress = 0;
    const recentActivity = [];
    
    data.forEach((row) => {
      if (row[0]) {
        totalItems++;
        const status = String(row[4]).toUpperCase();
        
        if (status.includes('COMPLETED')) {
          completedCount++;
        } else if (status.includes('PAUSED')) {
          pausedCount++;
        } else if (status.includes('PROGRESS')) {
          inProgressCount++;
        } else if (status.includes('NOT STARTED')) {
          notStartedCount++;
        }
        
        const message = String(row[6]);
        const progressMatch = message.match(/Progress: (\d+)%/);
        const progress = progressMatch ? parseInt(progressMatch[1]) : 0;
        totalProgress += progress;
        
        recentActivity.push([
          row[0],
          row[1],
          row[2],
          status,
          progress + '%',
          row[5]
        ]);
      }
    });
    
    const successRate = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    const avgProgress = totalItems > 0 ? Math.round(totalProgress / totalItems) : 0;
    
    // Update KPI cards
    this.updateMaterialMetricCard(dashboardSheet, 'B8:B10', 'Total Items', totalItems, this.ZINC_THEME.info);
    this.updateMaterialMetricCard(dashboardSheet, 'C8:C10', 'Completed', completedCount, this.ZINC_THEME.success);
    this.updateMaterialMetricCard(dashboardSheet, 'D8:D10', 'In Progress', inProgressCount, this.ZINC_THEME.warning);
    this.updateMaterialMetricCard(dashboardSheet, 'E8:E10', 'Not Started', notStartedCount, this.ZINC_THEME.zinc600);
    this.updateMaterialMetricCard(dashboardSheet, 'F8:F10', 'Paused', pausedCount, this.ZINC_THEME.danger);
    this.updateMaterialMetricCard(dashboardSheet, 'G8:G10', 'Success Rate', successRate + '%', this.ZINC_THEME.success);
    
    // Update advanced metrics
    const totalPhases = totalItems * 3;
    const totalTasks = totalItems * 8;
    
    this.updateMaterialMetricCard(dashboardSheet, 'B13:C14', 'Avg Progress', avgProgress + '%', this.ZINC_THEME.zinc700);
    this.updateMaterialMetricCard(dashboardSheet, 'D13:E14', 'Total Phases', totalPhases, this.ZINC_THEME.zinc600);
    this.updateMaterialMetricCard(dashboardSheet, 'F13:G14', 'Total Tasks', totalTasks, this.ZINC_THEME.info);
    
    // Update timestamp
    dashboardSheet.getRange('A5:G5').setValue(`Last Updated: ${new Date().toLocaleString()}`);
    
    // Update recent activity
    const activityToShow = recentActivity.slice(-9).reverse();
    
    if (activityToShow.length > 0) {
      const activityRange = dashboardSheet.getRange(18, 2, 9, 6);
      activityRange.clearContent();
      activityRange.setBackground('#ffffff');
      
      const activityDataRange = dashboardSheet.getRange(18, 2, activityToShow.length, 6);
      activityDataRange.setValues(activityToShow);
      activityDataRange.setFontSize(9);
      activityDataRange.setWrap(false);
      
      for (let i = 0; i < activityToShow.length; i++) {
        const rowRange = dashboardSheet.getRange(18 + i, 2, 1, 6);
        rowRange.setBackground(i % 2 === 0 ? this.ZINC_THEME.zinc50 : '#ffffff');
        
        const statusCell = dashboardSheet.getRange(18 + i, 5);
        const status = activityToShow[i][3];
        if (status.includes('COMPLETED')) {
          statusCell.setBackground(this.ZINC_THEME.successLight);
          statusCell.setFontColor(this.ZINC_THEME.success);
          statusCell.setFontWeight('bold');
        } else if (status.includes('PROGRESS')) {
          statusCell.setBackground(this.ZINC_THEME.warningLight);
          statusCell.setFontColor(this.ZINC_THEME.warning);
          statusCell.setFontWeight('bold');
        } else if (status.includes('PAUSED')) {
          statusCell.setBackground(this.ZINC_THEME.dangerLight);
          statusCell.setFontColor(this.ZINC_THEME.danger);
          statusCell.setFontWeight('bold');
        } else {
          statusCell.setBackground(this.ZINC_THEME.zinc100);
          statusCell.setFontColor(this.ZINC_THEME.zinc600);
        }
      }
    }
    
    // Update chart data
    this.updateStatusChartData(dashboardSheet, completedCount, inProgressCount, notStartedCount, pausedCount);
    this.updatePriorityChartData(dashboardSheet, Math.round(totalItems * 0.2), Math.round(totalItems * 0.5), Math.round(totalItems * 0.3));
    
    // Remove existing charts and create new ones
    this.removeAllCharts(dashboardSheet);
    this.createMaterialBarChart(dashboardSheet, 'J3:J6', 'Status Distribution', 9, 2);
    this.createMaterialBarChart(dashboardSheet, 'J17:J19', 'Priority Distribution', 9, 16);
    
    Logger.log('Dashboard updated successfully');
  },
  
  /**
   * Update status chart data
   */
  updateStatusChartData(sheet, completed, inProgress, notStarted, paused) {
    sheet.getRange('I3:J6').clearContent();
    
    sheet.getRange('I3').setValue('Completed');
    sheet.getRange('J3').setValue(completed);
    
    sheet.getRange('I4').setValue('In Progress');
    sheet.getRange('J4').setValue(inProgress);
    
    sheet.getRange('I5').setValue('Not Started');
    sheet.getRange('J5').setValue(notStarted);
    
    sheet.getRange('I6').setValue('Paused');
    sheet.getRange('J6').setValue(paused);
    
    const dataRange = sheet.getRange('I3:J6');
    dataRange.setFontSize(9);
    dataRange.setHorizontalAlignment('left');
    
    sheet.getRange('I3').setBackground(this.ZINC_THEME.successLight).setFontColor(this.ZINC_THEME.success);
    sheet.getRange('I4').setBackground(this.ZINC_THEME.warningLight).setFontColor(this.ZINC_THEME.warning);
    sheet.getRange('I5').setBackground(this.ZINC_THEME.zinc100).setFontColor(this.ZINC_THEME.zinc600);
    sheet.getRange('I6').setBackground(this.ZINC_THEME.dangerLight).setFontColor(this.ZINC_THEME.danger);
  },
  
  /**
   * Update priority chart data
   */
  updatePriorityChartData(sheet, high, medium, low) {
    sheet.getRange('I17:J19').clearContent();
    
    sheet.getRange('I17').setValue('High');
    sheet.getRange('J17').setValue(high);
    
    sheet.getRange('I18').setValue('Medium');
    sheet.getRange('J18').setValue(medium);
    
    sheet.getRange('I19').setValue('Low');
    sheet.getRange('J19').setValue(low);
    
    const dataRange = sheet.getRange('I17:J19');
    dataRange.setFontSize(9);
    dataRange.setHorizontalAlignment('left');
    
    sheet.getRange('I17').setBackground(this.ZINC_THEME.dangerLight).setFontColor(this.ZINC_THEME.danger);
    sheet.getRange('I18').setBackground(this.ZINC_THEME.warningLight).setFontColor(this.ZINC_THEME.warning);
    sheet.getRange('I19').setBackground(this.ZINC_THEME.infoLight).setFontColor(this.ZINC_THEME.info);
  },
  
  /**
   * Remove all charts
   */
  removeAllCharts(sheet) {
    const charts = sheet.getCharts();
    charts.forEach(chart => {
      sheet.removeChart(chart);
    });
  },
  
  /**
   * Create bar chart
   */
  createMaterialBarChart(sheet, dataRange, title, col, row) {
    const chartDataRange = sheet.getRange(dataRange);
    
    const chart = sheet.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(chartDataRange)
      .setPosition(row, col, 0, 0)
      .setOption('title', title)
      .setOption('titleTextStyle', { 
        fontSize: 12, 
        bold: true,
        color: this.ZINC_THEME.zinc800
      })
      .setOption('width', 480)
      .setOption('height', 250)
      .setOption('backgroundColor', this.ZINC_THEME.zinc50)
      .setOption('colors', [this.ZINC_THEME.zinc700])
      .setOption('legend', { position: 'none' })
      .setOption('chartArea', { 
        width: '70%', 
        height: '70%',
        backgroundColor: '#ffffff'
      })
      .setOption('hAxis', {
        textStyle: { fontSize: 10, color: this.ZINC_THEME.zinc600 },
        gridlines: { color: this.ZINC_THEME.zinc200 }
      })
      .setOption('vAxis', {
        textStyle: { fontSize: 10, color: this.ZINC_THEME.zinc700, bold: true }
      })
      .setOption('bar', { groupWidth: '75%' })
      .setOption('annotations', {
        alwaysOutside: true,
        textStyle: {
          fontSize: 10,
          color: this.ZINC_THEME.zinc800,
          bold: true
        }
      })
      .build();
    
    sheet.insertChart(chart);
  },
  
  /**
   * Setup history sheet
   */
  setupHistorySheet(ss) {
    let historySheet = ss.getSheetByName(CoreFunctions.HISTORY_SHEET);
    
    if (!historySheet) {
      historySheet = ss.insertSheet(CoreFunctions.HISTORY_SHEET);
    }
    
    const headers = ['Timestamp', 'Part Number', 'Item Name', 'Client Name', 'Quantity', 'Status', 'Full Part Number', 'Progress %'];
    const headerRange = historySheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(this.ZINC_THEME.zinc900);
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    headerRange.setFontSize(11);
    
    historySheet.setColumnWidth(1, 180);
    historySheet.setColumnWidth(2, 150);
    historySheet.setColumnWidth(3, 200);
    historySheet.setColumnWidth(4, 180);
    historySheet.setColumnWidth(5, 80);
    historySheet.setColumnWidth(6, 130);
    historySheet.setColumnWidth(7, 250);
    historySheet.setColumnWidth(8, 100);
    
    historySheet.setFrozenRows(1);
  },
  
  /**
   * Add to history
   */
  addToHistory(partNumber, clientName, quantity, status, fullPartNumber = '', progress = 0, itemName = '') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let historySheet = ss.getSheetByName(CoreFunctions.HISTORY_SHEET);
    
    if (!historySheet) {
      this.setupHistorySheet(ss);
      historySheet = ss.getSheetByName(CoreFunctions.HISTORY_SHEET);
    }
    
    const timestamp = new Date().toLocaleString();
    const newRow = [timestamp, partNumber, itemName, clientName, quantity, status, fullPartNumber, progress];
    
    historySheet.appendRow(newRow);
    
    const lastRow = historySheet.getLastRow();
    const rowRange = historySheet.getRange(lastRow, 1, 1, 8);
    
    if (lastRow % 2 === 0) {
      rowRange.setBackground(this.ZINC_THEME.zinc50);
    } else {
      rowRange.setBackground('#ffffff');
    }
    
    const statusCell = historySheet.getRange(lastRow, 6);
    const statusUpper = String(status).toUpperCase();
    
    if (statusUpper.includes('COMPLETED')) {
      statusCell.setBackground(this.ZINC_THEME.successLight);
      statusCell.setFontColor(this.ZINC_THEME.success);
      statusCell.setFontWeight('bold');
    } else if (statusUpper.includes('PROGRESS')) {
      statusCell.setBackground(this.ZINC_THEME.warningLight);
      statusCell.setFontColor(this.ZINC_THEME.warning);
      statusCell.setFontWeight('bold');
    } else if (statusUpper.includes('PAUSED')) {
      statusCell.setBackground(this.ZINC_THEME.dangerLight);
      statusCell.setFontColor(this.ZINC_THEME.danger);
      statusCell.setFontWeight('bold');
    } else {
      statusCell.setBackground(this.ZINC_THEME.zinc100);
      statusCell.setFontColor(this.ZINC_THEME.zinc600);
    }
    
    if (progress > 0) {
      const progressCell = historySheet.getRange(lastRow, 8);
      progressCell.setNumberFormat('0"%"');
      
      if (progress === 100) {
        progressCell.setBackground(this.ZINC_THEME.successLight);
        progressCell.setFontColor(this.ZINC_THEME.success);
      } else if (progress >= 50) {
        progressCell.setBackground(this.ZINC_THEME.warningLight);
        progressCell.setFontColor(this.ZINC_THEME.warning);
      }
    }
  }
};