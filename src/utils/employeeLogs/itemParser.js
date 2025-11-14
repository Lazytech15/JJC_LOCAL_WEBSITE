/**
 * Item Parser Utility
 * Handles parsing of item numbers and quantities from various formats
 */

/**
 * Sanitize a numeric value to ensure it's valid
 * @param {string|number} val - Value to sanitize
 * @returns {number} - Sanitized number
 */
export const sanitizeNumber = (val) => {
  if (val == null || val === '') return 1
  const num = typeof val === 'string' ? parseInt(val.replace(/[^\d]/g, ''), 10) : val
  return isNaN(num) || num <= 0 ? 1 : num
}

/**
 * Parse a single token (e.g., "#123 x5" or "456 (3 pcs)")
 * @param {string} token - Token to parse
 * @returns {{itemNo: string, qty: number|null}} - Parsed item number and quantity
 */
export const parseToken = (token) => {
  // Pattern 1: #123 x5 or 123 x5
  const match1 = token.match(/^#?(\d+)\s*[x×]\s*(\d+)/i)
  if (match1) return { itemNo: match1[1], qty: sanitizeNumber(match1[2]) }

  // Pattern 2: #123 (5) or 123 (5 pcs)
  const match2 = token.match(/^#?(\d+)\s*\((\d+)(?:\s*(?:pcs?|units?|ea|pc|piece|pieces))?\)/i)
  if (match2) return { itemNo: match2[1], qty: sanitizeNumber(match2[2]) }

  // Pattern 3: Just item number (#123 or 123)
  const match3 = token.match(/^#?(\d+)/)
  if (match3) return { itemNo: match3[1], qty: null }

  return { itemNo: token.trim(), qty: null }
}

/**
 * Extract quantities from details text
 * @param {string} detailsText - Details text to parse
 * @returns {Array<number|null>} - Array of quantities or null
 */
export const extractQuantitiesFromDetails = (detailsText) => {
  if (!detailsText || typeof detailsText !== 'string') return []
  
  const segments = detailsText.split(/[;|]/).map(s => s.trim())
  
  return segments.map(seg => {
    // Preferred pattern: Qty: 5
    const qtyLabel = seg.match(/qty\s*[:\-]?\s*(\d+)/i)
    if (qtyLabel) return sanitizeNumber(qtyLabel[1])

    // Pattern: x5 (ensure not capturing fraction like x 1/4)
    const qtyX = seg.match(/\b[x×]\s*(\d+)(?=\s*(?:pcs?|units?|unit|ea|pc|piece|pieces|\(|,|$))/i)
    if (qtyX) return sanitizeNumber(qtyX[1])

    // Pattern: (5 pcs)
    const qtyParen = seg.match(/\((\d+)\s*(?:pcs?|units?|unit|ea|pc|piece|pieces)?\)/i)
    if (qtyParen) return sanitizeNumber(qtyParen[1])

    return null
  })
}

/**
 * Parse items from items_json field
 * @param {string|Array} itemsJson - JSON string or array of items
 * @returns {Array<{itemNo: string, qty: number, itemName: string, unit: string}>} - Parsed items
 */
export const parseItemsJson = (itemsJson) => {
  if (!itemsJson) return []
  
  try {
    const items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson
    
    if (!Array.isArray(items)) return []
    
    return items.map(item => ({
      itemNo: String(item.item_no || item.itemNo || '').replace(/^#/, '').trim(),
      qty: sanitizeNumber(item.quantity || item.qty || 1),
      itemName: item.item_name || item.itemName || '',
      unit: item.unit_of_measure || item.unit || 'pcs'
    }))
  } catch (error) {
    console.error('Failed to parse items_json:', error)
    return []
  }
}

/**
 * Parse item numbers string with quantities and fetch from API
 * @param {string} itemNos - Comma/semicolon separated item numbers
 * @param {string} detailsText - Details text for fallback quantities
 * @param {string|Array} itemsJson - JSON string or array for primary source
 * @param {Function} apiFetchFn - API function to fetch item details
 * @returns {Promise<Array>} - Array of item objects with quantities
 */
export const parseAndFetchItems = async (itemNos, detailsText = '', itemsJson = null, apiFetchFn) => {
  // Priority 1: Use items_json if available
  if (itemsJson) {
    const parsedFromJson = parseItemsJson(itemsJson)
    if (parsedFromJson.length > 0) {
      console.debug('[ItemParser] Using items_json as primary source:', parsedFromJson.length, 'items')
      
      // Fetch full item details from API
      const promises = parsedFromJson.map(item => 
        apiFetchFn(item.itemNo)
          .then(res => ({ 
            res, 
            qty: item.qty, 
            itemNo: item.itemNo,
            unit: item.unit 
          }))
          .catch(err => ({ 
            res: { success: false, error: err }, 
            qty: item.qty, 
            itemNo: item.itemNo,
            unit: item.unit
          }))
      )
      
      const results = await Promise.all(promises)
      return results
        .filter(r => r && r.res && r.res.success)
        .map(r => ({ 
          ...(r.res.data || {}), 
          quantity: r.qty,
          unit_of_measure: r.unit 
        }))
    }
  }

  // Priority 2: Parse from item_no field
  if (!itemNos || typeof itemNos !== 'string') return []

  try {
    const tokens = itemNos
      .split(/[;|,]/)
      .map(t => t.trim())
      .filter(t => t !== '')

    if (tokens.length === 0) return []

    const detailQuantities = extractQuantitiesFromDetails(detailsText)

    const parsed = tokens.map((tok, index) => {
      const { itemNo, qty } = parseToken(tok)
      const normalizedItemNo = itemNo.replace(/^#/, '').trim()
      const fallbackQty = detailQuantities[index] ?? null
      const finalQty = qty ?? fallbackQty ?? 1

      if (!qty && fallbackQty) {
        console.debug(`[ItemParser] Using quantity from details for item ${normalizedItemNo}:`, fallbackQty)
      }

      return { itemNo: normalizedItemNo, qty: finalQty }
    })

    const promises = parsed.map(p => 
      apiFetchFn(p.itemNo)
        .then(res => ({ res, qty: p.qty, itemNo: p.itemNo }))
        .catch(err => ({ res: { success: false, error: err }, qty: p.qty, itemNo: p.itemNo }))
    )

    const results = await Promise.all(promises)

    return results
      .filter(r => r && r.res && r.res.success)
      .map(r => ({ ...(r.res.data || {}), quantity: r.qty }))
  } catch (error) {
    console.error('[ItemParser] Error fetching associated items:', error)
    return []
  }
}

/**
 * Validate item corrections for editing
 * @param {Array} itemCorrections - Array of item corrections to validate
 * @returns {{valid: boolean, errors: Array<string>}} - Validation result
 */
export const validateItemCorrections = (itemCorrections) => {
  const errors = []
  
  if (!Array.isArray(itemCorrections)) {
    errors.push('Item corrections must be an array')
    return { valid: false, errors }
  }

  itemCorrections.forEach((item, index) => {
    if (!item.item_no) {
      errors.push(`Item ${index + 1}: Missing item_no`)
    }
    
    if (item.corrected_quantity == null || isNaN(item.corrected_quantity)) {
      errors.push(`Item ${index + 1} (${item.item_name || item.item_no}): Invalid corrected quantity`)
    }
    
    if (item.corrected_quantity < 0) {
      errors.push(`Item ${index + 1} (${item.item_name || item.item_no}): Quantity cannot be negative`)
    }
    
    if (item.original_quantity == null || isNaN(item.original_quantity)) {
      errors.push(`Item ${index + 1} (${item.item_name || item.item_no}): Invalid original quantity`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
