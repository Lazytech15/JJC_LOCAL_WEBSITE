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
  address: "B-3 L-11, South Carolina St., Joyous Hts, Subdivision",
  address2: "Sitio Hinapao, Brgy. San Jose, Antipolo City",
  phone: "Tel #: (632) 8288-2686 / (632) 7004-9842",
  email: "E-mail: jjcenggworks@yahoo.com",
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
  const sectionSpacing = 6
  
  // Technical line weights (ISO standard)
  const LINE_WEIGHTS = {
    border: 0.5,
    divider: 0.3,
    grid: 0.15
  }
  
  // Standard font sizes
  const FONT_SIZES = {
    title: 14,
    header: 11,
    section: 9,
    body: 8,
    small: 7,
    tiny: 6,
    large: 12  // Added large font size for GRAND TOTAL emphasis
  }

  let yPos = margin

  // Get items and calculate total
  const items = poData.items || poData.selectedItems || []
  const totalAmount = items.reduce((sum, item) => 
    sum + ((item.quantity || 0) * (item.price_per_unit || 0)), 0
  )

  // Format currency - Remove "PHP" prefix and peso sign from unit price and amount
  const formatPeso = (amount) => {
    return amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }

  // Format currency with PHP prefix for totals
  const formatPesoWithPrefix = (amount) => {
    const formatted = amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
    return `PHP ${formatted}`
  }

  // Tax calculation
  const getTaxRate = () => {
    if (!poData.apply_tax) return 0 // No tax when apply_tax is false
    switch(poData.tax_type) {
      case 'goods': return 0.01 // 1%
      case 'services': return 0.02 // 2%
      case 'rental': return 0.05 // 5%
      default: return 0.01
    }
  }

  const calculateTaxBreakdown = () => {
    const totalBeforeWithholdingTax = totalAmount
    const subtotal = poData.apply_tax ? totalBeforeWithholdingTax / 1.12 : totalBeforeWithholdingTax // Remove 12% VAT only if tax is applied
    const taxRate = getTaxRate()
    const withholdingTax = subtotal * taxRate
    const totalAfterWithholdingTax = totalBeforeWithholdingTax - withholdingTax
    
    const discountAmount = poData.has_discount 
      ? totalAfterWithholdingTax * (Number(poData.discount_percentage) / 100)
      : 0
    
    const grandTotal = totalAfterWithholdingTax - discountAmount

    return {
      totalBeforeWithholdingTax,
      subtotal,
      taxRate: taxRate * 100,
      withholdingTax,
      totalAfterWithholdingTax,
      discountPercentage: poData.has_discount ? Number(poData.discount_percentage) : 0,
      discountAmount,
      grandTotal,
      applyTax: poData.apply_tax // Include flag for consistency
    }
  }

  const taxBreakdown = calculateTaxBreakdown()

  // ============================================================================
  // ITEMS TABLE PREPARATION
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

  // ============================================================================
  // PAGINATED ITEMS TABLE (10 items per page maximum)
  // ============================================================================
  
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(tableRows.length / ITEMS_PER_PAGE)
  
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, tableRows.length)
    const pageRows = tableRows.slice(startIndex, endIndex)
    
    if (pageIndex > 0) {
      doc.addPage()
    }
    
    yPos = margin

    // ============================================================================
    // TITLE BLOCK - ON EVERY PAGE
    // ============================================================================
    
    const titleBlockY = yPos
    const logoSize = 16
    const logoX = margin + 3
    
    // Company logo
    try {
      doc.setLineWidth(LINE_WEIGHTS.grid)
      doc.rect(logoX, titleBlockY, logoSize, logoSize)
      doc.addImage(COMPANY_INFO.logo, 'JPEG', logoX + 0.3, titleBlockY + 0.3, logoSize - 0.6, logoSize - 0.6)
    } catch (err) {
      console.warn("Logo not loaded:", err)
    }

    // Company information
    const companyX = logoX + logoSize + 4
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.header)
    doc.text(COMPANY_INFO.name, companyX, titleBlockY + 4)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(FONT_SIZES.body)
    doc.text(COMPANY_INFO.address, companyX, titleBlockY + 8)
    doc.text(COMPANY_INFO.address2, companyX, titleBlockY + 11)
    doc.text(COMPANY_INFO.phone, companyX, titleBlockY + 14)
    doc.text(COMPANY_INFO.email, companyX, titleBlockY + 17)

    // Document title box
    const titleX = pageWidth - rightMargin - 52
    doc.setLineWidth(LINE_WEIGHTS.divider)
    doc.rect(titleX, titleBlockY, 52, titleBlockHeight)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.title)
    doc.text("PURCHASE ORDER", titleX + 26, titleBlockY + 8, { align: "center" })
    
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.line(titleX, titleBlockY + 11, titleX + 52, titleBlockY + 11)
    
    // PO Number
    doc.setFontSize(FONT_SIZES.small)
    doc.setFont("helvetica", "normal")
    doc.text("P.O. # :", titleX + 5, titleBlockY + 16)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.header)
    doc.text(poData.po_number || "—", titleX + 26, titleBlockY + 22, { align: "center" })

    yPos = titleBlockY + titleBlockHeight + 2

    // Horizontal divider
    doc.setLineWidth(LINE_WEIGHTS.divider)
    doc.line(margin, yPos, pageWidth - rightMargin, yPos)

    yPos += 4

    // ============================================================================
    // INFORMATION GRID - ON EVERY PAGE
    // ============================================================================
    
    const gridStartY = yPos
    const gridHeight = 32
    const totalGridWidth = pageWidth - margin - rightMargin
    const col1Width = totalGridWidth / 2
    const col2Width = totalGridWidth / 2
    const col2X = margin + col1Width
    
    // Consistent header and row heights for both columns
    const headerHeight = 4.5
    const rowHeight = (gridHeight - headerHeight) / 2  // 13.75 units per row

    // ========== LEFT COLUMN - Supplier Information ==========
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.rect(margin, gridStartY, col1Width, gridHeight)
    
    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.section)
    doc.text("SUPPLIER'S NAME & ADDRESS", margin + 2, gridStartY + 3)
    
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.line(margin, gridStartY + headerHeight, margin + col1Width, gridStartY + headerHeight)
    
    // Row 1 - Supplier Name & Address
    const leftRow1Y = gridStartY + headerHeight
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.section)
    doc.text((poData.supplier_name || "").toUpperCase(), margin + 2, leftRow1Y + 4)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(FONT_SIZES.body)
    const supplierAddr = poData.supplier_address || ""
    const addrLines = doc.splitTextToSize(supplierAddr, col1Width - 4)
    addrLines.slice(0, 2).forEach((line, idx) => {
      doc.text(line, margin + 2, leftRow1Y + 7.5 + (idx * 3))
    })
    
    // Row 2 - Attention
    if (poData.attention_person) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(FONT_SIZES.section)
      doc.text(`Attention : ${poData.attention_person}`, margin + 2, leftRow1Y + rowHeight + (rowHeight / 2) + 1)
    }

    // ========== RIGHT COLUMN - Order Details ==========
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.rect(col2X, gridStartY, col2Width, gridHeight)
    
    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.section)
    doc.text("ORDER INFORMATION", col2X + 2, gridStartY + 3)
    
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.line(col2X, gridStartY + headerHeight, col2X + col2Width, gridStartY + headerHeight)

    // Row 1 - DATE
    const rightRow1Y = gridStartY + headerHeight
    doc.setFont("helvetica", "normal")
    doc.setFontSize(FONT_SIZES.section)
    doc.text("DATE :", col2X + 2, rightRow1Y + (rowHeight / 2) + 1)
    doc.text(poData.po_date || "—", col2X + 20, rightRow1Y + (rowHeight / 2) + 1)
    
    // Divider between rows
    const rightRow2Y = rightRow1Y + rowHeight
    doc.setLineWidth(LINE_WEIGHTS.grid)
    doc.line(col2X, rightRow2Y, col2X + col2Width, rightRow2Y)
    
    // Row 2 - TERMS
    doc.text("TERMS :", col2X + 2, rightRow2Y + (rowHeight / 2) + 1)
    doc.text(poData.terms || "—", col2X + 20, rightRow2Y + (rowHeight / 2) + 1)

    yPos = gridStartY + gridHeight + 4

    // ============================================================================
    // SHEET NUMBER
    // ============================================================================
    
    const currentPageNum = pageIndex + 1
    const sheetText = `SHEET ${currentPageNum} OF ${totalPages}`
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(FONT_SIZES.header)
    doc.text(sheetText, pageWidth / 2, yPos + 2, { align: "center" })

    yPos += 5
    
    // ============================================================================
    // ITEMS TABLE
    // ============================================================================
    
    autoTable(doc, {
      startY: yPos,
      columns: tableColumns,
      body: pageRows,
      theme: 'grid',
      tableWidth: 'auto',
      styles: {
        fontSize: FONT_SIZES.body,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: LINE_WEIGHTS.grid,
        textColor: [0, 0, 0],
        font: "helvetica",
        overflow: 'linebreak',
        minCellHeight: 6
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: LINE_WEIGHTS.divider,
        lineColor: [0, 0, 0],
        minCellHeight: 7,
        cellPadding: 2,
        fontSize: FONT_SIZES.body
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      columnStyles: {
        item: { cellWidth: 12, halign: 'center', fontStyle: 'normal', fontSize: FONT_SIZES.body },
        qty: { cellWidth: 12, halign: 'center', fontSize: FONT_SIZES.body },
        unit: { cellWidth: 15, halign: 'center', fontSize: FONT_SIZES.body },
        description: { halign: 'left', fontSize: FONT_SIZES.body },
        unitPrice: { cellWidth: 28, halign: 'right', fontStyle: 'normal', fontSize: FONT_SIZES.body },
        amount: { cellWidth: 28, halign: 'right', fontStyle: 'normal', fontSize: FONT_SIZES.body }
      },
      margin: { left: margin, right: rightMargin },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      didDrawPage: function(data) {
        const pageFooterY = pageHeight - margin - 5
        doc.setLineWidth(LINE_WEIGHTS.grid)
        doc.line(margin, pageFooterY, pageWidth - rightMargin, pageFooterY)
        
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.tiny)
        
        const genDate = new Date().toLocaleString('en-PH', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        
        doc.text(`GENERATED: ${genDate}`, margin + 1, pageFooterY + 2.5)
        doc.text(`PO-${poData.po_number || ""}`, pageWidth / 2, pageFooterY + 2.5, { align: "center" })
      }
    })
    
    yPos = doc.lastAutoTable.finalY + sectionSpacing
    
    // ============================================================================
    // TOTAL AMOUNT - ONLY ON LAST PAGE
    // ============================================================================
    
    if (pageIndex === totalPages - 1) {
      const totalBoxWidth = 75
      const totalBoxX = pageWidth - rightMargin - totalBoxWidth - 1
      
      // Fixed container dimensions for consistency
      const rowHeight = 5
      const topPadding = 3
      const bottomPadding = 2
      const dividerSpace = 1.5
      const grandTotalRowHeight = 8  // Increased from 5.5 to 8 for better GRAND TOTAL padding
      
      // Calculate rows dynamically
      let contentRows = 0
      if (poData.apply_tax) {
        contentRows = 3 // Gross Total, Subtotal, Withholding Tax
      } else {
        contentRows = 1 // Total Amount only
      }
      if (taxBreakdown.discountAmount > 0) {
        contentRows += 1 // Discount row
      }
      
      // Fixed total box height regardless of content
      const totalBoxHeight = topPadding + (contentRows * rowHeight) + dividerSpace + grandTotalRowHeight + bottomPadding
      
      doc.setLineWidth(LINE_WEIGHTS.divider)
      doc.rect(totalBoxX, yPos, totalBoxWidth, totalBoxHeight)
      
      let rowY = yPos + topPadding + 3.5
      
      if (poData.apply_tax) {
        // Gross Total (with VAT) - only show when tax is applied
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.small)
        doc.text("GROSS TOTAL (with 12% VAT) =", totalBoxX + 2, rowY)
        doc.setFontSize(FONT_SIZES.section)
        doc.text(formatPesoWithPrefix(taxBreakdown.totalBeforeWithholdingTax), totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })
        
        rowY += rowHeight
        
        // Subtotal (after VAT removal)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.tiny)
        doc.text("Subtotal (Gross ÷ 1.12) =", totalBoxX + 2, rowY)
        doc.setFontSize(FONT_SIZES.body)
        doc.text(formatPesoWithPrefix(taxBreakdown.subtotal), totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })
        
        rowY += rowHeight
        
        // Withholding Tax
        const taxTypeLabel = poData.tax_type ? poData.tax_type.charAt(0).toUpperCase() + poData.tax_type.slice(1) : 'Goods'
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.tiny)
        doc.text(`Less: Withholding Tax (${taxBreakdown.taxRate}% - ${taxTypeLabel}) =`, totalBoxX + 2, rowY)
        doc.setFontSize(FONT_SIZES.body)
        doc.text(`(${formatPesoWithPrefix(taxBreakdown.withholdingTax)})`, totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })
        
        rowY += rowHeight
      } else {
        // Simple Total Amount - when tax is not applied
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.small)
        doc.text("TOTAL AMOUNT =", totalBoxX + 2, rowY)
        doc.setFontSize(FONT_SIZES.section)
        doc.text(formatPesoWithPrefix(taxBreakdown.totalBeforeWithholdingTax), totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })
        
        rowY += rowHeight
      }
      
      // Discount if applicable
      if (taxBreakdown.discountAmount > 0) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.tiny)
        doc.text(`Less: Discount (${taxBreakdown.discountPercentage}%) =`, totalBoxX + 2, rowY)
        doc.setFontSize(FONT_SIZES.body)
        doc.text(`(${formatPesoWithPrefix(taxBreakdown.discountAmount)})`, totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })
        
        rowY += rowHeight
      }
      
      // Divider before Grand Total
      doc.setLineWidth(LINE_WEIGHTS.divider)
      doc.line(totalBoxX + 1, rowY + 0.5, totalBoxX + totalBoxWidth - 1, rowY + 0.5)
      
      rowY += dividerSpace + 3  // Increased spacing after divider for better GRAND TOTAL padding
      
      // Grand Total - Enhanced styling for better prominence
      doc.setFont("helvetica", "bold")
      doc.setFontSize(FONT_SIZES.body)  // Increased from small to body for better visibility
      doc.text("GRAND TOTAL =", totalBoxX + 2, rowY)
      
      doc.setFontSize(FONT_SIZES.large)  // Increased from section to large for emphasis
      doc.text(formatPesoWithPrefix(taxBreakdown.grandTotal), totalBoxX + totalBoxWidth - 2, rowY, { align: "right" })

      yPos += totalBoxHeight + sectionSpacing
    }
    
    // ============================================================================
    // APPROVAL SECTION
    // ============================================================================

    const sigSectionY = yPos
    const sigWidth = (pageWidth - margin - rightMargin - 4) / 3
    const sigBoxHeight = 22

    const preparedBy = Array.isArray(poData.prepared_by)
      ? poData.prepared_by.filter(p => p && p.trim())
      : poData.prepared_by ? poData.prepared_by.split(',').map(p => p.trim()).filter(p => p) : []

    const signatures = [
      { label: "PREPARED BY", names: preparedBy, x: margin + 1 },
      { label: "VERIFIED BY", names: [poData.verified_by || ""], x: margin + sigWidth + 2 },
      { label: "APPROVED BY", names: [poData.approved_by || ""], x: margin + 2 * sigWidth + 3 }
    ]

    signatures.forEach((sig) => {
      doc.setLineWidth(LINE_WEIGHTS.grid)
      doc.rect(sig.x, sigSectionY, sigWidth, sigBoxHeight)

      // Label
      doc.setFont("helvetica", "bold")
      doc.setFontSize(FONT_SIZES.tiny)
      doc.text(sig.label, sig.x + sigWidth / 2, sigSectionY + 3, { align: 'center' })

      if (sig.label === "PREPARED BY" && sig.names.length > 1) {
        const nameSpacing = sigWidth / sig.names.length
        sig.names.forEach((name, nameIdx) => {
          if (name && name.trim()) {
            const nameX = sig.x + (nameIdx * nameSpacing) + (nameSpacing / 2)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(FONT_SIZES.small)  // Increased size and made bold
            doc.text(name.toUpperCase(), nameX, sigSectionY + 7, { align: 'center' })  // Moved up slightly

            if (nameIdx < sig.names.length - 1) {
              const dividerX = sig.x + ((nameIdx + 1) * nameSpacing)
              doc.setLineWidth(LINE_WEIGHTS.grid)
              doc.line(dividerX, sigSectionY + 4, dividerX, sigSectionY + 9)  // Adjusted for closer line
            }
          }
        })

        doc.setLineWidth(LINE_WEIGHTS.grid)
        doc.line(sig.x + 3, sigSectionY + 10, sig.x + sigWidth - 3, sigSectionY + 10)  // Moved closer to name

      } else {
        const displayName = sig.names[0] || ""
        if (displayName && displayName.trim()) {
          doc.setFont("helvetica", "bold")
          doc.setFontSize(FONT_SIZES.small)  // Increased size and made bold
          doc.text(displayName.toUpperCase(), sig.x + sigWidth / 2, sigSectionY + 7, { align: 'center' })  // Moved up slightly
        }

        doc.setLineWidth(LINE_WEIGHTS.grid)
        doc.line(sig.x + 3, sigSectionY + 10, sig.x + sigWidth - 3, sigSectionY + 10)  // Moved closer to name
      }
    })

    yPos = sigSectionY + sigBoxHeight + sectionSpacing

    // ============================================================================
    // NOTES SECTION
    // ============================================================================
    
    if (poData.notes && poData.notes.trim()) {
      const footerY = pageHeight - margin - 5
      const availableNotesHeight = footerY - yPos - 8
      
      if (availableNotesHeight > 15) {
        doc.setLineWidth(LINE_WEIGHTS.grid)
        doc.rect(margin + 1, yPos, pageWidth - margin - rightMargin - 2, availableNotesHeight)
        
        doc.setFont("helvetica", "bold")
        doc.setFontSize(FONT_SIZES.body)
        doc.text("NOTES:", margin + 4, yPos + 5)
        
        doc.setLineWidth(LINE_WEIGHTS.grid)
        doc.line(margin + 1, yPos + 6.5, pageWidth - rightMargin - 1, yPos + 6.5)
        
        doc.setFont("helvetica", "normal")
        doc.setFontSize(FONT_SIZES.body)
        
        const lineHeight = 4
        const availableLines = Math.floor((availableNotesHeight - 10) / lineHeight)
        
        const notesLines = doc.splitTextToSize(poData.notes, pageWidth - margin - rightMargin - 8)
        const displayLines = notesLines.slice(0, availableLines)
        
        doc.text(displayLines, margin + 4, yPos + 10)
      }
    }
  }

  const fileName = `PO_${poData.po_number || 'PO'}_${poData.supplier_name || 'Supplier'}.pdf`
  doc.save(fileName)
}

/**
 * Excel Export with Professional Formatting - Matching PDF Layout
 */
export const exportPurchaseOrderToExcel = (poData) => {
  const wb = XLSX.utils.book_new()
  
  // Get items and calculate total
  const items = poData.items || poData.selectedItems || []
  const totalAmount = items.reduce((sum, item) => 
    sum + ((item.quantity || 0) * (item.price_per_unit || 0)), 0
  )

  // Format currency - Remove PHP prefix for unit prices and amounts
  const formatPeso = (amount) => {
    return amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }

  // Format currency with PHP prefix for totals
  const formatPesoWithPrefix = (amount) => {
    const formatted = amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
    return `PHP ${formatted}`
  }

  // Tax calculation functions
  const getTaxRate = () => {
    if (!poData.apply_tax) return 0 // No tax when apply_tax is false
    switch(poData.tax_type) {
      case 'goods': return 0.01
      case 'services': return 0.02
      case 'rental': return 0.05
      default: return 0.01
    }
  }

  const calculateTaxBreakdown = () => {
    const totalBeforeWithholdingTax = totalAmount
    const subtotal = poData.apply_tax ? totalBeforeWithholdingTax / 1.12 : totalBeforeWithholdingTax // Remove 12% VAT only if tax is applied
    const taxRate = getTaxRate()
    const withholdingTax = subtotal * taxRate
    const totalAfterWithholdingTax = totalBeforeWithholdingTax - withholdingTax
    
    const discountAmount = poData.has_discount 
      ? totalAfterWithholdingTax * (Number(poData.discount_percentage) / 100)
      : 0
    
    const grandTotal = totalAfterWithholdingTax - discountAmount

    return {
      totalBeforeWithholdingTax,
      subtotal,
      taxRate: taxRate * 100,
      withholdingTax,
      totalAfterWithholdingTax,
      discountPercentage: poData.has_discount ? Number(poData.discount_percentage) : 0,
      discountAmount,
      grandTotal,
      applyTax: poData.apply_tax // Include flag for consistency
    }
  }

  const taxBreakdown = calculateTaxBreakdown()
  const taxTypeLabel = poData.tax_type ? poData.tax_type.charAt(0).toUpperCase() + poData.tax_type.slice(1) : 'Goods'

  // Create worksheet data matching PDF layout
  const wsData = [
    // Row 1-4: Company Information (left side)
    [COMPANY_INFO.name, "", "", "", "", "", "", "", "", "", "", "PURCHASE ORDER"],
    [COMPANY_INFO.address, "", "", "", "", "", "", "", "", "", "", ""],
    [COMPANY_INFO.address2, "", "", "", "", "", "", "", "", "", "", ""],
    [COMPANY_INFO.phone, "", "", "", "", "", "", "", "", "", "", ""],
    [COMPANY_INFO.email, "", "", "", "", "", "", "", "", "", "", ""],
    [], // Empty row
    // Row 9-10: Information Grid Headers
    ["SUPPLIER'S NAME & ADDRESS", "", "", "", "", "ORDER INFORMATION", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", "", ""],
    // Row 11: Supplier Name
    [(poData.supplier_name || "").toUpperCase(), "", "", "", "", "DATE :", poData.po_date || "—", "", "", "", "", ""],
    // Row 12: Supplier Address Line 1
    [poData.supplier_address ? poData.supplier_address.split('\n')[0] || "" : "", "", "", "", "", "TERMS :", poData.terms || "—", "", "", "", "", ""],
    // Row 13: Supplier Address Line 2
    [poData.supplier_address ? poData.supplier_address.split('\n')[1] || "" : "", "", "", "", "", "", "", "", "", "", "", ""],
    // Row 14: Attention
    [`Attention: ${poData.attention_person || ""}`, "", "", "", "", "", "", "", "", "", "", ""],
    [], // Empty row
    // Row 16: Items Table Header
    ["ITEM", "QTY", "UNIT", "DESCRIPTION", "UNIT PRICE", "AMOUNT"],
    // Items rows
    ...items.map((item, index) => [
      (index + 1).toString().padStart(2, '0'),
      item.quantity || 0,
      item.unit || "pcs",
      item.item_name || item.description || "",
      formatPeso(item.price_per_unit || 0),
      formatPeso((item.quantity || 0) * (item.price_per_unit || 0))
    ]),
    [], // Empty row
    // Totals with Tax Breakdown (conditional)
    ...(poData.apply_tax ? [
      ["", "", "", "GROSS TOTAL (with 12% VAT) =", "", formatPesoWithPrefix(taxBreakdown.totalBeforeWithholdingTax)],
      ["", "", "", `Subtotal (Gross ÷ 1.12) =`, "", formatPesoWithPrefix(taxBreakdown.subtotal)],
      ["", "", "", `Less: Withholding Tax (${taxBreakdown.taxRate}% - ${taxTypeLabel}) =`, "", `(${formatPesoWithPrefix(taxBreakdown.withholdingTax)})`]
    ] : [
      ["", "", "", "TOTAL AMOUNT =", "", formatPesoWithPrefix(taxBreakdown.totalBeforeWithholdingTax)]
    ]),
    ...(taxBreakdown.discountAmount > 0 ? [
      ["", "", "", `Less: Discount (${taxBreakdown.discountPercentage}%) =`, "", `(${formatPesoWithPrefix(taxBreakdown.discountAmount)})`]
    ] : []),
    ["", "", "", "GRAND TOTAL =", "", formatPesoWithPrefix(taxBreakdown.grandTotal)],
    [], // Empty row
    // Signatures
    ["PREPARED BY", "", "", "VERIFIED BY", "", "", "APPROVED BY"],
    [Array.isArray(poData.prepared_by) ? poData.prepared_by.join(', ') : poData.prepared_by || "", 
     "", 
     "", 
     poData.verified_by || "", 
     "", 
     "", 
     poData.approved_by || ""],
    [], // Empty row
    // Notes
    ["NOTES:", poData.notes || ""]
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths to match PDF layout
  ws['!cols'] = [
    { wch: 3 },  // ITEM
    { wch: 8 },  // QTY
    { wch: 8 },  // UNIT
    { wch: 40 }, // DESCRIPTION
    { wch: 15 }, // UNIT PRICE
    { wch: 15 }, // AMOUNT
    { wch: 8 },  // DATE label
    { wch: 12 }, // DATE value
    { wch: 8 },  // TERMS label
    { wch: 12 }, // TERMS value
    { wch: 10 }, // PO label
    { wch: 15 }  // PO value
  ]

  // Calculate merge indices based on actual content
  const totalRowsBeforeSignatures = 4  // Consistent with PDF: always use maximum rows for merge calculations
  const signaturesOffset = 3 // Signatures section rows
  const notesOffset = 1 // Notes section rows
  
  // Merge cells to match PDF layout
  ws['!merges'] = [
    // Company name
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    // Company address lines
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
    // Title
    { s: { r: 0, c: 11 }, e: { r: 5, c: 11 } },
    // PO Number
    { s: { r: 6, c: 10 }, e: { r: 6, c: 11 } },
    // Information Grid Headers
    { s: { r: 8, c: 0 }, e: { r: 8, c: 4 } },
    { s: { r: 8, c: 5 }, e: { r: 8, c: 11 } },
    // Supplier Name
    { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } },
    // Supplier Address
    { s: { r: 11, c: 0 }, e: { r: 11, c: 4 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 4 } },
    // Attention
    { s: { r: 13, c: 0 }, e: { r: 13, c: 4 } },
    // Totals - merge labels with empty column
    ...Array.from({ length: totalRowsBeforeSignatures }, (_, i) => ({
      s: { r: wsData.length - (signaturesOffset + notesOffset + totalRowsBeforeSignatures) + i, c: 3 },
      e: { r: wsData.length - (signaturesOffset + notesOffset + totalRowsBeforeSignatures) + i, c: 4 }
    })),
    // Signatures
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 0 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 2 } },
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 3 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 5 } },
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 6 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 1, c: 6 } },
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 0 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 2 } },
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 3 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 5 } },
    { s: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 6 }, e: { r: wsData.length - (signaturesOffset + notesOffset) + 2, c: 6 } },
    // Notes
    { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 11 } }
  ]

  XLSX.utils.book_append_sheet(wb, ws, "Purchase Order")
  XLSX.writeFile(wb, `PO_${poData.po_number || 'PO'}_${poData.supplier_name || 'Supplier'}.xlsx`)
} 