import React, { useState, useMemo, useEffect } from "react"
import { Archive, Package, AlertTriangle, FileText, Search, User, Clock, RefreshCw, MapPin } from "lucide-react"

function StockMaterialsTab({ isDarkMode, apiService }) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filterByClient, setFilterByClient] = useState("")
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    // Load data on mount
    useEffect(() => {
        loadAllUnusedMaterials()
    }, [])

    const loadAllUnusedMaterials = async () => {
  try {
    setLoading(true)
    setError(null)
    console.log('📦 Loading unused materials from database...')

    // ✅ Fetch directly from operations_subphase_materials table
    const response = await apiService.operations.getMaterials({
      status: 'returned'
    })
    
    // Handle different response formats
    let materials = []
    if (response?.success && Array.isArray(response.data)) {
      materials = response.data
    } else if (Array.isArray(response)) {
      materials = response
    } else if (response?.data && Array.isArray(response.data)) {
      materials = response.data
    }
    
    console.log(`✅ Found ${materials.length} unused materials in database`)
    
    // Transform to expected format
    const allUnusedMaterials = materials.map(mat => ({
      id: mat.id,
      name: mat.material_name,
      quantity: parseFloat(mat.material_quantity) || 0,
      unit: mat.unit_of_measure || 'pcs',
      reason: mat.notes || 'Unused/Leftover material',
      
      // ✅ FIXED: Assigned user info
      assigned_user_uid: mat.checked_out_by_uid || null,
      assigned_user_name: mat.original_assigned_user || mat.checked_out_by_name || 'Unknown',
      assigned_user_barcode: mat.checked_out_by || null,
      
      date_added: mat.created_at,
      
      // Source location
      item_name: mat.item_name || 'Unknown',
      item_part_number: mat.item_part_number,
      client_name: mat.client_name,
      phase_name: mat.phase_name || 'Unknown',
      subphase_name: mat.subphase_name || 'Unknown',
      subphase_id: mat.subphase_id,
      phase_id: mat.phase_id,
      
      // Additional context
      from_unused: mat.from_unused || false,
      unused_notes: mat.notes
    }))

    console.log(`✅ Total unused materials: ${allUnusedMaterials.length}`)
    setItems(allUnusedMaterials) // Store directly
    
  } catch (err) {
    console.error('❌ Failed to load unused materials:', err)
    setError(`Failed to load data: ${err.message}`)
  } finally {
    setLoading(false)
  }
}

    // ✅ Manual refresh function
    const handleRefresh = async () => {
        setRefreshing(true)
        await loadAllUnusedMaterials()
        setRefreshing(false)
    }

    const unusedMaterialsData = useMemo(() => {
  // ✅ FIXED: Since we're now loading directly from database,
  // just return items as-is (already in correct format)
  console.log(`📊 Processing ${items.length} unused materials`)
  return items
}, [items])

    // Filter materials
    const filteredMaterials = useMemo(() => {
        return unusedMaterialsData.filter(mat => {
            const matchesSearch = !searchTerm ||
                mat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mat.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mat.client_name?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesClient = !filterByClient || mat.client_name === filterByClient

            return matchesSearch && matchesClient
        })
    }, [unusedMaterialsData, searchTerm, filterByClient])

    // Get unique clients
    const uniqueClients = useMemo(() => {
        return [...new Set(unusedMaterialsData.map(mat => mat.client_name).filter(Boolean))].sort()
    }, [unusedMaterialsData])

    // Calculate totals by material name
    const materialTotals = useMemo(() => {
        const totals = {}
        filteredMaterials.forEach(mat => {
            if (!totals[mat.name]) {
                totals[mat.name] = {
                    name: mat.name,
                    total_quantity: 0,
                    unit: mat.unit,
                    occurrences: []
                }
            }
            totals[mat.name].total_quantity += parseFloat(mat.quantity) || 0
            totals[mat.name].occurrences.push({
                quantity: mat.quantity,
                item: mat.item_name,
                client: mat.client_name,
                location: `${mat.phase_name} → ${mat.subphase_name}`
            })
        })
        return Object.values(totals).sort((a, b) => b.total_quantity - a.total_quantity)
    }, [filteredMaterials])

    // Group materials by assigned user
    const materialsByUser = useMemo(() => {
        const grouped = {}

        filteredMaterials.forEach(mat => {
            const userName = mat.assigned_user_name || 'Unassigned'
            if (!grouped[userName]) {
                grouped[userName] = {
                    user_name: userName,
                    user_barcode: mat.assigned_user_barcode,
                    user_uid: mat.assigned_user_uid,
                    materials: [],
                    total_items: 0
                }
            }
            grouped[userName].materials.push(mat)
            grouped[userName].total_items++
        })

        return Object.values(grouped).sort((a, b) => b.total_items - a.total_items)
    }, [filteredMaterials])

    // ✅ Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`} />
                    <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Loading unused materials from all items...
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        This may take a moment...
                    </p>
                </div>
            </div>
        )
    }

    // ✅ Error state
    if (error) {
        return (
            <div className={`backdrop-blur-md rounded-lg p-6 border ${
                isDarkMode ? "bg-red-950/50 border-red-800/60" : "bg-red-100/80 border-red-300"
            }`}>
                <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
                    {error}
                </p>
                <button
                    onClick={loadAllUnusedMaterials}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <Archive size={24} />
                        Stock Materials
                    </h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Unused and leftover materials from subphases
                    </p>
                </div>
                
                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isDarkMode
                            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                    } ${refreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    <span className="text-sm font-medium">
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${
                    isDarkMode ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-500/10 border-orange-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Archive size={20} className="text-orange-500" />
                        <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Total Unused Items
                        </span>
                    </div>
                    <p className={`text-3xl font-bold ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>
                        {filteredMaterials.length}
                    </p>
                </div>

                <div className={`p-4 rounded-lg border ${
                    isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={20} className="text-purple-500" />
                        <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Unique Materials
                        </span>
                    </div>
                    <p className={`text-3xl font-bold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
                        {materialTotals.length}
                    </p>
                </div>

                <div className={`p-4 rounded-lg border ${
                    isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-500/10 border-blue-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={20} className="text-blue-500" />
                        <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Items Affected
                        </span>
                    </div>
                    <p className={`text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                        {new Set(filteredMaterials.map(m => m.item_part_number)).size}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className={`backdrop-blur-md rounded-lg p-4 border ${
                isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
            }`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search materials, items, or clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                isDarkMode
                                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                                    : "bg-white border border-gray-300 text-gray-800"
                            }`}
                        />
                    </div>

                    <select
                        value={filterByClient}
                        onChange={(e) => setFilterByClient(e.target.value)}
                        className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            isDarkMode
                                ? "bg-gray-700 border border-gray-600 text-gray-100"
                                : "bg-white border border-gray-300 text-gray-800"
                        }`}
                    >
                        <option value="">All Clients</option>
                        {uniqueClients.map(client => (
                            <option key={client} value={client}>{client}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Materials by Assigned User */}
            {materialsByUser.length > 0 && (
                <div className={`backdrop-blur-md rounded-lg p-4 border ${
                    isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                }`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <User size={20} />
                        Materials by Assigned User
                    </h3>

                    <div className="space-y-3">
                        {materialsByUser.map((userGroup, idx) => (
                            <div key={idx} className={`p-4 rounded-lg border ${
                                isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"
                            }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <User size={18} className="text-blue-500" />
                                        <div>
                                            <p className={`font-semibold ${
                                                isDarkMode ? "text-gray-200" : "text-gray-800"
                                            }`}>
                                                {userGroup.user_name}
                                            </p>
                                            {userGroup.user_barcode && (
                                                <p className={`text-xs ${
                                                    isDarkMode ? "text-gray-400" : "text-gray-600"
                                                }`}>
                                                    ID: {userGroup.user_barcode}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg font-medium ${
                                        isDarkMode
                                            ? "bg-blue-500/20 text-blue-300"
                                            : "bg-blue-500/20 text-blue-700"
                                    }`}>
                                        {userGroup.total_items} items
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {userGroup.materials.map((material, matIdx) => (
                                        <div key={matIdx} className={`p-3 rounded border ${
                                            isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className={`font-medium text-sm ${
                                                        isDarkMode ? "text-gray-200" : "text-gray-800"
                                                    }`}>
                                                        {material.name}
                                                    </p>
                                                    <p className={`text-xs flex items-center gap-1 mt-1 ${
                                                        isDarkMode ? "text-gray-400" : "text-gray-600"
                                                    }`}>
                                                        <MapPin size={10} />
                                                        {material.item_name} • {material.phase_name} → {material.subphase_name}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                                    isDarkMode
                                                        ? "bg-orange-500/20 text-orange-300"
                                                        : "bg-orange-500/20 text-orange-700"
                                                }`}>
                                                    {material.quantity} {material.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Materials Summary */}
            {materialTotals.length > 0 && (
                <div className={`backdrop-blur-md rounded-lg p-4 border ${
                    isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                }`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <Package size={20} />
                        Materials Summary (Grouped by Name)
                    </h3>

                    <div className="space-y-3">
                        {materialTotals.map((material, idx) => (
                            <div key={idx} className={`p-4 rounded-lg border ${
                                isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"
                            }`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h4 className={`font-semibold text-lg ${
                                            isDarkMode ? "text-gray-200" : "text-gray-800"
                                        }`}>
                                            {material.name}
                                        </h4>
                                        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                            Found in {material.occurrences.length} location(s)
                                        </p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg text-right ${
                                        isDarkMode ? "bg-orange-500/20" : "bg-orange-500/20"
                                    }`}>
                                        <p className={`text-2xl font-bold ${
                                            isDarkMode ? "text-orange-400" : "text-orange-600"
                                        }`}>
                                            {material.total_quantity.toFixed(2)}
                                        </p>
                                        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                            {material.unit}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-3">
                                    {material.occurrences.map((occ, occIdx) => (
                                        <div key={occIdx} className={`p-3 rounded border text-sm ${
                                            isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className={`font-medium ${
                                                        isDarkMode ? "text-gray-200" : "text-gray-800"
                                                    }`}>
                                                        {occ.item} {occ.client && `(${occ.client})`}
                                                    </p>
                                                    <p className={`text-xs flex items-center gap-1 mt-1 ${
                                                        isDarkMode ? "text-gray-400" : "text-gray-600"
                                                    }`}>
                                                        <MapPin size={10} />
                                                        {occ.location}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded ${
                                                    isDarkMode
                                                        ? "bg-orange-500/20 text-orange-300"
                                                        : "bg-orange-500/20 text-orange-700"
                                                }`}>
                                                    {occ.quantity} {material.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredMaterials.length === 0 && (
                <div className={`backdrop-blur-md rounded-lg p-8 border text-center ${
                    isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                }`}>
                    <Archive size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className={`text-lg font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        No unused materials found
                    </p>
                    <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {searchTerm || filterByClient
                            ? "Try adjusting your filters"
                            : "Unused materials will appear here when recorded in subphases"}
                    </p>
                </div>
            )}
        </div>
    )
}

export default StockMaterialsTab