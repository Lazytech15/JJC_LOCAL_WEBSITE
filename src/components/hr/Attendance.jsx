//client attendance.jsx
import { useState, useEffect } from "react"
import { useAuth } from "../../App"
import apiService from "../../utils/api/api-service"

function Attendance() {
  const { user } = useAuth()
  const [attendanceData, setAttendanceData] = useState([])
  const [profilePictures, setProfilePictures] = useState({})
  const [stats, setStats] = useState({
    total_records: 0,
    unique_employees: 0,
    total_regular_hours: 0,
    total_overtime_hours: 0,
    late_count: 0,
    clock_ins: 0,
    clock_outs: 0,
    unsynced_count: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_uid: '',
    clock_type: '',
    limit: 20,
    offset: 0
  })
  const [newRecordIds, setNewRecordIds] = useState(new Set())

  // Load profile picture for an employee UID
  const loadProfilePicture = async (uid) => {
    if (!uid || profilePictures[uid]) return // Skip if already loaded or no UID

    try {
      const result = await apiService.profiles.getProfileByUid(uid)
      if (result.success) {
        setProfilePictures(prev => ({
          ...prev,
          [uid]: result.url
        }))
      } else {
        // Mark as no profile available
        setProfilePictures(prev => ({
          ...prev,
          [uid]: null
        }))
      }
    } catch (error) {
      console.error(`Failed to load profile for ${uid}:`, error)
      setProfilePictures(prev => ({
        ...prev,
        [uid]: null
      }))
    }
  }

  // Load profile pictures for all attendance records
  const loadProfilePictures = async (records) => {
    const uniqueUids = [...new Set(records.map(record => record.employee_uid).filter(Boolean))]
    
    for (const uid of uniqueUids) {
      if (!profilePictures[uid] && profilePictures[uid] !== null) {
        await loadProfilePicture(uid)
      }
    }
  }

  useEffect(() => {
    fetchAttendanceData()
    fetchAttendanceStats()

    setConnectionStatus('connecting')

    const unsubscribeAttendanceCreated = apiService.socket.subscribeToUpdates("attendance_created", (data) => {
      console.log("[Attendance] New attendance record:", data)
      setConnectionStatus('connected')
      setLastUpdate(new Date())
      
      if (!filters.date || data.date === filters.date) {
        setAttendanceData(prev => {
          const exists = prev.some(record => record.id === data.id)
          if (!exists) {
            setNewRecordIds(prev => new Set([...prev, data.id]))
            setTimeout(() => {
              setNewRecordIds(prev => {
                const updated = new Set(prev)
                updated.delete(data.id)
                return updated
              })
            }, 5000)
            
            // Load profile picture for new record
            if (data.employee_uid) {
              loadProfilePicture(data.employee_uid)
            }
            
            return [data, ...prev.slice(0, filters.limit - 1)]
          }
          return prev
        })
      }
      fetchAttendanceStats()
    })

    const unsubscribeAttendanceUpdated = apiService.socket.subscribeToUpdates("attendance_updated", (data) => {
      console.log("[Attendance] Attendance record updated:", data)
      setConnectionStatus('connected')
      setLastUpdate(new Date())
      
      setAttendanceData(prev => 
        prev.map(record => 
          record.id === data.id ? { ...record, ...data } : record
        )
      )
      fetchAttendanceStats()
    })

    const unsubscribeAttendanceDeleted = apiService.socket.subscribeToUpdates("attendance_deleted", (data) => {
      console.log("[Attendance] Attendance record deleted:", data)
      setConnectionStatus('connected')
      setLastUpdate(new Date())
      
      setAttendanceData(prev => 
        prev.filter(record => record.id !== data.id)
      )
      fetchAttendanceStats()
    })

    const unsubscribeAttendanceSynced = apiService.socket.subscribeToUpdates("attendance_synced", (data) => {
      console.log("[Attendance] Attendance records synced:", data)
      setConnectionStatus('connected')
      setLastUpdate(new Date())
      
      fetchAttendanceData()
      fetchAttendanceStats()
    })

    const unsubscribeEmployeeUpdated = apiService.socket.subscribeToUpdates("employee_updated", (data) => {
      console.log("[Attendance] Employee updated, refreshing attendance data")
      setConnectionStatus('connected')
      setLastUpdate(new Date())
      
      fetchAttendanceData()
    })

    setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setConnectionStatus('connected')
      }
    }, 2000)

    return () => {
      unsubscribeAttendanceCreated()
      unsubscribeAttendanceUpdated()
      unsubscribeAttendanceDeleted()
      unsubscribeAttendanceSynced()
      unsubscribeEmployeeUpdated()
      setConnectionStatus('disconnected')
      
      // Clean up profile picture URLs to prevent memory leaks
      Object.values(profilePictures).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [filters])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const params = {
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
        sort_by: 'clock_time',
        sort_order: 'DESC'
      }

      if (filters.employee_uid) params.employee_uid = filters.employee_uid
      if (filters.clock_type) params.clock_type = filters.clock_type
      if (filters.date) params.date = filters.date

      const result = await apiService.attendance.getAttendanceRecords(params)

      if (result.success) {
        setAttendanceData(result.data)
        setError(null)
        
        // Load profile pictures for the fetched records
        await loadProfilePictures(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch attendance data')
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching attendance data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      const result = await apiService.attendance.getAttendanceStats({ date: filters.date })

      if (result.success) {
        setStats(result.data.statistics)
        setRecentActivity(result.data.recent_activity || [])
        
        // Load profile pictures for recent activity
        if (result.data.recent_activity) {
          await loadProfilePictures(result.data.recent_activity)
        }
      } else {
        throw new Error(result.error || 'Failed to fetch attendance statistics')
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err)
    }
  }

  const formatClockType = (clockType) => {
    const types = {
      'morning_in': 'Morning In',
      'morning_out': 'Morning Out', 
      'afternoon_in': 'Afternoon In',
      'afternoon_out': 'Afternoon Out',
      'overtime_in': 'Overtime In',
      'overtime_out': 'Overtime Out'
    }
    return types[clockType] || clockType
  }

  const formatTime = (timeString) => {
    if (!timeString) return '-'
    try {
      const time = new Date(timeString)
      return time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return timeString
    }
  }

  const formatEmployeeName = (record) => {
    const parts = [record.first_name, record.middle_name, record.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Unknown Employee'
  }

  const getClockTypeColor = (clockType) => {
    const colors = {
      'morning_in': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30',
      'morning_out': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/30',
      'afternoon_in': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30',
      'afternoon_out': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/30',
      'overtime_in': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30',
      'overtime_out': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/30'
    }
    return colors[clockType] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }

  const getClockTypeIcon = (clockType) => {
    const icons = {
      'morning_in': '🌅',
      'morning_out': '☕',
      'afternoon_in': '🌞',
      'afternoon_out': '🌆',
      'overtime_in': '🌙',
      'overtime_out': '⭐'
    }
    return icons[clockType] || '⏰'
  }

  // Profile Picture Component
  const ProfilePicture = ({ uid, name, size = 'w-16 h-16' }) => {
    const profileUrl = profilePictures[uid]
    // const isLoading = profileLoadingStates[uid]
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'
    
    // Handle image loading errors
    const handleImageError = (e) => {
      console.warn(`Failed to load image for ${uid}:`, profileUrl)
      // Hide the broken image and show initials fallback
      e.target.style.display = 'none'
      const fallback = e.target.nextSibling
      if (fallback) {
        fallback.style.display = 'flex'
      }
      
      // Clean up the broken blob URL and mark as failed
      if (profileUrl && typeof profileUrl === 'string' && profileUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(profileUrl)
        } catch (error) {
          console.warn('Failed to revoke broken blob URL:', error)
        }
      }
      
      setProfilePictures(prev => ({
        ...prev,
        [uid]: null
      }))
    }
    
    // Only render image if we have a valid URL
    if (profileUrl && profileUrl !== 'undefined' && profileUrl !== null) {
      return (
        <div className="relative">
          <img
            src={profileUrl}
            alt={`${name} profile`}
            className={`${size} rounded-2xl object-cover ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}
            onError={handleImageError}
            onLoad={(e) => {
              // Image loaded successfully, ensure fallback is hidden
              const fallback = e.target.nextSibling
              if (fallback) {
                fallback.style.display = 'none'
              }
            }}
          />
          <div className={`${size} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`} style={{display: 'none'}}>
            {initials}
          </div>
        </div>
      )
    }
    
    // Default fallback to initials
    return (
      <div className={`${size} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/50 dark:ring-gray-700/50 shadow-lg`}>
        {initials}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Attendance Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">Track employee attendance and working hours in real-time</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-700/30">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' :
            connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50' :
            'bg-red-500 shadow-lg shadow-red-500/50'
          }`}></div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {connectionStatus === 'connected' ? 'Live Updates' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && attendanceData.length === 0 && (
        <div className="text-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-slate-600 dark:border-t-slate-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-lg">Loading attendance data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold">Error Loading Data</h3>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button onClick={fetchAttendanceData} className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-slate-700/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{stats.total_records || 0}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Records</p>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-500 text-sm">Today ({filters.date})</p>
          </div>

          <div className="group bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 dark:from-emerald-900/20 dark:to-emerald-800/20 backdrop-blur-xl rounded-3xl p-6 border border-emerald-200/40 dark:border-emerald-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.unique_employees || 0}</p>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Active Employees</p>
              </div>
            </div>
            <p className="text-emerald-500 dark:text-emerald-500 text-sm">Clocked in today</p>
          </div>

          <div className="group bg-gradient-to-br from-orange-50/80 to-orange-100/60 dark:from-orange-900/20 dark:to-orange-800/20 backdrop-blur-xl rounded-3xl p-6 border border-orange-200/40 dark:border-orange-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{(stats.total_regular_hours || 0).toFixed(1)}h</p>
                <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">Regular Hours</p>
              </div>
            </div>
            <p className="text-orange-500 dark:text-orange-500 text-sm">Total for today</p>
          </div>

          <div className="group bg-gradient-to-br from-red-50/80 to-red-100/60 dark:from-red-900/20 dark:to-red-800/20 backdrop-blur-xl rounded-3xl p-6 border border-red-200/40 dark:border-red-800/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.late_count || 0}</p>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">Late Arrivals</p>
              </div>
            </div>
            <p className="text-red-500 dark:text-red-500 text-sm">Today</p>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200/40 dark:border-blue-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <span className="text-xl">📥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.clock_ins || 0}</p>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Clock Ins</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 dark:from-purple-900/20 dark:to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-200/40 dark:border-purple-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <span className="text-xl">📤</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.clock_outs || 0}</p>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Clock Outs</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 dark:from-yellow-900/20 dark:to-yellow-800/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-200/40 dark:border-yellow-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <span className="text-xl">🌙</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{(stats.total_overtime_hours || 0).toFixed(1)}h</p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Overtime Hours</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <span className="text-xl">🔍</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Clock Type</label>
            <select
              value={filters.clock_type}
              onChange={(e) => setFilters(prev => ({ ...prev, clock_type: e.target.value }))}
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
            >
              <option value="">All Types</option>
              <option value="morning_in">Morning In</option>
              <option value="morning_out">Morning Out</option>
              <option value="afternoon_in">Afternoon In</option>
              <option value="afternoon_out">Afternoon Out</option>
              <option value="overtime_in">Overtime In</option>
              <option value="overtime_out">Overtime Out</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Records per page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="w-full px-4 py-3 bg-white/60 dark:bg-gray-700/60 rounded-xl border border-white/40 dark:border-gray-600/40 text-slate-800 dark:text-slate-200 backdrop-blur-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { fetchAttendanceData(); fetchAttendanceStats(); }}
              className="w-full px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      {!loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Employee Attendance</h2>
          </div>
          
          {attendanceData.length === 0 ? (
            <div className="text-center py-16 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-gray-700/40">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No Records Found</h3>
              <p className="text-slate-500 dark:text-slate-400">No attendance records found for the selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {attendanceData.map((record, index) => {
                const isNewRecord = newRecordIds.has(record.id)
                const employeeName = formatEmployeeName(record)
                
                return (
                  <div
                    key={record.id || index}
                    className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl ${
                      isNewRecord 
                        ? 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-300/60 dark:border-emerald-700/60 shadow-2xl animate-pulse shadow-emerald-500/20'
                        : 'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 border-white/40 dark:border-slate-700/40 hover:shadow-xl backdrop-blur-xl'
                    }`}
                  >
                    {/* New Record Indicator */}
                    {isNewRecord && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full animate-bounce">
                        NEW
                      </div>
                    )}

                    <div className="p-6">
                      {/* Header Section */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="flex-shrink-0">
                          <ProfilePicture 
                            uid={record.employee_uid}
                            name={employeeName}
                            size="w-16 h-16"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
                              {employeeName}
                            </h3>
                            {record.is_late ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Late
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                On Time
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <p><span className="font-medium">ID:</span> {record.id_number || record.employee_uid || 'N/A'}</p>
                            <p><span className="font-medium">Department:</span> {record.department || 'N/A'}</p>
                            <p><span className="font-medium">Position:</span> {record.position || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clock Info Section */}
                      <div className="bg-white/50 dark:bg-slate-700/30 backdrop-blur-sm rounded-2xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {getClockTypeIcon(record.clock_type)}
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border ${getClockTypeColor(record.clock_type)}`}>
                                {formatClockType(record.clock_type)}
                              </span>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {record.date}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                              {formatTime(record.clock_time)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {record.is_synced ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  Synced
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                  Pending
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hours Section */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">⏰</span>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Regular</span>
                          </div>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {(record.regular_hours || 0).toFixed(1)}h
                          </p>
                        </div>
                        
                        <div className="bg-orange-50/50 dark:bg-orange-900/20 backdrop-blur-sm rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🌙</span>
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Overtime</span>
                          </div>
                          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                            {(record.overtime_hours || 0).toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-xl">🔄</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Recent Activity</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentActivity.slice(0, 6).map((activity, index) => {
              const activityName = `${activity.first_name} ${activity.last_name}`
              
              return (
                <div
                  key={index}
                  className="group bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 dark:border-slate-600/40 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <ProfilePicture 
                      uid={activity.employee_uid}
                      name={activityName}
                      size="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {activityName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">
                          {getClockTypeIcon(activity.clock_type)}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatClockType(activity.clock_type)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {formatTime(activity.clock_time)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unsynced Alert */}
      {stats.unsynced_count > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl border border-amber-200/60 dark:border-amber-700/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Attention Required</h3>
              <p className="text-amber-700 dark:text-amber-400">
                There are <span className="font-bold">{stats.unsynced_count}</span> unsynced attendance records that need attention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Attendance