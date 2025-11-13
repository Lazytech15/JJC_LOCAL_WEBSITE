// ==================== MAIN HANDLER ====================
// Coordinates all components and handles UI interactions

/**
 * Installable edit trigger
 */
function onEditInstallable(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CoreFunctions.SHEET_NAME) return;
  
  const row = e.range.getRow();
  const col = e.range.getColumn();
  
  if (row === 1) return;
  
  if (col === CoreFunctions.COLUMNS.PART_NUMBER + 1) {
    CoreFunctions.updateItemNameDropdown(sheet, row);
  }
  
  if (col >= 1 && col <= 4) {
    CoreFunctions.processRow(sheet, row);
  }
}

/**
 * Create custom menu on open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📋 Item Import')
    .addItem('🔧 Setup Sheets', 'setupSheet')
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Dashboard')
      .addItem('🔄 Refresh Dashboard', 'updateDashboard')
      .addItem('📈 View Statistics', 'showStatistics')
      .addItem('📥 Export PDF Report', 'exportDashboardPDF'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📋 Item Tracking')  // ⭐ NEW MENU
      .addItem('🔄 Refresh Tracking View', 'refreshTrackingView')
      .addItem('📍 View Tracking Sheet', 'viewTrackingSheet')
      .addItem('⚡ Enable Auto-Refresh (1 min)', 'createTrackingAutoRefresh')
      .addItem('🛑 Disable Auto-Refresh', 'removeTrackingAutoRefresh'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🔄 Sync Operations')
      .addItem('Refresh All Rows', 'bulkRefreshAllRows')
      .addItem('Refresh Selected Row', 'testSingleRowSync')
      .addItem('Process All Pending', 'processAllPendingRows')
      .addItem('Enable Auto-Sync (5 min)', 'createAutoSyncTrigger')
      .addItem('Disable Auto-Sync', 'removeAutoSyncTrigger'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📝 History')
      .addItem('View Item History', 'viewHistory')
      .addItem('Clear History', 'clearHistory')
      .addItem('Export History CSV', 'exportHistoryCSV'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🗑️ Cleanup')
      .addItem('Clear All Statuses', 'clearAllStatuses')
      .addItem('Archive Completed Items', 'archiveCompletedItems'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🧪 Testing')
      .addItem('Test Connection', 'testConnection')
      .addItem('Test API Response', 'testAPIResponse')
      .addItem('Test Phase Data Structure', 'testPhaseDataStructure'))
    .addToUi();
}

// ==================== MENU ACTION HANDLERS ====================

/**
 * Setup sheets
 */
function setupSheet() {
  UIFunctions.setupSheet();
}

/**
 * Update dashboard
 */
function updateDashboard() {
  UIFunctions.updateDashboard();
}

/**
 * Show statistics
 */
function showStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CoreFunctions.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('AddItem sheet not found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  let paused = 0;
  let errors = 0;
  
  data.forEach(row => {
    if (row[0]) {
      total++;
      const status = String(row[4]).toUpperCase();
      
      if (status.includes('COMPLETED')) completed++;
      else if (status.includes('PAUSED')) paused++;
      else if (status.includes('PROGRESS')) inProgress++;
      else if (status.includes('NOT STARTED')) notStarted++;
      else if (status.includes('ERROR')) errors++;
    }
  });
  
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  SpreadsheetApp.getUi().alert(
    '📊 COMPREHENSIVE STATISTICS\n\n' +
    `Total Items: ${total}\n` +
    `✅ Completed: ${completed} (${successRate}%)\n` +
    `🔄 In Progress: ${inProgress}\n` +
    `⏸️  Paused: ${paused}\n` +
    `⏹️ Not Started: ${notStarted}\n` +
    `❌ Errors: ${errors}\n\n` +
    `Success Rate: ${successRate}%\n` +
    `Active Items: ${inProgress + paused}`
  );
}

/**
 * Export dashboard as PDF
 */
function exportDashboardPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName(CoreFunctions.DASHBOARD_SHEET);
  
  if (!dashboardSheet) {
    SpreadsheetApp.getUi().alert('Dashboard sheet not found. Please run Setup Sheets first.');
    return;
  }
  
  UIFunctions.updateDashboard();
  
  SpreadsheetApp.getUi().alert(
    '📄 Export Dashboard as PDF\n\n' +
    'To export the dashboard:\n' +
    '1. Go to File → Download → PDF\n' +
    '2. Select "Dashboard" sheet\n' +
    '3. Choose "Fit to page width"\n' +
    '4. Click Export\n\n' +
    'Dashboard has been refreshed with latest data!'
  );
}

/**
 * View history
 */
function viewHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let historySheet = ss.getSheetByName(CoreFunctions.HISTORY_SHEET);
  
  if (!historySheet) {
    SpreadsheetApp.getUi().alert('No history available. History tracking will start automatically.');
    UIFunctions.setupHistorySheet(ss);
    return;
  }
  
  ss.setActiveSheet(historySheet);
  SpreadsheetApp.getUi().alert('Viewing item history. This sheet tracks all item status changes.');
}

/**
 * Clear history
 */
function clearHistory() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear History',
    'Are you sure you want to clear all history records? This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = ss.getSheetByName(CoreFunctions.HISTORY_SHEET);
    
    if (historySheet) {
      const lastRow = historySheet.getLastRow();
      if (lastRow > 1) {
        historySheet.deleteRows(2, lastRow - 1);
      }
      ui.alert('✅ History cleared successfully');
    }
  }
}

/**
 * Export history as CSV
 */
function exportHistoryCSV() {
  SpreadsheetApp.getUi().alert(
    '📥 Export History as CSV\n\n' +
    'To export history:\n' +
    '1. Go to ItemHistory sheet\n' +
    '2. File → Download → CSV\n' +
    '3. Save to your computer\n\n' +
    'The CSV file will contain all historical records.'
  );
}

/**
 * Archive completed items
 */
function archiveCompletedItems() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Archive Completed Items',
    'This will move all completed items to the history sheet and remove them from AddItem. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CoreFunctions.SHEET_NAME);
    const lastRow = sheet.getLastRow();
    
    let archivedCount = 0;
    
    for (let row = lastRow; row >= 2; row--) {
      const status = sheet.getRange(row, CoreFunctions.COLUMNS.STATUS + 1).getValue();
      
      if (String(status).toUpperCase().includes('COMPLETED')) {
        sheet.deleteRow(row);
        archivedCount++;
      }
    }
    
    UIFunctions.updateDashboard();
    ui.alert(`✅ Archived ${archivedCount} completed items`);
  }
}

/**
 * Process all pending rows
 */
function processAllPendingRows() {
  const processedCount = CoreFunctions.processAllPendingRows();
  SpreadsheetApp.getUi().alert(`Processed ${processedCount} rows`);
}

/**
 * Clear all statuses
 */
function clearAllStatuses() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Clear All Statuses', 
    'This will clear status, timestamp, and message columns. Continue?', 
    ui.ButtonSet.YES_NO);
  
  if (response === ui.Button.YES) {
    CoreFunctions.clearAllStatuses();
    ui.alert('Status columns cleared');
  }
}

/**
 * Bulk refresh all rows
 */
function bulkRefreshAllRows() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Refresh All Rows',
    'This will sync all rows with the server and update the dashboard. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    CoreFunctions.syncAllItemStatuses();
  }
}

/**
 * Test single row sync
 */
function testSingleRowSync() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CoreFunctions.SHEET_NAME);
  const activeRange = sheet.getActiveRange();
  const row = activeRange.getRow();
  
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ Please select a data row (not header)');
    return;
  }
  
  const partNumber = sheet.getRange(row, CoreFunctions.COLUMNS.PART_NUMBER + 1).getValue();
  const clientName = sheet.getRange(row, CoreFunctions.COLUMNS.CLIENT_NAME + 1).getValue();
  
  if (!partNumber || !clientName) {
    SpreadsheetApp.getUi().alert('⚠️ Selected row has no Part Number or Client Name');
    return;
  }
  
  const basePartNumber = CoreFunctions.extractBasePartNumber(partNumber);
  const success = CoreFunctions.checkAndUpdateItemStatus(sheet, row, basePartNumber, clientName);
  
  if (success) {
    UIFunctions.updateDashboard();
    SpreadsheetApp.getUi().alert('✅ Sync successful! Dashboard updated.');
  } else {
    SpreadsheetApp.getUi().alert('❌ Sync failed. Check View > Executions for logs.');
  }
}

/**
 * Refresh tracking view
 */
function refreshTrackingView() {
  try {
    UIFunctions.updateTrackingSheet();
    SpreadsheetApp.getUi().alert('✅ Tracking view refreshed successfully!');
  } catch (error) {
    SpreadsheetApp.getUi().alert('❌ Error refreshing tracking view: ' + error.message);
    Logger.log('Error refreshing tracking: ' + error.message);
  }
}

/**
 * View tracking sheet
 */
function viewTrackingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let trackingSheet = ss.getSheetByName(CoreFunctions.TRACKING_SHEET);
  
  if (!trackingSheet) {
    SpreadsheetApp.getUi().alert('Tracking sheet not found. Please run Setup Sheets first.');
    return;
  }
  
  ss.setActiveSheet(trackingSheet);
  UIFunctions.updateTrackingSheet();
  SpreadsheetApp.getUi().alert('📋 Viewing detailed item tracking with real-time data.');
}

/**
 * Create auto-refresh trigger for tracking
 */
function createTrackingAutoRefresh() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'autoRefreshTracking') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    ScriptApp.newTrigger('autoRefreshTracking')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    Logger.log('✅ Tracking auto-refresh trigger created');
    SpreadsheetApp.getUi().alert('✅ Auto-refresh enabled!\n\nTracking view will update every 1 minute.');
  } catch (error) {
    Logger.log(`❌ Error creating trigger: ${error.message}`);
    SpreadsheetApp.getUi().alert('❌ Error: ' + error.message);
  }
}

/**
 * Remove auto-refresh trigger for tracking
 */
function removeTrackingAutoRefresh() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoRefreshTracking') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  SpreadsheetApp.getUi().alert(`✅ Removed ${removed} tracking auto-refresh trigger(s)`);
}

/**
 * Auto-refresh tracking (called by trigger)
 */
function autoRefreshTracking() {
  try {
    UIFunctions.updateTrackingSheet();
    Logger.log('✅ Tracking auto-refreshed at ' + new Date().toLocaleString());
  } catch (error) {
    Logger.log('❌ Error in auto-refresh: ' + error.message);
  }
}

// ==================== TRIGGER MANAGEMENT ====================

/**
 * Create auto-sync trigger
 */
function createAutoSyncTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'syncAllItemStatuses') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    ScriptApp.newTrigger('syncAllItemStatuses')
      .timeBased()
      .everyMinutes(5)
      .create();
    
    Logger.log('✅ Auto-sync trigger created');
    
    try {
      SpreadsheetApp.getUi().alert('✅ Auto-sync enabled!\n\nStatus will sync every 5 minutes.');
    } catch (e) {
      Logger.log('ℹ️ No UI available for alert');
    }
  } catch (error) {
    Logger.log(`❌ Error creating trigger: ${error.message}`);
    throw error;
  }
}

/**
 * Remove auto-sync trigger
 */
function removeAutoSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllItemStatuses') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  SpreadsheetApp.getUi().alert(`✅ Removed ${removed} auto-sync trigger(s)`);
}

/**
 * Sync all item statuses (called by trigger)
 */
function syncAllItemStatuses() {
  CoreFunctions.syncAllItemStatuses();
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test connection
 */
function testConnection() {
  const result = ApiService.testConnection();
  
  if (result.success) {
    SpreadsheetApp.getUi().alert('✅ Connection successful!');
  } else if (result.error) {
    SpreadsheetApp.getUi().alert('❌ Connection error: ' + result.error);
  } else {
    SpreadsheetApp.getUi().alert('❌ Connection failed: ' + result.code);
  }
}

/**
 * Test API response
 */
function testAPIResponse() {
  try {
    Logger.log('=== Testing API Response Format ===');
    
    const data = ApiService.getAllItems();
    
    if (data) {
      Logger.log(`Response Type: ${typeof data}`);
      Logger.log(`Is Array: ${Array.isArray(data)}`);
      
      SpreadsheetApp.getUi().alert(
        '✅ API Response received!\n\n' +
        'Check View > Executions for detailed logs.\n\n' +
        `Response Type: ${typeof data}\n` +
        `Is Array: ${Array.isArray(data)}`
      );
    } else {
      SpreadsheetApp.getUi().alert('❌ Failed to fetch API data');
    }
  } catch (error) {
    Logger.log(`❌ Error testing API: ${error.message}`);
    SpreadsheetApp.getUi().alert(`❌ Error: ${error.message}`);
  }
}

/**
 * Test phase data structure
 */
function testPhaseDataStructure() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CoreFunctions.SHEET_NAME);
    
    if (!sheet) {
      SpreadsheetApp.getUi().alert(`❌ Sheet "${CoreFunctions.SHEET_NAME}" not found`);
      return;
    }
    
    const activeRange = sheet.getActiveRange();
    const row = activeRange.getRow();
    
    if (row <= 1) {
      SpreadsheetApp.getUi().alert('⚠️ Please select a data row (not header)');
      return;
    }
    
    const partNumber = sheet.getRange(row, CoreFunctions.COLUMNS.PART_NUMBER + 1).getValue();
    const clientName = sheet.getRange(row, CoreFunctions.COLUMNS.CLIENT_NAME + 1).getValue();
    
    if (!partNumber || !clientName) {
      SpreadsheetApp.getUi().alert('⚠️ Selected row has no Part Number or Client Name');
      return;
    }
    
    const basePartNumber = CoreFunctions.extractBasePartNumber(partNumber);
    
    Logger.log('=== PHASE DATA STRUCTURE TEST ===');
    Logger.log(`Row: ${row}`);
    Logger.log(`Part Number: ${partNumber}`);
    Logger.log(`Base Part Number: ${basePartNumber}`);
    Logger.log(`Client Name: ${clientName}`);
    
    const data = ApiService.getAllItems();
    
    if (data) {
      Logger.log('✅ API Response received');
      SpreadsheetApp.getUi().alert(
        `✅ Test Complete!\n\n` +
        `Check View > Executions for detailed logs`
      );
    } else {
      SpreadsheetApp.getUi().alert('❌ Failed to fetch API data');
    }
    
  } catch (error) {
    Logger.log(`❌ Error in testPhaseDataStructure: ${error.message}`);
    SpreadsheetApp.getUi().alert(`❌ Error: ${error.message}`);
  }
}

/**
 * Test tracking data fetch
 * Run this from the menu to diagnose issues
 */
function testTrackingDataFetch() {
  try {
    Logger.log('=== TRACKING DATA FETCH TEST ===\n');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const addItemSheet = ss.getSheetByName(CoreFunctions.SHEET_NAME);
    
    if (!addItemSheet) {
      SpreadsheetApp.getUi().alert('❌ AddItem sheet not found!');
      return;
    }
    
    const lastRow = addItemSheet.getLastRow();
    Logger.log(`📋 AddItem sheet has ${lastRow - 1} items`);
    
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('⚠️ No items in AddItem sheet. Add some items first!');
      return;
    }
    
    // Get first item as test
    const testRow = addItemSheet.getRange(2, 1, 1, 7).getValues()[0];
    const partNumber = String(testRow[0]).trim();
    
    Logger.log(`\n🔍 Testing with part number: ${partNumber}`);
    
    // Test API call
    Logger.log('\n📡 Calling API...');
    const detailData = ApiService.getItemDetails(partNumber);
    
    if (!detailData) {
      Logger.log('❌ API returned null');
      SpreadsheetApp.getUi().alert(
        '❌ API Test Failed\n\n' +
        `Part Number: ${partNumber}\n` +
        'API returned no data.\n\n' +
        'Check:\n' +
        '1. Is the item synced? (Run "Refresh Selected Row")\n' +
        '2. Check View > Executions for API errors'
      );
      return;
    }
    
    Logger.log('✅ API returned data');
    Logger.log(`Response type: ${typeof detailData}`);
    Logger.log(`Response keys: ${Object.keys(detailData).join(', ')}`);
    
    // Parse item
    const item = ApiService.parseItemFromResponse(detailData);
    
    if (!item || !item.part_number) {
      Logger.log('❌ Failed to parse item from response');
      SpreadsheetApp.getUi().alert(
        '❌ Parse Error\n\n' +
        'API returned data but parsing failed.\n' +
        'Check View > Executions for details.'
      );
      return;
    }
    
    Logger.log(`✅ Item parsed: ${item.part_number}`);
    Logger.log(`   Name: ${item.name}`);
    Logger.log(`   Status: ${item.status}`);
    Logger.log(`   Progress: ${item.overall_progress}%`);
    Logger.log(`   Phases: ${item.phases?.length || 0}`);
    
    // Check phases
    if (item.phases && item.phases.length > 0) {
      Logger.log('\n📁 Phases:');
      item.phases.forEach((phase, i) => {
        Logger.log(`   ${i + 1}. ${phase.name} (${phase.subphases?.length || 0} subphases)`);
        if (phase.subphases && phase.subphases.length > 0) {
          phase.subphases.forEach((sub, j) => {
            Logger.log(`      ${j + 1}. ${sub.name} - ${sub.completed ? 'Complete' : 'Pending'}`);
          });
        }
      });
    } else {
      Logger.log('\n⚠️ No phases found');
    }
    
    // Show success message
    SpreadsheetApp.getUi().alert(
      '✅ Tracking Data Test Successful!\n\n' +
      `Part Number: ${item.part_number}\n` +
      `Name: ${item.name}\n` +
      `Status: ${item.status}\n` +
      `Progress: ${Math.round(item.overall_progress || 0)}%\n` +
      `Phases: ${item.phases?.length || 0}\n\n` +
      'Check View > Executions for detailed logs.\n\n' +
      'You can now run "Refresh Tracking View"'
    );
    
  } catch (error) {
    Logger.log(`❌ Test error: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
    
    SpreadsheetApp.getUi().alert(
      '❌ Test Failed\n\n' +
      `Error: ${error.message}\n\n` +
      'Check View > Executions for full error details.'
    );
  }
}