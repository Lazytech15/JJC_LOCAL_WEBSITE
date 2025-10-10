import { useEffect, useMemo, useState } from "react"
import apiService from "/src/utils/api/api-service"
import * as XLSX from "xlsx"

export default function RestockList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: "", supplier: "" })
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState([])
  const [isAllSelected, setIsAllSelected] = useState(false)
  
  // PO creation modal state
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [poLoading, setPOLoading] = useState(false)
  const [poNumber, setPONumber] = useState("")

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
    
    const filtered = withStatus
      .filter((i) => i.__status === "Out Of Stock" || i.__status === "Low In Stock")
      .sort((a, b) => {
        // Out of stock first
        const pri = (s) => (s === "Out Of Stock" ? 0 : s === "Low In Stock" ? 1 : 2)
        const pA = pri(a.__status)
        const pB = pri(b.__status)
        if (pA !== pB) return pA - pB
        // Then by highest shortage
        if (b.__shortage !== a.__shortage) return b.__shortage - a.__shortage
        // Then by name
        return String(a.item_name || "").localeCompare(String(b.item_name || ""))
      })
    
    console.log("RestockList - Total items with status:", withStatus.length)
    console.log("RestockList - Filtered restock items:", filtered.length)
    console.log("RestockList - Restock items:", filtered)
    
    return filtered
  }, [items])

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
    
    // Get suggested PO number
    try {
      setPOLoading(true)
      const result = await apiService.purchaseOrders.suggestPONumber()
      setPONumber(result.data?.suggested_po_number || "")
      setIsPOModalOpen(true)
    } catch (err) {
      console.error("Error getting suggested PO number:", err)
      alert("Failed to generate PO number. Please try again.")
    } finally {
      setPOLoading(false)
    }
  }

  const handleConfirmCreatePO = async () => {
    if (!poNumber.trim()) {
      alert("Please enter a PO number.")
      return
    }

    const selectedItemsData = restockItems.filter(item => selectedItems.includes(item.item_no))
    
    // Group by supplier
    const supplierGroups = selectedItemsData.reduce((acc, item) => {
      const supplier = item.supplier || "Unknown Supplier"
      if (!acc[supplier]) {
        acc[supplier] = []
      }
      acc[supplier].push({
        item_no: item.item_no,
        item_name: item.item_name,
        quantity: item.__recommended_order,
        unit_price: item.price_per_unit || 0,
        unit_of_measure: item.unit_of_measure || ""
      })
      return acc
    }, {})

    try {
      setPOLoading(true)
      
      // Create PO for each supplier
      const promises = Object.entries(supplierGroups).map(([supplier, items]) => {
        const poData = {
          po_number: poNumber,
          supplier: supplier,
          items: items,
          status: "Pending",
          notes: `Auto-generated from Restock List for ${items.length} items`
        }
        return apiService.purchaseOrders.createPurchaseOrder(poData)
      })

      await Promise.all(promises)
      
      alert(`Purchase Order(s) created successfully! PO Number: ${poNumber}`)
      setIsPOModalOpen(false)
      setSelectedItems([])
      setIsAllSelected(false)
      
    } catch (err) {
      console.error("Error creating purchase order:", err)
      alert("Failed to create purchase order. Please try again.")
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
            Showing {restockItems.length} items {selectedItems.length > 0 && `(${selectedItems.length} selected)`}
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Brand</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Location</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Balance</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Min Stock</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Shortage</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Reorder Qty</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
                {restockItems.map((item) => (
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PO Number *
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPONumber(e.target.value)}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter PO number"
                />
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Selected Items ({selectedItems.length})
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
                      {restockItems
                        .filter(item => selectedItems.includes(item.item_no))
                        .map((item) => (
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
                              {formatCurrency(item.price_per_unit * item.__recommended_order)}
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
