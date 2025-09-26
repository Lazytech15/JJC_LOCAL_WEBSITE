import { useEffect, useMemo, useState } from "react"
import apiService from "/src/utils/api/api-service"
import * as XLSX from "xlsx"

export default function RestockList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: "", supplier: "" })
  const [usageTransactions, setUsageTransactions] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)

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
      setItems(result.data || [])
      // try to fetch optional dashboard/usage stats which may include raw transactions or pre-aggregated stats
      try {
        const statsRes = await apiService.items.getDashboardStats()
        const payload = statsRes && statsRes.data ? statsRes.data : statsRes
        setDashboardStats(payload || null)
        if (payload && Array.isArray(payload.transactions)) setUsageTransactions(payload.transactions)
        else if (payload && Array.isArray(payload.txns)) setUsageTransactions(payload.txns)
      } catch (e) {
        // ignore - analytics sheets will simply be empty or rely on items data
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusFromText = (text) => {
    if (!text) return null
    const t = String(text).toLowerCase().trim()
    if (t.includes("out")) return "Out Of Stock"
    if (t.includes("low")) return "Low In Stock"
    if (t.includes("in")) return "In Stock"
    return null
  }
  const deriveStatus = (item) => {
    const bal = Number(item.balance) || 0
    const min = Number(item.min_stock) || 0
    if (bal === 0) return "Out Of Stock"
    if (min > 0 && bal < min) return "Low In Stock"
    return "In Stock"
  }

  const getStatusDot = (status) => {
    const color = status === "Out Of Stock" ? "bg-red-500" : status === "Low In Stock" ? "bg-yellow-400" : "bg-green-500"
    return <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={status} aria-label={status} />
  }

  const restockItems = useMemo(() => {
    const withStatus = items.map((i) => {
      const status = statusFromText(i.item_status) || deriveStatus(i)
      const shortage = Math.max((Number(i.min_stock) || 0) - (Number(i.balance) || 0), 0)
      const recommended = Math.max(shortage, 1)
      return { ...i, __status: status, __shortage: shortage, __recommended_order: recommended }
    })
    return withStatus
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
  }, [items])

  const uniqueSuppliers = useMemo(() => {
    return [...new Set(items.filter((i) => i.supplier).map((i) => i.supplier))]
  }, [items])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount || 0)

  const exportToExcel = () => {
    const rows = restockItems.map((i) => ({
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
      "Price/Unit": Number(i.price_per_unit) || 0,
      "Total Value": (Number(i.balance) || 0) * (Number(i.price_per_unit) || 0),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Restock")

    // Build analytics from usageTransactions (if available) or from dashboardStats
    const txnsRaw = Array.isArray(usageTransactions) && usageTransactions.length ? usageTransactions : []
    // normalize transaction records to { item_key, item_name, quantity, date }
    const normalize = (r) => {
      if (!r) return null
      const dateVal = r.date || r.created_at || r.ts || r.timestamp || r.time || r.txn_date || r.txnTime || null
      const qty = r.quantity ?? r.qty ?? r.out_qty ?? r.count ?? 0
      const name = r.item_name || r.name || r.item_desc || r.description || r.label || ''
      const id = r.item_no || r.item_id || r.id || r.sku || r.code || name
      const parsedDate = dateVal ? new Date(dateVal) : null
      return { item_key: id, item_name: name || id, quantity: Number(qty) || 0, date: parsedDate }
    }

    const txns = txnsRaw.map(normalize).filter((x) => x && x.date instanceof Date && !isNaN(x.date) && x.quantity)

    // Aggregations
    const aggregate = (arr, keyFn) => arr.reduce((acc, cur) => {
      const k = keyFn(cur)
      acc[k] = (acc[k] || 0) + cur.quantity
      return acc
    }, {})

    // Daily
    const dailyMap = aggregate(txns, (t) => t.date.toISOString().slice(0, 10))
    const takenDailyRows = Object.entries(dailyMap).map(([k, v]) => ({ Date: k, Quantity: v }))

    // Weekly (ISO week-year key)
    const getISOWeek = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const day = date.getUTCDay() || 7
      date.setUTCDate(date.getUTCDate() + 4 - day)
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    }
    const weeklyMap = aggregate(txns, (t) => getISOWeek(t.date))
    const takenWeeklyRows = Object.entries(weeklyMap).map(([k, v]) => ({ Week: k, Quantity: v }))

    // Monthly
    const monthlyMap = aggregate(txns, (t) => `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`)
    const takenMonthlyRows = Object.entries(monthlyMap).map(([k, v]) => ({ Month: k, Quantity: v }))

    // Most taken items overall
    const itemMap = aggregate(txns, (t) => (t.item_key || t.item_name))
    const mostTakenRows = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ Rank: i + 1, Item: k, Quantity: v }))

    // Insights
    const insights = []
    insights.push({ Metric: 'Total Transaction Records', Value: txns.length })
    insights.push({ Metric: 'Total Quantity Taken', Value: Object.values(itemMap).reduce((s, n) => s + n, 0) })
    if (mostTakenRows.length) insights.push({ Metric: 'Top Item', Value: `${mostTakenRows[0].Item} (${mostTakenRows[0].Quantity})` })
    if (dashboardStats) insights.push({ Metric: 'Dashboard Summary', Value: JSON.stringify(dashboardStats).slice(0, 400) })

    // Append sheets when we have data
    if (txns.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(takenDailyRows), 'Taken_Daily')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(takenWeeklyRows), 'Taken_Weekly')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(takenMonthlyRows), 'Taken_Monthly')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mostTakenRows), 'Most_Taken')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insights), 'Insights')
    } else if (dashboardStats) {
      // fallback to dashboard-provided aggregates if present
      if (dashboardStats.taken_by_period) {
        if (dashboardStats.taken_by_period.daily) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardStats.taken_by_period.daily), 'Taken_Daily')
        if (dashboardStats.taken_by_period.weekly) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardStats.taken_by_period.weekly), 'Taken_Weekly')
        if (dashboardStats.taken_by_period.monthly) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardStats.taken_by_period.monthly), 'Taken_Monthly')
      }
      if (dashboardStats.most_taken) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardStats.most_taken), 'Most_Taken')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Metric: 'Dashboard Summary', Value: JSON.stringify(dashboardStats).slice(0, 400) }]), 'Insights')
    }

    XLSX.writeFile(wb, `Restock_List_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Restock List</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {restockItems.length} items
          </div>
          <button
            onClick={exportToExcel}
            disabled={restockItems.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export to Excel
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
                  <tr key={item.item_no} className="hover:bg-white/5 dark:hover:bg-black/10 transition-colors">
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
    </div>
  )
}
