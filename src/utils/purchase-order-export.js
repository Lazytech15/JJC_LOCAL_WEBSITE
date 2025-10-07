// ============================================================================
// purchase-order-export.js - Engineering Standard Purchase Order
// Follows architectural/engineering drawing standards
// ============================================================================
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import companyLogo from "../assets/companyLogo.jpg"

// Company Information
const COMPANY_INFO = {
  name: "JJC ENGINEERING WORKS & GENERAL SERVICES",
  address: "B-3 L-11, South Carolina St., Jouyous Hts, Subdivision",
  address2: "Sitio Hinapao, Brgy. San Jose, Antipolo City",
  phone: "Tel #: (632) 8288-2686 / (632) 7004-9842",
  email: "e-mail: jjcenggworks@yahoo.com",
  logo: companyLogo
}

/**
 * Engineering-Standard Purchase Order PDF Export
 * Follows architectural/technical drawing conventions:
 * - Title block format
 * - Technical line weights
 * - Grid-based layout
 * - Minimal decoration
 * - Professional typography
 */
export const exportPurchaseOrderToPDF = (poData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // Engineering drawing margins (standard A4)
  const margin = 10
  const rightMargin = 10
  const titleBlockHeight = 25
  
  // Technical line weights (ISO standard)
  const LINE_WEIGHTS = {
    heavy: 0.7,    // Borders, title block
    medium: 0.4,   // Section dividers
    light: 0.2     // Grid lines, notes
  }

  let yPos = margin

  // Get items and calculate total
  const items = poData.items || poData.selectedItems || []
  const totalAmount = items.reduce((sum, item) => 
    sum + ((item.quantity || 0) * (item.price_per_unit || 0)), 0
  )

  // Format currency (Philippine Peso)
  const formatPeso = (amount) => {
    const formatted = amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
    return `P ${formatted}` // Using 'P' instead of ₱ symbol for better PDF compatibility
  }

  // ============================================================================
  // OUTER BORDER (Engineering standard frame)
  // ============================================================================
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(LINE_WEIGHTS.heavy)
  doc.rect(margin, margin, pageWidth - margin - rightMargin, pageHeight - 2 * margin)

  yPos += 5

  // ============================================================================
  // TITLE BLOCK (Top section - Architectural drawing style)
  // ============================================================================
  
  const titleBlockY = yPos
  const logoSize = 16
  const logoX = margin + 3
  
  // Company logo (technical drawing style - simple border)
  try {
    doc.setLineWidth(LINE_WEIGHTS.light)
    doc.rect(logoX, titleBlockY, logoSize, logoSize)
    doc.addImage(COMPANY_INFO.logo, 'JPEG', logoX + 0.3, titleBlockY + 0.3, logoSize - 0.6, logoSize - 0.6)
  } catch (err) {
    console.warn("Logo not loaded:", err)
  }

  // Company information block (aligned, technical style)
  const companyX = logoX + logoSize + 4
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(COMPANY_INFO.name, companyX, titleBlockY + 4)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text(COMPANY_INFO.address, companyX, titleBlockY + 8)
  doc.text(COMPANY_INFO.address2, companyX, titleBlockY + 11)
  doc.text(COMPANY_INFO.phone, companyX, titleBlockY + 14)
  doc.text(COMPANY_INFO.email, companyX, titleBlockY + 17)

  // Document title (engineering standard)
  const titleX = pageWidth - rightMargin - 52
  doc.setLineWidth(LINE_WEIGHTS.medium)
  doc.rect(titleX, titleBlockY, 52, titleBlockHeight)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("PURCHASE ORDER", titleX + 26, titleBlockY + 8, { align: "center" })
  
  // Horizontal divider
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.line(titleX, titleBlockY + 11, titleX + 52, titleBlockY + 11)
  
  // PO Number (prominent)
  doc.setFontSize(8)
  doc.text("P.O. # :", titleX + 2, titleBlockY + 14.5)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(poData.po_number || "—", titleX + 26, titleBlockY + 20, { align: "center" })

  yPos = titleBlockY + titleBlockHeight + 2

  // Horizontal divider line (technical drawing separator)
  doc.setLineWidth(LINE_WEIGHTS.medium)
  doc.line(margin, yPos, pageWidth - rightMargin, yPos)

  yPos += 6

  // ============================================================================
  // INFORMATION GRID (Engineering layout)
  // ============================================================================
  
  const gridStartY = yPos
  const gridHeight = 28
  const col1Width = 108
  const col2Width = pageWidth - margin - rightMargin - col1Width
  const col2X = margin + col1Width

  // Left column - Supplier information
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.rect(margin, gridStartY, col1Width, gridHeight)
  
  // Header
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("SUPPLIER'S NAME & ADDRESS", margin + 2, gridStartY + 4)
  
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.line(margin, gridStartY + 6, margin + col1Width, gridStartY + 6)
  
  // Supplier details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text((poData.supplier_name || "").toUpperCase(), margin + 2, gridStartY + 11)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  const supplierAddr = poData.supplier_address || ""
  const addrLines = doc.splitTextToSize(supplierAddr, col1Width - 4)
  addrLines.slice(0, 2).forEach((line, idx) => {
    doc.text(line, margin + 2, gridStartY + 15 + (idx * 3.5))
  })

  if (poData.attention_person) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Attention : ${poData.attention_person}`, margin + 2, gridStartY + 24)
  }

  // Right column - Order details (structured grid)
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.rect(col2X, gridStartY, col2Width, gridHeight)
  
  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("ORDER INFORMATION", col2X + 2, gridStartY + 3.5)
  
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.line(col2X, gridStartY + 5, col2X + col2Width, gridStartY + 5)

  // Data rows (engineering format)
  const dataRows = [
    { label: "DATE", value: poData.po_date || "—" },
    { label: "TERMS", value: poData.terms || "—" }
  ]

  let dataY = gridStartY + 9
  const labelX = col2X + 2
  const valueX = col2X + 20

  dataRows.forEach((row, idx) => {
    const currentY = dataY + (idx * 10) // Increased spacing to prevent overlap
    
    // Grid line
    if (idx > 0) {
      doc.setLineWidth(LINE_WEIGHTS.light)
      doc.line(col2X, currentY - 3, col2X + col2Width, currentY - 3)
    }
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(row.label + " :", labelX, currentY)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(row.value, valueX, currentY)
  })

  yPos = gridStartY + gridHeight + 6

  // ============================================================================
  // ITEMS TABLE (Engineering/Architectural specification format)
  // ============================================================================
  
  const tableColumns = [
    { header: "ITEM", dataKey: "item" },
    { header: "QTY", dataKey: "qty" },
    { header: "UNIT", dataKey: "unit" },
    { header: "DESCRIPTION", dataKey: "description" },
    { header: "UNIT PRICE", dataKey: "unitPrice" },
    { header: "AMOUNT", dataKey: "amount" }
  ]
  
  const tableRows = items.map((item, index) => ({
    item: (index + 1).toString().padStart(2, '0'),
    qty: item.quantity || 0,
    unit: item.unit || "pcs",
    description: item.item_name || item.description || "",
    unitPrice: formatPeso(item.price_per_unit || 0),
    amount: formatPeso((item.quantity || 0) * (item.price_per_unit || 0))
  }))

  autoTable(doc, {
    startY: yPos,
    columns: tableColumns,
    body: tableRows,
    theme: 'grid',
    tableWidth: 'auto',
    styles: {
      fontSize: 9,
      cellPadding: 2, // Compact padding
      lineColor: [0, 0, 0],
      lineWidth: LINE_WEIGHTS.light,
      textColor: [0, 0, 0],
      font: "helvetica",
      overflow: 'linebreak',
      minCellHeight: 6 // Compact cells that fit text
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: LINE_WEIGHTS.medium,
      lineColor: [0, 0, 0],
      minCellHeight: 7,
      cellPadding: 2,
      fontSize: 9
    },
    bodyStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      item: { cellWidth: 12, halign: 'center', fontStyle: 'normal', fontSize: 9 },
      qty: { cellWidth: 12, halign: 'center', fontSize: 9 },
      unit: { cellWidth: 15, halign: 'center', fontSize: 9 },
      description: { halign: 'left', fontSize: 9 }, // Auto width
      unitPrice: { cellWidth: 25, halign: 'right', fontStyle: 'normal', fontSize: 9 },
      amount: { cellWidth: 25, halign: 'right', fontStyle: 'normal', fontSize: 9 }
    },
    margin: { left: margin, right: rightMargin }
  })

  yPos = doc.lastAutoTable.finalY + 5

  // ============================================================================
  // TOTAL (Engineering callout style)
  // ============================================================================
  
  const totalBoxWidth = 60
  const totalBoxX = pageWidth - rightMargin - totalBoxWidth - 1
  
  doc.setLineWidth(LINE_WEIGHTS.medium)
  doc.rect(totalBoxX, yPos, totalBoxWidth, 8)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("TOTAL AMOUNT =", totalBoxX + 2, yPos + 5.5)
  
  doc.setFontSize(10)
  doc.text(formatPeso(totalAmount), totalBoxX + totalBoxWidth - 2, yPos + 5.5, { align: "right" })

  yPos += 12

  // ============================================================================
  // APPROVAL SECTION (Technical drawing revision block style)
  // ============================================================================
  
  const sigSectionY = yPos
  const sigWidth = (pageWidth - margin - rightMargin - 4) / 3
  
  // Parse prepared by
  const preparedBy = Array.isArray(poData.prepared_by) 
    ? poData.prepared_by.filter(p => p && p.trim()) 
    : poData.prepared_by ? poData.prepared_by.split(',').map(p => p.trim()).filter(p => p) : []

  const signatures = [
    { label: "PREPARED BY", names: preparedBy, x: margin + 1 },
    { label: "VERIFIED BY", names: [poData.verified_by || ""], x: margin + sigWidth + 2 },
    { label: "APPROVED BY", names: [poData.approved_by || ""], x: margin + 2 * sigWidth + 3 }
  ]

  const maxNames = Math.max(...signatures.map(s => s.names.length))
  const sigBoxHeight = Math.max(25, 12 + maxNames * 10)

  signatures.forEach((sig) => {
    // Box border
    doc.setLineWidth(LINE_WEIGHTS.light)
    doc.rect(sig.x, sigSectionY, sigWidth, sigBoxHeight)
    
    // Header section
    doc.setLineWidth(LINE_WEIGHTS.light)
    doc.line(sig.x, sigSectionY + 5, sig.x + sigWidth, sigSectionY + 5)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text(sig.label + ":", sig.x + 1.5, sigSectionY + 3.5)
    
    // Names and signature lines
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    
    let nameY = sigSectionY + 10
    sig.names.forEach((name, idx) => {
      const currentY = nameY + (idx * 10)
      const lineY = currentY + 4
      
      if (name && name.trim()) {
        doc.text(name.toUpperCase(), sig.x + sigWidth / 2, currentY, { align: 'center' })
      }
      
      // Signature line (technical drawing style)
      doc.setLineWidth(LINE_WEIGHTS.light)
      doc.line(sig.x + 2, lineY, sig.x + sigWidth - 2, lineY)
    })
  })

  yPos = sigSectionY + sigBoxHeight + 5

  // ============================================================================
  // NOTES SECTION (Engineering notes format)
  // ============================================================================
  
  if (poData.notes && poData.notes.trim()) {
    const notesHeight = 18 // Increased height for notes section
    doc.setLineWidth(LINE_WEIGHTS.light)
    doc.rect(margin + 1, yPos, pageWidth - margin - rightMargin - 2, notesHeight)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("NOTES:", margin + 2, yPos + 5)
    
    doc.setLineWidth(LINE_WEIGHTS.light)
    doc.line(margin + 1, yPos + 6.5, pageWidth - rightMargin - 1, yPos + 6.5)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const notesLines = doc.splitTextToSize(poData.notes, pageWidth - margin - rightMargin - 4)
    doc.text(notesLines.slice(0, 2), margin + 2, yPos + 10)
  }

  // ============================================================================
  // FOOTER (Drawing information - architectural standard)
  // ============================================================================
  
  const footerY = pageHeight - margin - 5
  
  doc.setLineWidth(LINE_WEIGHTS.light)
  doc.line(margin, footerY, pageWidth - rightMargin, footerY)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6)
  
  const genDate = new Date().toLocaleString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  
  // Left: Generated timestamp
  doc.text(`GENERATED: ${genDate}`, margin + 1, footerY + 2.5)
  
  // Center: Document reference
  doc.text(`PO-${poData.po_number || ""}`, pageWidth / 2, footerY + 2.5, { align: "center" })
  
  // Right: Page number (architectural standard)
  doc.text("SHEET 1 OF 1", pageWidth - rightMargin - 1, footerY + 2.5, { align: "right" })

  // Save with engineering filename convention
  const fileName = `PO-${poData.po_number}_${poData.supplier_name}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  doc.save(`${fileName}.pdf`)
}

/**
 * 📊 Excel Export with Professional Formatting
 */
export const exportPurchaseOrderToExcel = (poData) => {
  const wb = XLSX.utils.book_new()
  
  // Get items - handle both 'items' and 'selectedItems' properties
  const items = poData.items || poData.selectedItems || []
  
  // Create worksheet data
  const wsData = [
    // Header rows
    [COMPANY_INFO.name],
    [COMPANY_INFO.address],
    [COMPANY_INFO.address2],
    [COMPANY_INFO.phone],
    [COMPANY_INFO.email],
    [],
    ["PURCHASE ORDER"],
    [],
    // PO Info
    ["SUPPLIER'S NAME & ADDRESS", "", "", "", "P. O. #:", poData.po_number],
    [poData.supplier_name, "", "", "", "DATE:", poData.po_date],
    [poData.supplier_address, "", "", "", "TERMS:", poData.terms],
    [`Attention: ${poData.attention_person || ""}`, "", "", "", "", ""],
    [],
    // Table header
    ["ITEM", "QTY", "UNIT", "DESCRIPTION OF ITEMS", "UNIT PRICE", "AMOUNT"],
    // Items
    ...items.map((item, index) => [
      index + 1,
      item.quantity || 0,
      item.unit || "pcs",
      item.item_name || item.description || "",
      item.price_per_unit || 0,
      (item.quantity || 0) * (item.price_per_unit || 0)
    ]),
    [],
    // Total
    ["", "", "", "TOTAL AMOUNT =", "", 
      items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price_per_unit || 0)), 0)
    ],
    [],
    // Signatures
    ["PREPARED BY:", "", "VERIFIED BY:", "", "APPROVED BY:"],
    [Array.isArray(poData.prepared_by) ? poData.prepared_by.join(', ') : poData.prepared_by, 
     "", 
     poData.verified_by, 
     "", 
     poData.approved_by],
    [],
    ["Notes:", poData.notes || ""]
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // ITEM
    { wch: 8 },  // QTY
    { wch: 8 },  // UNIT
    { wch: 50 }, // DESCRIPTION
    { wch: 15 }, // UNIT PRICE
    { wch: 15 }  // AMOUNT
  ]

  XLSX.utils.book_append_sheet(wb, ws, "Purchase Order")
  XLSX.writeFile(wb, `PO_${poData.po_number}_${poData.supplier_name}.xlsx`)
}
