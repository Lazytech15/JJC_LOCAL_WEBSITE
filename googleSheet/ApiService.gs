// ==================== API SERVICE ====================
// Handles all API requests and responses

const ApiService = {
  // Configuration
  WEBHOOK_URL: 'https://jjcenggworks.com/api/operations/google-sheets-import',
  STATUS_CHECK_URL: 'https://jjcenggworks.com/api/operations/items',
  
  /**
   * Create a new item via POST request
   */
  createItem(payload) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(this.WEBHOOK_URL, options);
    return {
      code: response.getResponseCode(),
      text: response.getContentText()
    };
  },
  
  /**
   * Search items by part number
   */
  searchItems(partNumber) {
    const searchUrl = `${this.STATUS_CHECK_URL}?search=${encodeURIComponent(partNumber)}`;
    const options = {
      method: 'get',
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    };
    
    const response = UrlFetchApp.fetch(searchUrl, options);
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    return JSON.parse(response.getContentText());
  },
  
  /**
   * Get item details by full part number
   */
  getItemDetails(partNumber) {
    const detailUrl = `${this.STATUS_CHECK_URL}?part_number=${encodeURIComponent(partNumber)}`;
    const options = {
      method: 'get',
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    };
    
    const response = UrlFetchApp.fetch(detailUrl, options);
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    return JSON.parse(response.getContentText());
  },
  
  /**
   * Get all items (list)
   */
  getAllItems() {
    const options = {
      method: 'get',
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    };
    
    const response = UrlFetchApp.fetch(this.STATUS_CHECK_URL, options);
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    return JSON.parse(response.getContentText());
  },
  
  /**
   * Notify frontend to refresh cache
   */
  notifyFrontendCacheRefresh(partNumber) {
    try {
      const pingUrl = `${this.STATUS_CHECK_URL}?check=new&t=${Date.now()}`;
      
      const options = {
        method: 'get',
        muteHttpExceptions: true,
        headers: {
          'Accept': 'application/json',
          'X-Trigger-Refresh': 'true'
        }
      };
      
      const response = UrlFetchApp.fetch(pingUrl, options);
      
      if (response.getResponseCode() === 200) {
        Logger.log(`✅ Cache refresh ping sent for ${partNumber}`);
        return true;
      }
      return false;
    } catch (error) {
      Logger.log(`⚠️ Cache refresh ping error: ${error.message}`);
      return false;
    }
  },
  
  /**
   * Test API connection
   */
  testConnection() {
    try {
      const response = UrlFetchApp.fetch('https://jjcenggworks.com/api/operations/health', {
        method: 'get',
        muteHttpExceptions: true
      });
      
      return {
        success: response.getResponseCode() === 200,
        code: response.getResponseCode()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Parse items from API response
   * Handles different response formats
   */
  parseItemsFromResponse(data) {
    let items = [];
    
    if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data)) {
      items = data;
    } else if (data.success && data.data) {
      if (Array.isArray(data.data)) {
        items = data.data;
      } else if (data.data.items && Array.isArray(data.data.items)) {
        items = data.data.items;
      }
    }
    
    return items;
  },
  
  /**
   * Parse single item from API response
   */
  parseItemFromResponse(data) {
    if (data.success && data.data) {
      return data.data;
    } else if (data.part_number) {
      return data;
    }
    return data;
  }
};