// ============================================================================
// inventory-import-export.js
// Utility functions for importing and exporting inventory data
// Supports CSV and Excel formats
// ============================================================================

import * as XLSX from 'xlsx'

// Standard columns for inventory export/import
export const INVENTORY_COLUMNS = [
  { key: 'item_name', label: 'Item Name', required: true },
  { key: 'item_no', label: 'Item Number', required: false }, // Auto-generated if not provided
  { key: 'brand', label: 'Brand', required: false },
  { key: 'item_type', label: 'Item Type', required: false },
  { key: 'supplier', label: 'Supplier', required: false },
  { key: 'balance', label: 'Balance', required: true },
  { key: 'min_stock', label: 'Min Stock', required: true },
  { key: 'unit_of_measure', label: 'Unit of Measure', required: false },
  { key: 'price_per_unit', label: 'Price Per Unit', required: true },
  { key: 'location', label: 'Location', required: false },
  { key: 'item_status', label: 'Status', required: false }, // Will be auto-calculated by database
]

/**
 * Export inventory data to CSV format
 * @param {Array} items - Array of inventory items
 * @param {string} filename - Name of the file to download
 */
export function exportToCSV(items, filename = 'inventory_export.csv') {
  if (!items || items.length === 0) {
    throw new Error('No items to export')
  }

  // Create CSV header
  const headers = INVENTORY_COLUMNS.map(col => col.label).join(',')
  
  // Create CSV rows
  const rows = items.map(item => {
    return INVENTORY_COLUMNS.map(col => {
      const value = item[col.key] ?? ''
      // Escape values that contain commas or quotes
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  })

  // Combine header and rows
  const csv = [headers, ...rows].join('\n')

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Export inventory data to Excel format
 * @param {Array} items - Array of inventory items
 * @param {string} filename - Name of the file to download
 */
export function exportToExcel(items, filename = 'inventory_export.xlsx') {
  if (!items || items.length === 0) {
    throw new Error('No items to export')
  }

  // Prepare data with headers
  const headers = INVENTORY_COLUMNS.map(col => col.label)
  const data = items.map(item => 
    INVENTORY_COLUMNS.map(col => item[col.key] ?? '')
  )

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

  // Set column widths
  ws['!cols'] = INVENTORY_COLUMNS.map(col => ({ wch: 15 }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

  // Add metadata sheet with instructions
  const instructionsData = [
    ['Inventory Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in the required fields marked with *'],
    ['2. Item Number will be auto-generated if left blank'],
    ['3. Status will be automatically calculated based on Balance and Min Stock'],
    ['4. Valid Status values: In Stock, Low In Stock, Out Of Stock'],
    ['5. Balance and Price Per Unit must be numeric values'],
    [''],
    ['Required Fields:'],
    ...INVENTORY_COLUMNS.filter(col => col.required).map(col => [col.label]),
    [''],
    ['Optional Fields:'],
    ...INVENTORY_COLUMNS.filter(col => !col.required).map(col => [col.label]),
  ]
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions')

  // Write file
  XLSX.writeFile(wb, filename)
}

/**
 * Parse uploaded CSV file
 * @param {File} file - The uploaded CSV file
 * @returns {Promise<Array>} Parsed inventory items
 */
export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          reject(new Error('CSV file is empty or invalid'))
          return
        }

        // Parse header
        const headerLine = lines[0]
        const headers = parseCSVLine(headerLine)
        
        // Create column mapping
        const columnMap = createColumnMapping(headers)
        
        // Parse data rows
        const items = []
        const errors = []
        
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i])
            const item = mapRowToItem(values, columnMap, i + 1)
            items.push(item)
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err.message}`)
          }
        }

        if (errors.length > 0 && items.length === 0) {
          reject(new Error(`Failed to parse CSV:\n${errors.join('\n')}`, ))
          return
        }

        resolve({ items, errors })
      } catch (err) {
        reject(new Error(`Failed to parse CSV: ${err.message}`))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Parse uploaded Excel file
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Array>} Parsed inventory items
 */
export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Read first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or invalid'))
          return
        }

        // Parse header
        const headers = jsonData[0]
        
        // Create column mapping
        const columnMap = createColumnMapping(headers)
        
        // Parse data rows
        const items = []
        const errors = []
        
        for (let i = 1; i < jsonData.length; i++) {
          try {
            const values = jsonData[i]
            if (values.length === 0 || values.every(v => !v)) continue // Skip empty rows
            
            const item = mapRowToItem(values, columnMap, i + 1)
            items.push(item)
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err.message}`)
          }
        }

        if (errors.length > 0 && items.length === 0) {
          reject(new Error(`Failed to parse Excel:\n${errors.join('\n')}`))
          return
        }

        resolve({ items, errors })
      } catch (err) {
        reject(new Error(`Failed to parse Excel: ${err.message}`))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Validate imported items
 * @param {Array} items - Array of items to validate
 * @returns {Object} Validation result with valid items and errors
 */
export function validateImportedItems(items) {
  const validItems = []
  const errors = []

  items.forEach((item, index) => {
    const itemErrors = []
    const rowNum = index + 1

    // Validate required fields
    if (!item.item_name || !item.item_name.trim()) {
      itemErrors.push('Item Name is required')
    }

    if (item.balance === undefined || item.balance === null || item.balance === '') {
      itemErrors.push('Balance is required')
    } else if (isNaN(Number(item.balance)) || Number(item.balance) < 0) {
      itemErrors.push('Balance must be a non-negative number')
    }

    if (item.min_stock === undefined || item.min_stock === null || item.min_stock === '') {
      itemErrors.push('Min Stock is required')
    } else if (isNaN(Number(item.min_stock)) || Number(item.min_stock) < 0) {
      itemErrors.push('Min Stock must be a non-negative number')
    }

    if (item.price_per_unit === undefined || item.price_per_unit === null || item.price_per_unit === '') {
      itemErrors.push('Price Per Unit is required')
    } else if (isNaN(Number(item.price_per_unit)) || Number(item.price_per_unit) < 0) {
      itemErrors.push('Price Per Unit must be a non-negative number')
    }

    if (itemErrors.length > 0) {
      errors.push({
        row: rowNum,
        item_name: item.item_name || 'Unknown',
        errors: itemErrors
      })
    } else {
      // Convert numeric fields
      validItems.push({
        ...item,
        balance: Number(item.balance),
        min_stock: Number(item.min_stock),
        price_per_unit: Number(item.price_per_unit)
      })
    }
  })

  return { validItems, errors }
}

/**
 * Generate a sample CSV template for download
 * @param {string} filename - Name of the template file
 */
export function downloadTemplate(format = 'csv') {
  const sampleData = [
    {
      item_name: 'Sample Item 1',
      brand: 'Brand A',
      item_type: 'Type 1',
      supplier: 'Supplier 1',
      balance: 100,
      min_stock: 20,
      unit_of_measure: 'pcs',
      price_per_unit: 50.00,
      location: 'Warehouse A'
    },
    {
      item_name: 'Sample Item 2',
      brand: 'Brand B',
      item_type: 'Type 2',
      supplier: 'Supplier 2',
      balance: 50,
      min_stock: 10,
      unit_of_measure: 'kg',
      price_per_unit: 100.00,
      location: 'Warehouse B'
    }
  ]

  if (format === 'excel') {
    exportToExcel(sampleData, 'inventory_template.xlsx')
  } else {
    exportToCSV(sampleData, 'inventory_template.csv')
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Create mapping between file headers and internal column keys
 */
function createColumnMapping(headers) {
  const mapping = {}
  
  headers.forEach((header, index) => {
    const normalizedHeader = String(header).trim().toLowerCase()
    const column = INVENTORY_COLUMNS.find(col => 
      col.label.toLowerCase() === normalizedHeader
    )
    
    if (column) {
      mapping[index] = column.key
    }
  })
  
  return mapping
}

/**
 * Map a row of values to an item object
 */
function mapRowToItem(values, columnMap, rowNum) {
  const item = {}
  
  Object.entries(columnMap).forEach(([index, key]) => {
    const value = values[parseInt(index)]
    if (value !== undefined && value !== null && value !== '') {
      item[key] = value
    }
  })

  // Validate required fields are present
  const missingFields = INVENTORY_COLUMNS
    .filter(col => col.required && !item[col.key])
    .map(col => col.label)

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  return item
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
