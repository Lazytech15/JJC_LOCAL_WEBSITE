import React, { useState, useMemo, useEffect } from "react"
import { Archive, Package, AlertTriangle, FileText, Search, User, Clock, RefreshCw, MapPin, Download, Calendar, Trash2 } from "lucide-react"

function StockMaterialsTab({ isDarkMode, apiService }) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filterByClient, setFilterByClient] = useState("")
    const [checkouts, setCheckouts] = useState([])
    const [returns, setReturns] = useState([])
    const [scraps, setScraps] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    })
    const [activeView, setActiveView] = useState('all') // 'all', 'checkouts', 'returns', 'scraps'

    // Load data on mount
    useEffect(() => {
        loadAllMaterialsData()
    }, [])

    // Set default date range (last 30 days)
    useEffect(() => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        })
    }, [])

    const loadAllMaterialsData = async () => {
        try {
            setLoading(true)
            setError(null)
            console.log('📦 Loading all materials data...')

            // Fetch from all three tables in parallel
            const [checkoutsData, returnsData, scrapsData] = await Promise.all([
                apiService.materials.getMaterials().catch(err => {
                    console.warn('⚠️ Failed to load checkouts:', err)
                    return []
                }),
                apiService.materials.getReturnedMaterials().catch(err => {
                    console.warn('⚠️ Failed to load returns:', err)
                    return []
                }),
                apiService.materials.getScrapMaterials().catch(err => {
                    console.warn('⚠️ Failed to load scraps:', err)
                    return []
                })
            ])

            // Handle different response formats
            const processResponse = (response) => {
                // Handle array response
                if (Array.isArray(response)) {
                    return response
                }
                
                // Handle {success: true, data: [...]}
                if (response?.success && Array.isArray(response.data)) {
                    return response.data
                }
                
                // Handle {success: true, data: [...]} without success flag
                if (response?.data && Array.isArray(response.data)) {
                    return response.data
                }
                
                // Handle {success: true, "0": {...}, "1": {...}} format
                if (response?.success) {
                    const items = []
                    // Extract numeric keys
                    Object.keys(response).forEach(key => {
                        if (!isNaN(key) && key !== 'success' && key !== 'data' && key !== 'count') {
                            items.push(response[key])
                        }
                    })
                    if (items.length > 0) return items
                    
                    // If data is empty array but count is 0, return empty
                    if (response.data && response.count === 0) return []
                }
                
                // Handle direct object with numeric keys {0: {...}, 1: {...}}
                const items = []
                Object.keys(response || {}).forEach(key => {
                    if (!isNaN(key)) {
                        items.push(response[key])
                    }
                })
                if (items.length > 0) return items
                
                return []
            }

            const processedCheckouts = processResponse(checkoutsData)
            const processedReturns = processResponse(returnsData)
            const processedScraps = processResponse(scrapsData)

            console.log('📊 Processed data:', {
                checkouts: processedCheckouts.length,
                returns: processedReturns.length,
                scraps: processedScraps.length
            })
            
            // Log sample data for debugging
            if (processedCheckouts.length > 0) console.log('Sample checkout:', processedCheckouts[0])
            if (processedReturns.length > 0) console.log('Sample return:', processedReturns[0])
            if (processedScraps.length > 0) console.log('Sample scrap:', processedScraps[0])

            console.log(`✅ Loaded: ${processedCheckouts.length} checkouts, ${processedReturns.length} returns, ${processedScraps.length} scraps`)

            setCheckouts(processedCheckouts)
            setReturns(processedReturns)
            setScraps(processedScraps)

        } catch (err) {
            console.error('❌ Failed to load materials data:', err)
            setError(`Failed to load data: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Manual refresh function
    const handleRefresh = async () => {
        setRefreshing(true)
        await loadAllMaterialsData()
        setRefreshing(false)
    }

    // Transform and combine all materials data
    const allMaterialsData = useMemo(() => {
        const combined = []

        // Add checkouts
        checkouts.forEach(mat => {
            // Check if this is a scrap-reuse checkout
            const isScrapReuse = mat.notes && mat.notes.includes('SCRAP-REUSE')
            
            combined.push({
                id: `checkout-${mat.id}`,
                type: isScrapReuse ? 'scrap-reuse' : 'checkout',
                name: mat.material_name,
                quantity: parseFloat(mat.material_quantity) || 0,
                quantity_used: parseFloat(mat.quantity_used) || 0,
                unit: mat.unit_of_measure || 'pcs',
                status: mat.status,
                
                // User info (checked out by)
                user_uid: mat.checked_out_by_uid,
                user_name: mat.checked_out_by_name || 'Unknown',
                user_barcode: mat.checked_out_by,
                
                date: mat.created_at || mat.checkout_date,
                notes: mat.notes,
                is_scrap_reuse: isScrapReuse,
                
                // Location
                item_name: mat.item_name || 'Unknown',
                item_part_number: mat.item_part_number || mat.part_number,
                client_name: mat.client_name || 'Unknown',
                phase_name: mat.phase_name || 'Unknown',
                subphase_name: mat.subphase_name || 'Unknown',
                subphase_id: mat.subphase_id
            })
        })

        // Add returns
        returns.forEach(mat => {
            combined.push({
                id: `return-${mat.id}`,
                type: 'return',
                name: mat.material_name,
                quantity: parseFloat(mat.quantity_returned) || 0,
                unit: mat.unit_of_measure || 'pcs',
                condition: mat.condition_status,
                is_reusable: mat.is_reusable,
                return_reason: mat.return_reason,
                
                // User info (returned by)
                user_uid: mat.returned_by_uid,
                user_name: mat.returned_by_name || 'Unknown',
                user_barcode: mat.returned_by,
                
                date: mat.created_at || mat.return_date,
                notes: mat.notes,
                storage_location: mat.storage_location,
                
                // Location
                item_name: mat.item_name || 'Unknown',
                item_part_number: mat.item_part_number,
                client_name: mat.client_name || 'Unknown',
                phase_name: mat.phase_name || 'Unknown',
                subphase_name: mat.subphase_name || 'Unknown',
                subphase_id: mat.subphase_id,
                
                // Link to original
                original_material_id: mat.original_material_id
            })
        })

        // Add scraps
        scraps.forEach(mat => {
            combined.push({
                id: `scrap-${mat.id}`,
                type: 'scrap',
                name: mat.material_name,
                quantity: parseFloat(mat.quantity_scrapped) || 0,
                unit: mat.unit_of_measure || 'pcs',
                scrap_type: mat.scrap_type,
                scrap_reason: mat.scrap_reason,
                is_recyclable: mat.is_recyclable,
                disposal_method: mat.disposal_method,
                
                // User info (scrapped by)
                user_uid: mat.scrapped_by_uid,
                user_name: mat.scrapped_by_name || 'Unknown',
                user_barcode: mat.scrapped_by,
                
                date: mat.created_at || mat.scrap_date,
                notes: mat.notes,
                
                // Location
                item_name: mat.item_name || 'Unknown',
                item_part_number: mat.item_part_number,
                client_name: mat.client_name || 'Unknown',
                phase_name: mat.phase_name || 'Unknown',
                subphase_name: mat.subphase_name || 'Unknown',
                subphase_id: mat.subphase_id,
                
                // Link to original
                original_material_id: mat.original_material_id
            })
        })

        console.log(`🔄 Combined ${combined.length} materials: ${checkouts.length} checkouts (${checkouts.filter(c => c.notes?.includes('SCRAP-REUSE')).length} scrap-reuse) + ${returns.length} returns + ${scraps.length} scraps`)
        return combined
    }, [checkouts, returns, scraps])

    // Filter by date range and search
    const filteredMaterials = useMemo(() => {
        return allMaterialsData.filter(mat => {
            // Date filter
            if (dateRange.start || dateRange.end) {
                const matDate = new Date(mat.date)
                if (dateRange.start && matDate < new Date(dateRange.start)) return false
                if (dateRange.end) {
                    const endDate = new Date(dateRange.end)
                    endDate.setHours(23, 59, 59, 999)
                    if (matDate > endDate) return false
                }
            }

            // View filter
            if (activeView !== 'all') {
                if (activeView === 'checkouts' && mat.type !== 'checkout' && mat.type !== 'scrap-reuse') return false
                if (activeView === 'returns' && mat.type !== 'return') return false
                if (activeView === 'scraps' && mat.type !== 'scrap' && mat.type !== 'scrap-reuse') return false
            }

            // Search filter
            const matchesSearch = !searchTerm ||
                mat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mat.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mat.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mat.user_name?.toLowerCase().includes(searchTerm.toLowerCase())

            // Client filter
            const matchesClient = !filterByClient || mat.client_name === filterByClient

            return matchesSearch && matchesClient
        })
    }, [allMaterialsData, searchTerm, filterByClient, dateRange, activeView])

    // Get unique clients
    const uniqueClients = useMemo(() => {
        return [...new Set(allMaterialsData.map(mat => mat.client_name).filter(Boolean))].sort()
    }, [allMaterialsData])

    // Group materials by user
    const materialsByUser = useMemo(() => {
        const grouped = {}

        filteredMaterials.forEach(mat => {
            const userName = mat.user_name || 'Unassigned'
            if (!grouped[userName]) {
                grouped[userName] = {
                    user_name: userName,
                    user_barcode: mat.user_barcode,
                    user_uid: mat.user_uid,
                    checkouts: [],
                    scrapReuse: [],
                    returns: [],
                    scraps: [],
                    total_items: 0
                }
            }
            
            if (mat.type === 'checkout') grouped[userName].checkouts.push(mat)
            if (mat.type === 'scrap-reuse') grouped[userName].scrapReuse.push(mat)
            if (mat.type === 'return') grouped[userName].returns.push(mat)
            if (mat.type === 'scrap') grouped[userName].scraps.push(mat)
            grouped[userName].total_items++
        })

        return Object.values(grouped).sort((a, b) => b.total_items - a.total_items)
    }, [filteredMaterials])

    // Calculate totals by material name
    const materialTotals = useMemo(() => {
        const totals = {}
        
        filteredMaterials.forEach(mat => {
            if (!totals[mat.name]) {
                totals[mat.name] = {
                    name: mat.name,
                    checkouts: 0,
                    scrapReuse: 0,
                    returns: 0,
                    scraps: 0,
                    unit: mat.unit,
                    occurrences: []
                }
            }
            
            if (mat.type === 'checkout') totals[mat.name].checkouts += mat.quantity
            if (mat.type === 'scrap-reuse') totals[mat.name].scrapReuse += mat.quantity
            if (mat.type === 'return') totals[mat.name].returns += mat.quantity
            if (mat.type === 'scrap') totals[mat.name].scraps += mat.quantity
            
            totals[mat.name].occurrences.push({
                type: mat.type,
                quantity: mat.quantity,
                item: mat.item_name,
                client: mat.client_name,
                location: `${mat.phase_name} → ${mat.subphase_name}`,
                user: mat.user_name,
                date: mat.date
            })
        })
        
        return Object.values(totals).sort((a, b) => 
            (b.checkouts + b.scrapReuse + b.returns + b.scraps) - (a.checkouts + a.scrapReuse + a.returns + a.scraps)
        )
    }, [filteredMaterials])

    // Export to CSV
    const exportToCSV = () => {
        const headers = [
            'Type', 'Material Name', 'Quantity', 'Unit', 'Status/Condition',
            'User Name', 'User ID', 'Date', 'Client', 'Item', 'Phase', 'Subphase',
            'Notes', 'Reason'
        ]

        const rows = filteredMaterials.map(mat => [
            mat.type.toUpperCase(),
            mat.name,
            mat.quantity,
            mat.unit,
            mat.type === 'checkout' ? mat.status : mat.type === 'return' ? mat.condition : mat.scrap_type,
            mat.user_name,
            mat.user_barcode || '',
            new Date(mat.date).toLocaleString(),
            mat.client_name || '',
            mat.item_name || '',
            mat.phase_name || '',
            mat.subphase_name || '',
            mat.notes || '',
            mat.type === 'return' ? mat.return_reason || '' : mat.type === 'scrap' ? mat.scrap_reason || '' : ''
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `materials_report_${dateRange.start}_to_${dateRange.end}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    // Export to Excel-compatible CSV (with proper encoding)
    const exportToExcel = () => {
        const headers = [
            'Type', 'Material Name', 'Quantity', 'Unit', 'Status/Condition',
            'User Name', 'User ID', 'Date', 'Client', 'Item', 'Phase', 'Subphase',
            'Notes', 'Reason', 'Reusable/Recyclable', 'Storage Location'
        ]

        const rows = filteredMaterials.map(mat => [
            mat.type.toUpperCase(),
            mat.name,
            mat.quantity,
            mat.unit,
            mat.type === 'checkout' ? mat.status : mat.type === 'return' ? mat.condition : mat.scrap_type,
            mat.user_name,
            mat.user_barcode || '',
            new Date(mat.date).toLocaleString(),
            mat.client_name || '',
            mat.item_name || '',
            mat.phase_name || '',
            mat.subphase_name || '',
            mat.notes || '',
            mat.type === 'return' ? mat.return_reason || '' : mat.type === 'scrap' ? mat.scrap_reason || '' : '',
            mat.type === 'return' ? (mat.is_reusable ? 'Yes' : 'No') : mat.type === 'scrap' ? (mat.is_recyclable ? 'Yes' : 'No') : '',
            mat.type === 'return' ? mat.storage_location || '' : ''
        ])

        // Add BOM for Excel UTF-8 recognition
        const BOM = '\uFEFF'
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `materials_report_${dateRange.start}_to_${dateRange.end}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`} />
                    <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Loading materials data...
                    </p>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className={`backdrop-blur-md rounded-lg p-6 border ${
                isDarkMode ? "bg-red-950/50 border-red-800/60" : "bg-red-100/80 border-red-300"
            }`}>
                <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
                    {error}
                </p>
                <button
                    onClick={loadAllMaterialsData}
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
            <div className="flex flex-col gap-3">
                <div>
                    <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <Archive size={20} className="sm:w-6 sm:h-6" />
                        Stock Materials
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Material checkouts, returns, and scraps tracking
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {/* Export Buttons */}
                    <button
                        onClick={exportToExcel}
                        disabled={filteredMaterials.length === 0}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                            filteredMaterials.length === 0
                                ? "opacity-50 cursor-not-allowed bg-gray-500"
                                : isDarkMode
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                    >
                        <Download size={14} className="sm:w-4 sm:h-4" />
                        <span className="font-medium">Excel</span>
                    </button>

                    <button
                        onClick={exportToCSV}
                        disabled={filteredMaterials.length === 0}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                            filteredMaterials.length === 0
                                ? "opacity-50 cursor-not-allowed bg-gray-500"
                                : isDarkMode
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                    >
                        <Download size={14} className="sm:w-4 sm:h-4" />
                        <span className="font-medium">CSV</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                            isDarkMode
                                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                        } ${refreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <RefreshCw size={14} className={`sm:w-4 sm:h-4 ${refreshing ? "animate-spin" : ""}`} />
                        <span className="font-medium">
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </span>
                    </button>
                </div>
            </div>

            {/* View Tabs */}
            <div className={`flex gap-1 sm:gap-2 p-2 rounded-lg border overflow-x-auto ${
                isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
            }`}>
                {['all', 'checkouts', 'returns', 'scraps'].map(view => {
                    const counts = {
                        all: filteredMaterials.length,
                        checkouts: filteredMaterials.filter(m => m.type === 'checkout' || m.type === 'scrap-reuse').length,
                        returns: filteredMaterials.filter(m => m.type === 'return').length,
                        scraps: filteredMaterials.filter(m => m.type === 'scrap').length
                    }
                    
                    return (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`flex-1 min-w-[80px] px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                activeView === view
                                    ? isDarkMode
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-500 text-white"
                                    : isDarkMode
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            <span className="hidden sm:inline">{view === 'all' ? 'All Materials' : view.charAt(0).toUpperCase() + view.slice(1)}</span>
                            <span className="sm:hidden">{view === 'all' ? 'All' : view.charAt(0).toUpperCase() + view.slice(1, 4)}</span>
                            <span className="ml-1 sm:ml-2 opacity-75">({counts[view]})</span>
                        </button>
                    )
                })}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className={`p-3 sm:p-4 rounded-lg border ${
                    isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-500/10 border-blue-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={16} className="sm:w-5 sm:h-5 text-blue-500" />
                        <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Checkouts
                        </span>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                        {filteredMaterials.filter(m => m.type === 'checkout' || m.type === 'scrap-reuse').length}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {filteredMaterials.filter(m => m.type === 'scrap-reuse').length} from scrap reuse
                    </p>
                </div>

                <div className={`p-3 sm:p-4 rounded-lg border ${
                    isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-500/10 border-green-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCw size={16} className="sm:w-5 sm:h-5 text-green-500" />
                        <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Returns
                        </span>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                        {filteredMaterials.filter(m => m.type === 'return').length}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Unused materials returned
                    </p>
                </div>

                <div className={`p-3 sm:p-4 rounded-lg border ${
                    isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-500/10 border-red-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Trash2 size={16} className="sm:w-5 sm:h-5 text-red-500" />
                        <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Scraps
                        </span>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                        {filteredMaterials.filter(m => m.type === 'scrap').length}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Processed materials (can be reused)
                    </p>
                </div>

                <div className={`p-3 sm:p-4 rounded-lg border ${
                    isDarkMode ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-500/10 border-purple-500/30"
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="sm:w-5 sm:h-5 text-purple-500" />
                        <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Users
                        </span>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
                        {materialsByUser.length}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Active users
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border ${
                isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
            }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative sm:col-span-2 lg:col-span-1">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search materials, users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode
                                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                                    : "bg-white border border-gray-300 text-gray-800"
                            }`}
                        />
                    </div>

                    {/* Client Filter */}
                    <select
                        value={filterByClient}
                        onChange={(e) => setFilterByClient(e.target.value)}
                        className={`px-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

                    {/* Date Range Start */}
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode
                                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                                    : "bg-white border border-gray-300 text-gray-800"
                            }`}
                        />
                    </div>

                    {/* Date Range End */}
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode
                                    ? "bg-gray-700 border border-gray-600 text-gray-100"
                                    : "bg-white border border-gray-300 text-gray-800"
                            }`}
                        />
                    </div>
                </div>
            </div>

            {/* Materials by User */}
            {materialsByUser.length > 0 && (
                <div className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border ${
                    isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                }`}>
                    <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <User size={18} className="sm:w-5 sm:h-5" />
                        Materials by User
                    </h3>

                    <div className="space-y-3">
                        {materialsByUser.map((userGroup, idx) => (
                            <div key={idx} className={`p-3 sm:p-4 rounded-lg border ${
                                isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-blue-500 flex-shrink-0" />
                                        <div>
                                            <p className={`font-semibold text-sm ${
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
                                    <div className="flex flex-wrap gap-1 sm:gap-2">
                                        {userGroup.checkouts.length > 0 && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-600">
                                                {userGroup.checkouts.length} checkout{userGroup.checkouts.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {userGroup.scrapReuse.length > 0 && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-600">
                                                {userGroup.scrapReuse.length} reuse
                                            </span>
                                        )}
                                        {userGroup.returns.length > 0 && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-600">
                                                {userGroup.returns.length} return{userGroup.returns.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {userGroup.scraps.length > 0 && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-600">
                                                {userGroup.scraps.length} scrap{userGroup.scraps.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                    {/* Show all materials for this user */}
                                <div className="space-y-2">
                                    {[...userGroup.checkouts, ...userGroup.scrapReuse, ...userGroup.returns, ...userGroup.scraps].map((material, matIdx) => {
                                        // Determine colors based on type
                                        const typeColors = {
                                            checkout: {
                                                bg: isDarkMode ? "bg-blue-900/30 border-blue-700" : "bg-blue-100 border-blue-300",
                                                badge: "bg-blue-500/30 text-blue-600 border border-blue-500/50",
                                                quantity: isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-500/20 text-blue-700"
                                            },
                                            'scrap-reuse': {
                                                bg: isDarkMode ? "bg-orange-900/30 border-orange-700" : "bg-orange-100 border-orange-300",
                                                badge: "bg-orange-500/30 text-orange-600 border border-orange-500/50",
                                                quantity: isDarkMode ? "bg-orange-500/20 text-orange-300" : "bg-orange-500/20 text-orange-700"
                                            },
                                            return: {
                                                bg: isDarkMode ? "bg-green-900/30 border-green-700" : "bg-green-100 border-green-300",
                                                badge: "bg-green-500/30 text-green-600 border border-green-500/50",
                                                quantity: isDarkMode ? "bg-green-500/20 text-green-300" : "bg-green-500/20 text-green-700"
                                            },
                                            scrap: {
                                                bg: isDarkMode ? "bg-red-900/30 border-red-700" : "bg-red-100 border-red-300",
                                                badge: "bg-red-500/30 text-red-600 border border-red-500/50",
                                                quantity: isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-500/20 text-red-700"
                                            }
                                        }
                                        const colors = typeColors[material.type] || typeColors.checkout
                                        
                                        return (
                                            <div key={matIdx} className={`p-2 sm:p-3 rounded border ${colors.bg}`}>
                                                <div className="flex items-start sm:items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                            <p className={`font-medium text-xs sm:text-sm truncate ${
                                                                isDarkMode ? "text-gray-200" : "text-gray-800"
                                                            }`}>
                                                                {material.name}
                                                            </p>
                                                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium uppercase ${colors.badge} whitespace-nowrap`}>
                                                                {material.type === 'scrap-reuse' ? '♻️ REUSE' : material.type}
                                                            </span>
                                                        </div>
                                                        <p className={`text-xs flex items-center gap-1 mt-1 ${
                                                            isDarkMode ? "text-gray-400" : "text-gray-600"
                                                        }`}>
                                                            <MapPin size={10} className="flex-shrink-0" />
                                                            <span className="truncate">{material.item_name}</span>
                                                        </p>
                                                        <p className={`text-xs mt-1 ${
                                                            isDarkMode ? "text-gray-500" : "text-gray-500"
                                                        }`}>
                                                            {new Date(material.date).toLocaleString()}
                                                        </p>
                                                        {material.type === 'scrap' && material.scrap_reason && (
                                                            <p className={`text-xs mt-1 italic line-clamp-1 ${
                                                                isDarkMode ? "text-red-400" : "text-red-600"
                                                            }`}>
                                                                {material.scrap_reason}
                                                            </p>
                                                        )}
                                                        {material.type === 'return' && material.return_reason && (
                                                            <p className={`text-xs mt-1 italic line-clamp-1 ${
                                                                isDarkMode ? "text-green-400" : "text-green-600"
                                                            }`}>
                                                                {material.return_reason}
                                                            </p>
                                                        )}
                                                        {material.type === 'scrap-reuse' && (
                                                            <p className={`text-xs mt-1 italic ${
                                                                isDarkMode ? "text-orange-400" : "text-orange-600"
                                                            }`}>
                                                                ♻️ No warehouse deduction
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${colors.quantity}`}>
                                                        {material.quantity} {material.unit}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Materials Summary */}
            {materialTotals.length > 0 && (
                <div className={`backdrop-blur-md rounded-lg p-3 sm:p-4 border ${
                    isDarkMode ? "bg-gray-800/60 border-gray-700/50" : "bg-white/30 border-white/40"
                }`}>
                    <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}>
                        <Package size={18} className="sm:w-5 sm:h-5" />
                        Materials Summary
                    </h3>

                    <div className="space-y-3">
                        {materialTotals.map((material, idx) => (
                            <div key={idx} className={`p-3 sm:p-4 rounded-lg border ${
                                isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-300"
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold text-base sm:text-lg truncate ${
                                            isDarkMode ? "text-gray-200" : "text-gray-800"
                                        }`}>
                                            {material.name}
                                        </h4>
                                        <p className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                            {material.occurrences.length} transaction{material.occurrences.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {material.checkouts > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className={`text-base sm:text-lg font-bold text-blue-600`}>
                                                    {material.checkouts.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">Checked Out</p>
                                            </div>
                                        )}
                                        {material.scrapReuse > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className={`text-base sm:text-lg font-bold text-orange-600`}>
                                                    {material.scrapReuse.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">♻️ Reuse</p>
                                            </div>
                                        )}
                                        {material.returns > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className={`text-base sm:text-lg font-bold text-green-600`}>
                                                    {material.returns.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">Returned</p>
                                            </div>
                                        )}
                                        {material.scraps > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className={`text-base sm:text-lg font-bold text-red-600`}>
                                                    {material.scraps.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">Scrapped</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-3">
                                    {material.occurrences.map((occ, occIdx) => {
                                        // Determine colors based on type
                                        const typeColors = {
                                            checkout: {
                                                bg: isDarkMode ? "bg-blue-900/30 border-blue-700" : "bg-blue-100 border-blue-300",
                                                badge: "bg-blue-500/30 text-blue-600 border border-blue-500/50",
                                                quantity: "bg-blue-500/30 text-blue-700 font-semibold"
                                            },
                                            'scrap-reuse': {
                                                bg: isDarkMode ? "bg-orange-900/30 border-orange-700" : "bg-orange-100 border-orange-300",
                                                badge: "bg-orange-500/30 text-orange-600 border border-orange-500/50",
                                                quantity: "bg-orange-500/30 text-orange-700 font-semibold"
                                            },
                                            return: {
                                                bg: isDarkMode ? "bg-green-900/30 border-green-700" : "bg-green-100 border-green-300",
                                                badge: "bg-green-500/30 text-green-600 border border-green-500/50",
                                                quantity: "bg-green-500/30 text-green-700 font-semibold"
                                            },
                                            scrap: {
                                                bg: isDarkMode ? "bg-red-900/30 border-red-700" : "bg-red-100 border-red-300",
                                                badge: "bg-red-500/30 text-red-600 border border-red-500/50",
                                                quantity: "bg-red-500/30 text-red-700 font-semibold"
                                            }
                                        }
                                        const colors = typeColors[occ.type] || typeColors.checkout
                                        
                                        return (
                                            <div key={occIdx} className={`p-2 sm:p-3 rounded border text-xs sm:text-sm ${colors.bg}`}>
                                                <div className="flex items-start sm:items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium uppercase ${colors.badge} whitespace-nowrap`}>
                                                                {occ.type === 'scrap-reuse' ? '♻️ REUSE' : occ.type}
                                                            </span>
                                                            <p className={`font-medium truncate ${
                                                                isDarkMode ? "text-gray-200" : "text-gray-800"
                                                            }`}>
                                                                {occ.item} {occ.client && `(${occ.client})`}
                                                            </p>
                                                        </div>
                                                        <p className={`text-xs flex items-center gap-1 mt-1 ${
                                                            isDarkMode ? "text-gray-400" : "text-gray-600"
                                                        }`}>
                                                            <MapPin size={10} className="flex-shrink-0" />
                                                            <span className="truncate">{occ.location}</span>
                                                        </p>
                                                        <p className={`text-xs flex items-center gap-1 mt-1 ${
                                                            isDarkMode ? "text-gray-400" : "text-gray-600"
                                                        }`}>
                                                            <User size={10} className="flex-shrink-0" />
                                                            <span className="truncate">{occ.user} • {new Date(occ.date).toLocaleDateString()}</span>
                                                        </p>
                                                    </div>
                                                    <span className={`px-2 sm:px-3 py-1 rounded whitespace-nowrap text-xs sm:text-sm ${colors.quantity}`}>
                                                        {occ.quantity} {material.unit}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
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
                        No materials found
                    </p>
                    <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {searchTerm || filterByClient || dateRange.start || dateRange.end
                            ? "Try adjusting your filters or date range"
                            : "Material transactions will appear here"}
                    </p>
                </div>
            )}
        </div>
    )
}

export default StockMaterialsTab