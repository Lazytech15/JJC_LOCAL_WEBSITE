import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../../contexts/AuthContext"
import apiService from "/src/utils/api/api-service"
import * as XLSX from "xlsx"

export default function RestockList() {
  const { isDarkMode } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: "", supplier: "" })
  const [sortBy, setSortBy] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const pageSize = 5
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState([])
  const [isAllSelected, setIsAllSelected] = useState(false)
  
  // PO creation modal state
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [poLoading, setPOLoading] = useState(false)
  const [poNumber, setPONumber] = useState("")
  const [poGroups, setPOGroups] = useState([]) // [{ supplier, items: [], po_number }]
  const [currentPOIndex, setCurrentPOIndex] = useState(0)
  const [createdPOs, setCreatedPOs] = useState([])

  useEffect(() => {
    fetchItems()
  }, [filters])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const cleanFilters = Object.entries(filters).reduce((acc, [k, v]) => {
        if (v && String(v).trim() !== "") acc[k] = v
        return acc
      }, {})
      const result = await apiService.items.getItems({ ...cleanFilters, limit: 1000 })
      
      console.log("RestockList - Raw API response:", result)
      console.log("RestockList - Items fetched:", result.data?.length || 0)
      console.log("RestockList - Sample item with DB trigger status:", result.data?.[0])
      
      // Log status distribution from database triggers
      const statusCounts = result.data?.reduce((acc, item) => {
        const status = item.item_status || "Unknown"
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      console.log("RestockList - Status distribution from DB triggers:", statusCounts)
      
      setItems(result.data || [])
    } catch (err) {
      console.error("RestockList - Fetch error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Trust the database trigger - it automatically sets item_status based on:
  // balance = in_qty - out_qty
  // balance <= 0 → "Out of Stock"
  // 0 < balance < min_stock → "Low in Stock"  
  // balance >= min_stock → "In Stock"
  const normalizeStatus = (dbStatus) => {
    if (!dbStatus) return "In Stock" // Default fallback
    const status = String(dbStatus).trim()
    // Database returns exact strings: "Out of Stock", "Low in Stock", "In Stock"
    // Normalize to title case for UI consistency
    if (status === "Out of Stock") return "Out Of Stock"
    if (status === "Low in Stock") return "Low In Stock"
    if (status === "In Stock") return "In Stock"
    // Fallback for any unexpected values
    return "In Stock"
  }

  const getStatusDot = (status) => {
    const color = status === "Out Of Stock" ? "bg-red-500" : status === "Low In Stock" ? "bg-yellow-400" : "bg-green-500"
    return <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={status} aria-label={status} />
  }

  const restockItems = useMemo(() => {
    const withStatus = items.map((i) => {
      // Trust the database trigger's item_status field
      const status = normalizeStatus(i.item_status)
      const shortage = Math.max((Number(i.min_stock) || 0) - (Number(i.balance) || 0), 0)
      const recommended = Math.max(shortage, 1)
      return { ...i, __status: status, __shortage: shortage, __recommended_order: recommended }
    })
    
    let filtered = withStatus.filter((i) => i.__status === "Out Of Stock" || i.__status === "Low In Stock")

    // Apply header-based sorting if requested
    if (sortBy) {
      const dir = sortOrder === 'asc' ? 1 : -1
      filtered = filtered.sort((a, b) => {
        const getVal = (obj, key) => {
          switch (key) {
            case 'Item': return String(obj.item_name || '').toLowerCase()
            case 'Brand': return String(obj.brand || '').toLowerCase()
            case 'Location': return String(obj.location || '').toLowerCase()
            case 'Balance': return Number(obj.balance || 0)
            case 'Min Stock': return Number(obj.min_stock || 0)
            case 'Shortage': return Number(obj.__shortage || 0)
            case 'Reorder Qty': return Number(obj.__recommended_order || 0)
            case 'Status': return String(obj.__status || '').toLowerCase()
            case 'Supplier': return String(obj.supplier || '').toLowerCase()
            default: return ''
          }
        }
        const va = getVal(a, sortBy)
        const vb = getVal(b, sortBy)
        if (va < vb) return -1 * dir
        if (va > vb) return 1 * dir
        return 0
      })
    } else {
      // Default sort: Out of stock first, then by shortage desc, then name
      filtered = filtered.sort((a, b) => {
        const pri = (s) => (s === "Out Of Stock" ? 0 : s === "Low In Stock" ? 1 : 2)
        const pA = pri(a.__status)
        const pB = pri(b.__status)
        if (pA !== pB) return pA - pB
        if (b.__shortage !== a.__shortage) return b.__shortage - a.__shortage
        return String(a.item_name || "").localeCompare(String(b.item_name || ""))
      })
    }
    
    console.log("RestockList - Total items with status:", withStatus.length)
    console.log("RestockList - Filtered restock items:", filtered.length)
    console.log("RestockList - Restock items:", filtered)
    
    return filtered
  }, [items])

  // Derived paging
  const totalPages = Math.max(1, Math.ceil(restockItems.length / pageSize))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages])
  const pagedItems = restockItems.slice((page - 1) * pageSize, page * pageSize)

  const uniqueSuppliers = useMemo(() => {
    return [...new Set(items.filter((i) => i.supplier).map((i) => i.supplier))]
  }, [items])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount || 0)

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([])
      setIsAllSelected(false)
    } else {
      setSelectedItems(restockItems.map(item => item.item_no))
      setIsAllSelected(true)
    }
  }

  const handleSelectItem = (itemNo) => {
    if (selectedItems.includes(itemNo)) {
      setSelectedItems(selectedItems.filter(id => id !== itemNo))
      setIsAllSelected(false)
    } else {
      const newSelected = [...selectedItems, itemNo]
      setSelectedItems(newSelected)
      if (newSelected.length === restockItems.length) {
        setIsAllSelected(true)
      }
    }
  }

  const handleCreatePO = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to create a purchase order.")
      return
    }

    // Prepare groups by supplier and compute PO numbers for each group
    const selectedItemsData = restockItems.filter(item => selectedItems.includes(item.item_no))
    const supplierMap = selectedItemsData.reduce((acc, item) => {
      const supplier = item.supplier || "Unknown Supplier"
      if (!acc[supplier]) acc[supplier] = []
      acc[supplier].push(item)
      return acc
    }, {})

    const groups = Object.entries(supplierMap).map(([supplier, items]) => ({ supplier, items }))

    try {
      setPOLoading(true)
      // Get suggested next PO number from server
      const resp = await apiService.purchaseOrders.suggestPONumber()

      // API shape: { prefix, suggested_sequence, suggested_po, last_po }
      const prefix = resp.prefix || (resp.data && resp.data.prefix) || ''
      const suggestedPo = resp.suggested_po || (resp.data && resp.data.suggested_po)
      const suggestedSeq = resp.suggested_sequence || (resp.data && resp.data.suggested_sequence) || '001'

      // Build poGroups assigning incremented sequences per supplier
      const startSeq = parseInt(String(suggestedSeq).replace(/^0+/, '') || '0')
      const built = await Promise.all(groups.map(async (g, idx) => {
        const seqNum = startSeq + idx
        const seqStr = String(seqNum).padStart(3, '0')
        const po = prefix ? `${prefix}-${seqStr}` : (suggestedPo ? suggestedPo : `00${idx}`)

        // Attempt to fetch full supplier details by name
        let supplierDetails = { name: g.supplier }
        try {
          const supResp = await apiService.suppliers.getSuppliers({ name: g.supplier })
          if (supResp && (supResp.suppliers || supResp.data?.suppliers)) {
            const list = supResp.suppliers || supResp.data?.suppliers
            if (list.length > 0) supplierDetails = list[0]
          }
        } catch (err) {
          console.warn('Failed fetching supplier details for', g.supplier, err)
        }

        return { supplier: g.supplier, supplierDetails, items: g.items, po_number: po }
      }))

      setPOGroups(built)
      setCurrentPOIndex(0)
      setCreatedPOs([])
      // Prefill modal PO number and open
      setPONumber(built[0]?.po_number || '')
      setIsPOModalOpen(true)
    } catch (err) {
      console.error("Error preparing PO groups:", err)
      alert("Failed to prepare purchase orders. Please try again.")
    } finally {
      setPOLoading(false)
    }
  }

  // helper: ensure poNumber is available (check and bump if exists)
  const resolveAvailablePONumber = async (basePrefix, seqStart) => {
    let trial = seqStart
    for (let i = 0; i < 200; i++) {
      const seqStr = String(trial).padStart(3, '0')
      const candidate = `${basePrefix}-${seqStr}`
      try {
        const check = await apiService.purchaseOrders.checkPONumber(candidate)
        // if API returns success and exists flag
        const exists = (check && (check.exists || check.data?.exists))
        if (!exists) return candidate
      } catch (err) {
        // If check fails, assume candidate available to avoid blocking
        return candidate
      }
      trial++
    }
    throw new Error('Unable to generate available PO number')
  }

  const handleConfirmCreatePO = async () => {
    // process current group index only; modal will iterate per group
    const group = poGroups[currentPOIndex]
    if (!group) return
    const supplier = group.supplier
    if (!poNumber || !poNumber.trim()) {
      alert('Please enter a PO number for ' + supplier)
      return
    }

    // Prepare items payload expected by API
      const itemsPayload = group.items.map(item => ({
      item_no: item.item_no,
      item_name: item.item_name,
      quantity: item.__recommended_order || 1,
      unit: item.unit_of_measure || 'pcs',
      price_per_unit: Number(item.price_per_unit) || 0
    }))

    try {
      setPOLoading(true)

      // Ensure PO number is available; if prefix present, use its prefix
      const parts = poNumber.split('-')
      let finalPONumber = poNumber
      if (parts.length === 2) {
        const basePrefix = parts[0]
        const seq = parseInt(parts[1].replace(/^0+/, '') || '0')
        try {
          finalPONumber = await resolveAvailablePONumber(basePrefix, seq)
        } catch (err) {
          console.warn('PO number resolution warning:', err)
        }
      }

      const poData = {
        po_number: finalPONumber,
        supplier_name: supplier,
        supplier_details: group.supplierDetails || null,
        supplier_address: group.supplierDetails ? apiService.suppliers.getFullAddress(group.supplierDetails) : undefined,
        items: itemsPayload,
        notes: `Auto-generated from Restock List for ${itemsPayload.length} items`
      }

      const result = await apiService.purchaseOrders.createPurchaseOrder(poData)
      // record created
      setCreatedPOs(prev => [...prev, { supplier, po: finalPONumber, result }])

      // Advance to next group
      const nextIndex = currentPOIndex + 1
      if (nextIndex < poGroups.length) {
        // compute next PO number by incrementing sequence if same prefix
        const prevParts = finalPONumber.split('-')
        if (prevParts.length === 2) {
          const prefix = prevParts[0]
          const prevSeq = parseInt(prevParts[1].replace(/^0+/, '') || '0')
          const nextSeq = prevSeq + 1
          const nextSeqStr = String(nextSeq).padStart(3, '0')
          const nextPo = `${prefix}-${nextSeqStr}`
          setPONumber(nextPo)
          // Update next group po_number too
          setPOGroups(prev => prev.map((g, i) => i === nextIndex ? { ...g, po_number: nextPo } : g))
        } else {
          // fallback: keep whatever assigned
          setPONumber(poGroups[nextIndex].po_number || '')
        }
        setCurrentPOIndex(nextIndex)
      } else {
        // Completed all groups
        setIsPOModalOpen(false)
        setSelectedItems([])
        setIsAllSelected(false)
        // Show summary
        const summary = createdPOs.concat([{ supplier, po: finalPONumber }]).map(c => `${c.po} (${c.supplier})`).join(', ')
        alert(`Created Purchase Orders: ${summary}`)
      }

    } catch (err) {
      console.error('Error creating purchase order for supplier', supplier, err)
      alert('Failed to create purchase order for ' + supplier + '. ' + (err.message || ''))
    } finally {
      setPOLoading(false)
    }
  }

  const handleBulkExport = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to export.")
      return
    }
    
    const selectedData = restockItems.filter(item => selectedItems.includes(item.item_no))
    
    const rows = selectedData.map((i) => ({
      "Item No": i.item_no,
      "Item Name": i.item_name,
      Brand: i.brand || "",
      Location: i.location || "",
      Status: i.__status,
      Balance: Number(i.balance) || 0,
      "Min Stock": Number(i.min_stock) || 0,
      Shortage: i.__shortage,
      "Recommended Order Qty": i.__recommended_order,
      Supplier: i.supplier || "",
      "Unit": i.unit_of_measure || "",
      "Price/Unit": Number(i.price_per_unit) || 0,
      "Estimated Order Value": (Number(i.__recommended_order) || 0) * (Number(i.price_per_unit) || 0),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Selected Items")
    XLSX.writeFile(wb, `Restock_Selected_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportToExcel = () => {
    // Sheet 1: Restock (detailed rows)
    const restockRows = restockItems.map((i) => ({
      "Item No": i.item_no,
      "Item Name": i.item_name,
      Brand: i.brand || "",
      Location: i.location || "",
      Status: i.__status,
      Balance: Number(i.balance) || 0,
      "Min Stock": Number(i.min_stock) || 0,
      Shortage: i.__shortage,
      "Recommended Order Qty": i.__recommended_order,
      Supplier: i.supplier || "",
      "Unit": i.unit_of_measure || "",
      "Price/Unit": Number(i.price_per_unit) || 0,
      "Estimated Order Value": (Number(i.__recommended_order) || 0) * (Number(i.price_per_unit) || 0),
    }))

    // Aggregates for Stats and Insights
    const totalInventoryItems = items.length
    const totalRestockItems = restockItems.length
    const totalShortageUnits = restockItems.reduce((s, r) => s + (Number(r.__shortage) || 0), 0)
    const totalRecommendedQty = restockItems.reduce((s, r) => s + (Number(r.__recommended_order) || 0), 0)
    const totalRecommendedValue = restockItems.reduce(
      (s, r) => s + (Number(r.__recommended_order) || 0) * (Number(r.price_per_unit) || 0),
      0
    )
    const outOfStockCount = restockItems.filter((r) => r.__status === "Out Of Stock").length
    const lowInStockCount = restockItems.filter((r) => r.__status === "Low In Stock").length

    // Top items by shortage and by recommended order
    const topByShortage = [...restockItems]
      .sort((a, b) => (b.__shortage || 0) - (a.__shortage || 0))
      .slice(0, 10)
    const topByRecommended = [...restockItems]
      .sort((a, b) => (b.__recommended_order || 0) - (a.__recommended_order || 0))
      .slice(0, 10)

    // Supplier summary
    const supplierMap = restockItems.reduce((acc, it) => {
      const sup = it.supplier || "(Unknown)"
      if (!acc[sup]) acc[sup] = { supplier: sup, count: 0, recommendedQty: 0, value: 0 }
      acc[sup].count += 1
      acc[sup].recommendedQty += Number(it.__recommended_order) || 0
      acc[sup].value += (Number(it.__recommended_order) || 0) * (Number(it.price_per_unit) || 0)
      return acc
    }, {})
    const supplierSummary = Object.values(supplierMap).sort((a, b) => b.recommendedQty - a.recommendedQty)

    // Scheduling projection (simple estimate over 30 days)
    const projectedDaily = totalRecommendedQty / 30
    const projectedWeekly = projectedDaily * 7
    const projectedMonthly = totalRecommendedQty

    const wb = XLSX.utils.book_new()

    // Restock sheet (detailed)
    const wsRestock = XLSX.utils.json_to_sheet(restockRows)
    XLSX.utils.book_append_sheet(wb, wsRestock, "Restock")

    // Stats sheet - build as array of arrays so we can create sections
    const statsAoA = []
    const today = new Date().toISOString().slice(0, 10)
    statsAoA.push(["Metric", "Value"])
    statsAoA.push(["Report Date", today])
    statsAoA.push(["Total Inventory Items", totalInventoryItems])
    statsAoA.push(["Total Restock Items (Low/Out)", totalRestockItems])
    statsAoA.push(["Total Shortage Units", totalShortageUnits])
    statsAoA.push(["Total Recommended Order Qty", totalRecommendedQty])
  statsAoA.push(["Total Estimated Recommended Order Value", totalRecommendedValue])
    statsAoA.push(["Average Shortage per Restock Item", totalRestockItems ? totalShortageUnits / totalRestockItems : 0])
    statsAoA.push([])
    statsAoA.push(["Status Breakdown", "Count"])
    statsAoA.push(["Out Of Stock", outOfStockCount])
    statsAoA.push(["Low In Stock", lowInStockCount])
    statsAoA.push([])
    statsAoA.push(["Scheduling Projection (next 30 days)", "Estimated Qty"])
    statsAoA.push(["Daily (avg)", Math.round(projectedDaily)])
    statsAoA.push(["Weekly (avg)", Math.round(projectedWeekly)])
    statsAoA.push(["Monthly (total)", Math.round(projectedMonthly)])
    statsAoA.push([])
    statsAoA.push(["Top Items by Shortage (top 10)"])
    statsAoA.push(["Item No", "Item Name", "Shortage", "Recommended", "Price/Unit", "Estimated Order Value"])
    topByShortage.forEach((it) => {
        statsAoA.push([
        it.item_no,
        it.item_name,
        it.__shortage,
        it.__recommended_order,
        Number(it.price_per_unit) || 0,
        (Number(it.__recommended_order) || 0) * (Number(it.price_per_unit) || 0),
      ])
    })
    statsAoA.push([])
    statsAoA.push(["Top Items by Recommended Order (top 10)"])
    statsAoA.push(["Item No", "Item Name", "Recommended", "Shortage", "Price/Unit", "Estimated Order Value"])
    topByRecommended.forEach((it) => {
      statsAoA.push([
        it.item_no,
        it.item_name,
        it.__recommended_order,
        it.__shortage,
        Number(it.price_per_unit) || 0,
        (Number(it.__recommended_order) || 0) * (Number(it.price_per_unit) || 0),
      ])
    })
    statsAoA.push([])
    statsAoA.push(["Supplier Summary"])
    statsAoA.push(["Supplier", "Restock Items", "Total Recommended Qty", "Total Estimated Value"])
    supplierSummary.forEach((s) => {
      statsAoA.push([s.supplier, s.count, s.recommendedQty, s.value])
    })

    const wsStats = XLSX.utils.aoa_to_sheet(statsAoA)
    XLSX.utils.book_append_sheet(wb, wsStats, "Stats")

    // Helper: find header cells and apply PHP currency formatting to numeric cells below
    const applyCurrencyByHeader = (ws, headerTexts) => {
      if (!ws || !ws['!ref']) return
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = ws[addr]
          if (!cell) continue
          if (typeof cell.v === 'string' && headerTexts.includes(cell.v)) {
            // apply to every cell below this header in the same column
            for (let r2 = R + 1; r2 <= range.e.r; ++r2) {
              const dataAddr = XLSX.utils.encode_cell({ r: r2, c: C })
              const dataCell = ws[dataAddr]
                if (dataCell && typeof dataCell.v === 'number') {
                dataCell.t = 'n'
                // Excel format code for Philippine Peso (zero decimals)
                dataCell.z = '[$\u20B1-zh-ph]#,##0'
              }
            }
          }
        }
      }
    }

    // Set column widths for better readability (approximate)
    wsRestock['!cols'] = [
      { wch: 10 }, // Item No
      { wch: 30 }, // Item Name
      { wch: 15 }, // Brand
      { wch: 15 }, // Location
      { wch: 12 }, // Status
      { wch: 8 }, // Balance
      { wch: 8 }, // Min Stock
      { wch: 8 }, // Shortage
      { wch: 12 }, // Recommended Order Qty
      { wch: 18 }, // Supplier
      { wch: 8 }, // Unit
      { wch: 12 }, // Price/Unit
      { wch: 16 }, // Estimated Order Value
    ]
    // Stats sheet column widths (flexible, stats is mixed content)
    wsStats['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }]

    // Apply currency formatting to the Restock and Stats sheets
    applyCurrencyByHeader(wsRestock, ['Price/Unit', 'Estimated Order Value'])
    applyCurrencyByHeader(wsStats, [
      'Total Estimated Recommended Order Value',
      'Price/Unit',
      'Estimated Order Value',
      'Total Estimated Value',
    ])

    // Insights sheet - human readable highlights
    const insightsAoA = []
    insightsAoA.push(["Insights"])
    insightsAoA.push([])
    insightsAoA.push(["Report Date", today])
    insightsAoA.push([])
    // Key insights
    if (totalRestockItems === 0) {
      insightsAoA.push(["No items currently require restocking."])
    } else {
      const highestShortage = topByShortage[0]
      const highestRecommended = topByRecommended[0]
      insightsAoA.push([`Total items needing restock: ${totalRestockItems}`])
      insightsAoA.push([`Total recommended order qty: ${totalRecommendedQty}`])
      insightsAoA.push([`Estimated recommended order value: ${formatCurrency(totalRecommendedValue)}`])
      insightsAoA.push([])
      if (highestShortage) {
        insightsAoA.push([`Highest shortage: ${highestShortage.item_name} (ID: ${highestShortage.item_no}) — Shortage: ${highestShortage.__shortage}, Recommended: ${highestShortage.__recommended_order}`])
      }
      if (highestRecommended) {
        insightsAoA.push([`Largest single recommended order: ${highestRecommended.item_name} (ID: ${highestRecommended.item_no}) — Recommended: ${highestRecommended.__recommended_order}`])
      }
      if (supplierSummary.length) {
        insightsAoA.push([])
        insightsAoA.push([`Top supplier by recommended qty: ${supplierSummary[0].supplier} — Qty: ${supplierSummary[0].recommendedQty}`])
      }
      insightsAoA.push([])
      insightsAoA.push([`Projection (avg per period over next 30 days): Daily: ${Math.round(projectedDaily)}, Weekly: ${Math.round(projectedWeekly)}, Monthly: ${Math.round(projectedMonthly)}`])
    }

    const wsInsights = XLSX.utils.aoa_to_sheet(insightsAoA)
    XLSX.utils.book_append_sheet(wb, wsInsights, "Insights")

    // Final write
    XLSX.writeFile(wb, `Restock_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Restock List</h2>
          <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {restockItems.length} items — page {page} of {totalPages} {selectedItems.length > 0 && `(${selectedItems.length} selected)`}
          </div>
          {selectedItems.length > 0 && (
            <>
              <button
                onClick={handleCreatePO}
                disabled={poLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📋 Create PO
              </button>
              <button
                onClick={handleBulkExport}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                📤 Export Selected
              </button>
            </>
          )}
          <button
            onClick={exportToExcel}
            disabled={restockItems.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export All to Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search items..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Supplier</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-black/30 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">All Suppliers</option>
              {uniqueSuppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600 dark:border-zinc-400 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading restock items...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/10 dark:bg-black/20">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </th>
                  {['Item','Brand','Location','Balance','Min Stock','Shortage','Reorder Qty','Status','Supplier'].map((h) => (
                    <th
                      key={h}
                      onClick={() => {
                        if (sortBy === h) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                        else { setSortBy(h); setSortOrder('asc') }
                        setPage(1)
                      }}
                      className={`px-4 py-3 ${h === 'Balance' || h === 'Min Stock' || h === 'Shortage' || h === 'Reorder Qty' ? 'text-center' : 'text-left'} font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{h}</span>
                        {sortBy === h && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
                {pagedItems.map((item) => (
                  <tr 
                    key={item.item_no} 
                    className={`hover:bg-white/5 dark:hover:bg-black/10 transition-colors ${selectedItems.includes(item.item_no) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.item_no)}
                        onChange={() => handleSelectItem(item.item_no)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.item_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.item_no}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.brand || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">{item.balance || 0} {item.unit_of_measure || ''}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{item.min_stock || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{item.__shortage}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">{item.__recommended_order}</td>
                    <td className="px-4 py-3 text-center">{getStatusDot(item.__status)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.supplier || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {restockItems.length > pageSize && (
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40">Prev</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded-md ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>{i + 1}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}

          {restockItems.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">No low/out-of-stock items found.</div>
            </div>
          )}
        </div>
      )}

      {/* PO Creation Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Create Purchase Order
            </h3>
            
            <div className="space-y-6">
              {/* Show current group / supplier info */}
              {poGroups.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Creating PO for supplier</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">{poGroups[currentPOIndex]?.supplier || 'N/A'}</div>
                      {poGroups[currentPOIndex]?.supplierDetails && (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          <div><strong>Contact:</strong> {poGroups[currentPOIndex].supplierDetails.contact_person || poGroups[currentPOIndex].supplierDetails.contact || 'N/A'}</div>
                          <div><strong>Email:</strong> {poGroups[currentPOIndex].supplierDetails.email || 'N/A'}</div>
                          <div><strong>Phone:</strong> {poGroups[currentPOIndex].supplierDetails.phone || 'N/A'}</div>
                          <div><strong>Payment Terms:</strong> {poGroups[currentPOIndex].supplierDetails.payment_terms || 'N/A'}</div>
                          <div><strong>Tax ID:</strong> {poGroups[currentPOIndex].supplierDetails.tax_id || 'N/A'}</div>
                          <div><strong>Website:</strong> {poGroups[currentPOIndex].supplierDetails.website || 'N/A'}</div>
                          <div><strong>Address:</strong> {apiService.suppliers.getFullAddress(poGroups[currentPOIndex].supplierDetails)}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">PO {currentPOIndex + 1} of {poGroups.length}</div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PO Number *
                </label>
                <input
                  type="text"
                  value={poNumber || poGroups[currentPOIndex]?.po_number || ''}
                  onChange={(e) => setPONumber(e.target.value)}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter PO number"
                />
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Items for this PO ({poGroups[currentPOIndex]?.items?.length || 0})
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Item</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-800 dark:text-gray-200">Qty</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Supplier</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(poGroups[currentPOIndex]?.items || []).map((item) => (
                        <tr key={item.item_no}>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.item_no}</div>
                          </td>
                          <td className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                            {item.__recommended_order}
                          </td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                            {item.supplier || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency((item.price_per_unit || item.unit_price || 0) * (item.__recommended_order || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Estimated Value:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      restockItems
                        .filter(item => selectedItems.includes(item.item_no))
                        .reduce((sum, item) => sum + (item.price_per_unit * item.__recommended_order), 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ℹ️ Purchase orders will be grouped by supplier automatically. Multiple POs may be created if items are from different suppliers.
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleConfirmCreatePO}
                disabled={poLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {poLoading ? "Creating..." : "Create Purchase Order"}
              </button>
              <button
                onClick={() => {
                  setIsPOModalOpen(false)
                  setPONumber("")
                  setPOGroups([])
                  setCurrentPOIndex(0)
                  setCreatedPOs([])
                }}
                disabled={poLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
