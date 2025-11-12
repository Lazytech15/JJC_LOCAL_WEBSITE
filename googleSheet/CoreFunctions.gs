// ==================== CORE FUNCTIONS ====================
// Business logic and data processing

const CoreFunctions = {
  // Sheet and column configuration
  SHEET_NAME: 'AddItem',
  DASHBOARD_SHEET: 'Dashboard',
  HISTORY_SHEET: 'ItemHistory',
  
  COLUMNS: {
    PART_NUMBER: 0,
    ITEM_NAME: 1,
    CLIENT_NAME: 2,
    QUANTITY: 3,
    STATUS: 4,
    TIMESTAMP: 5,
    MESSAGE: 6
  },
  
  STATUS_COLORS: {
    'SUCCESS': { bg: '#d1fae5', fg: '#10b981' },
    'ERROR': { bg: '#fee2e2', fg: '#ef4444' },
    'PROCESSING': { bg: '#fef3c7', fg: '#f59e0b' },
    'PENDING': { bg: '#f4f4f5', fg: '#52525b' },
    'completed': { bg: '#10b981', fg: '#ffffff' },
    'in_progress': { bg: '#f59e0b', fg: '#ffffff' },
    'not_started': { bg: '#71717a', fg: '#ffffff' },
    'paused': { bg: '#ef4444', fg: '#ffffff' }
  },
  
  /**
   * Extract base part number from full part number
   */
  extractBasePartNumber(fullPartNumber) {
    const partStr = String(fullPartNumber).trim();
    if (partStr.includes('-BATCH-') || partStr.includes('-GS-')) {
      return partStr.split('-')[0];
    }
    return partStr;
  },
  
  /**
   * Update item name dropdown based on part number
   */
  updateItemNameDropdown(sheet, row) {
    try {
      const partNumber = sheet.getRange(row, this.COLUMNS.PART_NUMBER + 1).getValue();
      if (!partNumber) return;
      
      const basePartNumber = this.extractBasePartNumber(partNumber);
      const data = ApiService.searchItems(basePartNumber);
      
      if (!data) return;
      
      const items = ApiService.parseItemsFromResponse(data);
      
      const itemNames = [...new Set(items
        .filter(item => this.extractBasePartNumber(item.part_number) === basePartNumber)
        .map(item => item.name)
        .filter(name => name)
      )];
      
      if (itemNames.length > 0) {
        const itemNameCell = sheet.getRange(row, this.COLUMNS.ITEM_NAME + 1);
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(itemNames, true)
          .setAllowInvalid(true)
          .setHelpText('Select an item name from existing records or enter a new one')
          .build();
        
        itemNameCell.setDataValidation(rule);
        
        if (itemNames.length === 1 && !itemNameCell.getValue()) {
          itemNameCell.setValue(itemNames[0]);
        }
      }
    } catch (error) {
      Logger.log(`Error updating dropdown: ${error.message}`);
    }
  },
  
  /**
   * Process a single row - validate and send to API
   */
  processRow(sheet, row) {
    try {
      const partNumber = sheet.getRange(row, this.COLUMNS.PART_NUMBER + 1).getValue();
      const itemName = sheet.getRange(row, this.COLUMNS.ITEM_NAME + 1).getValue();
      const clientName = sheet.getRange(row, this.COLUMNS.CLIENT_NAME + 1).getValue();
      const quantity = sheet.getRange(row, this.COLUMNS.QUANTITY + 1).getValue();
      
      // Validation
      if (!partNumber || !clientName || !quantity) {
        this.updateStatus(sheet, row, 'PENDING', 'Fill required fields: Part Number, Client Name, Quantity');
        return;
      }
      
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) {
        this.updateStatus(sheet, row, 'ERROR', 'Quantity must be a positive number');
        return;
      }
      
      const basePartNumber = this.extractBasePartNumber(partNumber);
      this.updateStatus(sheet, row, 'PROCESSING', `Sending to system... (Base: ${basePartNumber})`);
      
      // Prepare payload
      const payload = {
        part_number: basePartNumber,
        item_name: itemName ? String(itemName).trim() : null,
        client_name: String(clientName).trim(),
        qty: qty,
        source: 'google_sheets',
        sheet_row: row,
        timestamp: new Date().toISOString()
      };
      
      // Send to API
      const response = ApiService.createItem(payload);
      
      if (response.code === 200 || response.code === 201) {
        let result;
        try {
          result = JSON.parse(response.text);
        } catch (e) {
          Logger.log('Failed to parse response:', response.text);
          this.updateStatus(sheet, row, 'ERROR', 'Invalid server response');
          return;
        }
        
        const createdPartNumber = result.data?.part_number || result.part_number || 'OK';
        this.updateStatus(sheet, row, 'SUCCESS', `Item created: ${createdPartNumber}`);
        
        UIFunctions.addToHistory(basePartNumber, clientName, qty, 'Created', createdPartNumber, itemName);
        
        Utilities.sleep(1000);
        ApiService.notifyFrontendCacheRefresh(createdPartNumber);
        
        Utilities.sleep(3000);
        this.checkAndUpdateItemStatus(sheet, row, basePartNumber, clientName);
        
        Utilities.sleep(1000);
        UIFunctions.updateDashboard();
      }
    } catch (error) {
      this.updateStatus(sheet, row, 'ERROR', `Error: ${error.message}`);
      Logger.log(`Error processing row ${row}: ${error.message}`);
    }
  },
  
  /**
   * Check and update item status from API
   */
  checkAndUpdateItemStatus(sheet, row, basePartNumber, clientName) {
    try {
      if (!sheet || !row || !basePartNumber || !clientName) {
        Logger.log(`❌ Missing required parameters`);
        return false;
      }
      
      // Search for matching items
      const listResponseData = ApiService.searchItems(basePartNumber);
      
      if (!listResponseData) {
        Logger.log(`❌ Failed to fetch items list`);
        return false;
      }
      
      const items = ApiService.parseItemsFromResponse(listResponseData);
      
      if (items.length === 0) {
        Logger.log(`⚠️ No items found in response`);
        return false;
      }
      
      Logger.log(`✅ Found ${items.length} items in search results`);
      
      // Find matching item
      const matchingItems = items.filter(item => {
        if (!item || !item.part_number || !item.client_name) return false;
        
        const itemBasePartNumber = this.extractBasePartNumber(item.part_number);
        const partMatch = itemBasePartNumber === basePartNumber;
        const clientMatch = item.client_name.trim().toLowerCase() === clientName.trim().toLowerCase();
        
        return partMatch && clientMatch;
      });
      
      if (matchingItems.length === 0) {
        Logger.log(`⚠️ No matching item found for ${basePartNumber} + ${clientName}`);
        return false;
      }
      
      // Get most recent item
      const summaryItem = matchingItems.sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )[0];
      
      Logger.log(`✅ Using item: ${summaryItem.part_number}`);
      
      // Fetch detailed info
      const detailResponseData = ApiService.getItemDetails(summaryItem.part_number);
      
      if (!detailResponseData) {
        Logger.log(`❌ Failed to fetch item details`);
        return false;
      }
      
      const matchingItem = ApiService.parseItemFromResponse(detailResponseData);
      
      if (!matchingItem || !matchingItem.part_number) {
        Logger.log(`❌ Invalid item data in response`);
        return false;
      }
      
      Logger.log(`✅ Got item with phases`);
      
      // Determine status
      const itemStatus = matchingItem.status || 'not_started';
      let displayStatus = '';
      let statusColor = this.STATUS_COLORS[itemStatus] || this.STATUS_COLORS['not_started'];
      
      // Check for paused phases
      let isPaused = false;
      if (matchingItem.phases && Array.isArray(matchingItem.phases)) {
        isPaused = matchingItem.phases.some(phase => {
          const hasPauseTime = phase.pause_time && 
                              phase.pause_time !== null && 
                              phase.pause_time !== '' &&
                              phase.pause_time !== 'null' &&
                              !phase.end_time;
          
          if (hasPauseTime) {
            Logger.log(`🔍 Phase "${phase.name}" is PAUSED`);
          }
          
          return hasPauseTime;
        });
      }
      
      Logger.log(`⏸️  Overall paused status: ${isPaused}`);
      
      if (isPaused) {
        displayStatus = 'PAUSED';
        statusColor = this.STATUS_COLORS['paused'];
      } else {
        switch (itemStatus) {
          case 'completed':
            displayStatus = 'COMPLETED';
            statusColor = this.STATUS_COLORS['completed'];
            break;
          case 'in_progress':
            displayStatus = 'IN PROGRESS';
            statusColor = this.STATUS_COLORS['in_progress'];
            break;
          case 'not_started':
            displayStatus = 'NOT STARTED';
            statusColor = this.STATUS_COLORS['not_started'];
            break;
          default:
            displayStatus = itemStatus.toUpperCase();
        }
      }
      
      Logger.log(`📊 Final Status: ${displayStatus}`);
      
      // Update row with status
      const rowRange = sheet.getRange(row, 1, 1, 7);
      rowRange.setBackground(statusColor.bg);
      rowRange.setFontColor(statusColor.fg);
      
      const statusCell = sheet.getRange(row, this.COLUMNS.STATUS + 1);
      statusCell.setValue(displayStatus);
      
      let message = `Item: ${matchingItem.part_number}`;
      if (matchingItem.overall_progress) {
        message += ` | Progress: ${Math.round(matchingItem.overall_progress)}%`;
      }
      
      sheet.getRange(row, this.COLUMNS.MESSAGE + 1).setValue(message);
      sheet.getRange(row, this.COLUMNS.TIMESTAMP + 1).setValue(new Date().toLocaleString());
      
      Logger.log(`✅ Updated row ${row} with status: ${displayStatus}`);
      
      UIFunctions.addToHistory(
        basePartNumber, 
        clientName, 
        matchingItem.qty || 0, 
        displayStatus, 
        matchingItem.part_number,
        Math.round(matchingItem.overall_progress || 0),
        matchingItem.name
      );
      
      return true;
      
    } catch (error) {
      Logger.log(`❌ Error in checkAndUpdateItemStatus: ${error.message}`);
      Logger.log(`Stack: ${error.stack}`);
      return false;
    }
  },
  
  /**
   * Sync all item statuses
   */
  syncAllItemStatuses() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
      
      if (!sheet) {
        Logger.log(`❌ Sheet "${this.SHEET_NAME}" not found`);
        return;
      }
      
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        Logger.log('ℹ️ No items to sync');
        return;
      }
      
      let syncedCount = 0;
      let failedCount = 0;
      
      Logger.log(`🔄 Starting sync for ${lastRow - 1} rows...`);
      
      for (let row = 2; row <= lastRow; row++) {
        try {
          const partNumber = sheet.getRange(row, this.COLUMNS.PART_NUMBER + 1).getValue();
          const clientName = sheet.getRange(row, this.COLUMNS.CLIENT_NAME + 1).getValue();
          const status = sheet.getRange(row, this.COLUMNS.STATUS + 1).getValue();
          
          if (!partNumber || !clientName) {
            continue;
          }
          
          const syncableStatuses = ['SUCCESS', 'COMPLETED', 'IN PROGRESS', 'NOT STARTED', 'PAUSED'];
          
          if (syncableStatuses.includes(String(status).toUpperCase())) {
            const basePartNumber = this.extractBasePartNumber(partNumber);
            Logger.log(`Syncing row ${row}: ${basePartNumber} - ${clientName}`);
            
            const success = this.checkAndUpdateItemStatus(sheet, row, basePartNumber, clientName);
            
            if (success) {
              syncedCount++;
            } else {
              failedCount++;
            }
            
            Utilities.sleep(500);
          }
        } catch (rowError) {
          Logger.log(`❌ Error syncing row ${row}: ${rowError.message}`);
          failedCount++;
        }
      }
      
      Logger.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);
      
      UIFunctions.updateDashboard();
      
      try {
        SpreadsheetApp.getUi().alert(`✅ Sync complete!\n\nSynced: ${syncedCount}\nFailed: ${failedCount}`);
      } catch (e) {
        Logger.log('ℹ️ Running from trigger - no UI alert');
      }
      
    } catch (error) {
      Logger.log(`❌ Fatal error in syncAllItemStatuses: ${error.message}`);
      Logger.log(`Stack trace: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Update status cell
   */
  updateStatus(sheet, row, status, message) {
    const timestamp = new Date().toLocaleString();
    
    const statusCell = sheet.getRange(row, this.COLUMNS.STATUS + 1);
    statusCell.setValue(status);
    
    const color = this.STATUS_COLORS[status];
    if (color) {
      statusCell.setBackground(color.bg).setFontColor(color.fg);
    }
    
    sheet.getRange(row, this.COLUMNS.TIMESTAMP + 1).setValue(timestamp);
    sheet.getRange(row, this.COLUMNS.MESSAGE + 1).setValue(message);
  },
  
  /**
   * Process all pending rows
   */
  processAllPendingRows() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    const lastRow = sheet.getLastRow();
    
    let processedCount = 0;
    
    for (let row = 2; row <= lastRow; row++) {
      const status = sheet.getRange(row, this.COLUMNS.STATUS + 1).getValue();
      const partNumber = sheet.getRange(row, this.COLUMNS.PART_NUMBER + 1).getValue();
      
      if (partNumber && (!status || status === 'PENDING' || status === 'ERROR')) {
        this.processRow(sheet, row);
        processedCount++;
        Utilities.sleep(500);
      }
    }
    
    UIFunctions.updateDashboard();
    return processedCount;
  },
  
  /**
   * Clear all statuses
   */
  clearAllStatuses() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      const range = sheet.getRange(2, 1, lastRow - 1, 7);
      range.setBackground(null);
      range.setFontColor(null);
      
      sheet.getRange(2, this.COLUMNS.STATUS + 1, lastRow - 1, 3).clearContent();
      UIFunctions.updateDashboard();
    }
  }
};