import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, Badge, Button } from "../../ui/UiComponents"
import { Loader2, AlertCircle, Check, ChevronDown, ChevronUp, Download, FileText, Trash2, CheckSquare, Square, XSquare, Filter, ArrowUpDown, Search, X, Archive, ArchiveRestore, Inbox, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import apiService from "../../../utils/api/api-service"
import { getStoredToken, verifyToken } from "../../../utils/auth"

// Constants moved outside component to avoid recreation on every render
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]
const AUTO_ARCHIVE_DAYS = 7
const IS_DEV = import.meta.env.DEV
const MAX_VISIBLE_PAGES = 5

// Extracted pagination component for better maintainability
function PaginationControls({ 
  currentPage, 
  totalPages, 
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  setItemsPerPage,
  goToPage, 
  goToFirstPage,
  goToLastPage,
  goToPrevPage,
  goToNextPage,
  isDarkMode 
}) {
  // Generate page numbers with ellipsis
  const renderPageNumbers = () => {
    const pages = []
    let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2))
    let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1)
    
    if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
      startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1)
    }

    const buttonClass = (isActive) => `min-w-[28px] sm:min-w-[36px] h-7 sm:h-9 px-1.5 sm:px-2 text-xs sm:text-sm rounded-lg transition-colors font-medium ${
      isActive
        ? "bg-amber-500 text-white"
        : isDarkMode 
          ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" 
          : "hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900"
    }`

    const dotsClass = `px-0.5 sm:px-1 text-xs sm:text-sm ${isDarkMode ? "text-zinc-600" : "text-zinc-400"}`

    // First page + dots if needed
    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => goToPage(1)} className={buttonClass(false)}>
          1
        </button>
      )
      if (startPage > 2) {
        pages.push(<span key="dots1" className={dotsClass}>...</span>)
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} onClick={() => goToPage(i)} className={buttonClass(currentPage === i)}>
          {i}
        </button>
      )
    }

    // Last page + dots if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="dots2" className={dotsClass}>...</span>)
      }
      pages.push(
        <button key={totalPages} onClick={() => goToPage(totalPages)} className={buttonClass(false)}>
          {totalPages}
        </button>
      )
    }

    return pages
  }

  const navButtonClass = `p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    isDarkMode 
      ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" 
      : "hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900"
  }`

  return (
    <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Mobile: Stack everything, Desktop: Row layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Items per page selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <span className={`text-xs sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg border cursor-pointer transition-colors ${
                isDarkMode 
                  ? "bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600" 
                  : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
              }`}
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <span className={`text-xs sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>per page</span>
          </div>

          {/* Page info */}
          <div className={`text-xs sm:text-sm text-center ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            {startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems}
          </div>
        </div>

        {/* Page navigation - always at bottom on mobile */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
          <button onClick={goToFirstPage} disabled={currentPage === 1} className={navButtonClass} title="First page">
            <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button onClick={goToPrevPage} disabled={currentPage === 1} className={navButtonClass} title="Previous page">
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="flex items-center gap-0.5 sm:gap-1 mx-1 sm:mx-2">
            {renderPageNumbers()}
          </div>

          <button onClick={goToNextPage} disabled={currentPage === totalPages} className={navButtonClass} title="Next page">
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button onClick={goToLastPage} disabled={currentPage === totalPages} className={navButtonClass} title="Last page">
            <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Announcements({ isDarkMode }) {
  const [announcements, setAnnouncements] = useState([])
  const [archivedAnnouncements, setArchivedAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [markingAsRead, setMarkingAsRead] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [archivingIds, setArchivingIds] = useState(new Set())
  const [viewMode, setViewMode] = useState("active") // active, archived
  
  // Sort and Filter states
  const [sortBy, setSortBy] = useState("newest") // newest, oldest, priority
  const [filterBy, setFilterBy] = useState("all") // all, unread, read, urgent, important
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const fetchAnnouncementsData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get employee ID from token
        const token = getStoredToken()
        if (!token) {
          setError("Authentication required")
          setLoading(false)
          return
        }

        const payload = verifyToken(token)
        const uid = payload?.userId || payload?.id || payload?.uid

        if (!uid) {
          setError("Invalid session")
          setLoading(false)
          return
        }

        setEmployeeId(uid)

        // Fetch announcements for the employee
        const response = await apiService.announcements.getEmployeeAnnouncements(uid)
        
        if (IS_DEV) {
          console.log("📢 Employee announcements response:", response)
          console.log("📋 Raw data:", response.data)
        }
        
        if (response?.data) {
          const formattedAnnouncements = response.data.map((ann) => {
            if (IS_DEV) {
              console.log("📋 Processing announcement:", ann.id, ann.title)
              console.log("📎 Attachments found:", ann.attachments)
            }
            
            return {
              id: ann.id,
              title: ann.title || ann.message || "Announcement",
              description: ann.description || ann.content || ann.message || "",
              time: new Date(ann.created_at || ann.date).toLocaleDateString(),
              createdAt: ann.created_at || ann.date, // Keep raw date for age calculation
              read: ann.is_read || ann.read || false,
              priority: ann.priority || "normal",
              attachments: ann.attachments || [], // Get attachments from API response
              fullData: ann,
            }
          })
          
          if (IS_DEV) {
            console.log("✅ Formatted announcements:", formattedAnnouncements)
            console.log("✅ First announcement attachments:", formattedAnnouncements[0]?.attachments)
          }
          
          // Load archived announcements from localStorage
          // Note: uid here equals employeeId state - both are used for the same localStorage key
          const storedArchived = localStorage.getItem(`archived_announcements_${uid}`)
          let archivedIds = storedArchived ? JSON.parse(storedArchived) : []
          
          // Auto-archive announcements older than 7 days (only run once per day)
          const lastAutoArchiveKey = `last_auto_archive_${uid}`
          const lastAutoArchive = localStorage.getItem(lastAutoArchiveKey)
          const now = new Date()
          const today = now.toDateString()
          
          // Only run auto-archive if we haven't done it today
          if (lastAutoArchive !== today) {
            const archiveThreshold = new Date()
            archiveThreshold.setDate(archiveThreshold.getDate() - AUTO_ARCHIVE_DAYS)
            
            const autoArchivedIds = []
            formattedAnnouncements.forEach((ann) => {
              const announcementDate = new Date(ann.createdAt)
              if (announcementDate < archiveThreshold && !archivedIds.includes(ann.id)) {
                autoArchivedIds.push(ann.id)
              }
            })
            
            // Add auto-archived IDs to archived list and save to localStorage
            if (autoArchivedIds.length > 0) {
              archivedIds = [...archivedIds, ...autoArchivedIds]
              localStorage.setItem(`archived_announcements_${uid}`, JSON.stringify(archivedIds))
              if (IS_DEV) {
                console.log(`📦 Auto-archived ${autoArchivedIds.length} announcements older than ${AUTO_ARCHIVE_DAYS} days`)
              }
            }
            
            // Mark that we've run auto-archive today
            localStorage.setItem(lastAutoArchiveKey, today)
          }
          
          // Separate archived and active announcements
          const active = formattedAnnouncements.filter(ann => !archivedIds.includes(ann.id))
          const archived = formattedAnnouncements.filter(ann => archivedIds.includes(ann.id))
          
          setAnnouncements(active)
          setArchivedAnnouncements(archived)
        } else {
          setAnnouncements([])
          setArchivedAnnouncements([])
        }
      } catch (err) {
        console.error("❌ Error fetching announcements:", err)
        setError("Failed to load announcements")
        setAnnouncements([])
        setArchivedAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncementsData()
  }, [])

  const handleDownloadAttachment = async (announcementId, filename) => {
    try {
      if (IS_DEV) console.log(`📥 Downloading: ${filename} from announcement ${announcementId}`)
      const blob = await apiService.announcements.getAnnouncementAttachment(announcementId, filename)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      if (IS_DEV) console.log("✅ Download successful")
    } catch (error) {
      console.error('❌ Error downloading attachment:', error)
      alert('Failed to download attachment: ' + error.message)
    }
  }

  const handleMarkAsRead = async (announcementId) => {
    if (!employeeId) return

    setMarkingAsRead(announcementId)

    try {
      await apiService.announcements.markAnnouncementAsRead(announcementId, employeeId)

      // Update local state
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.id === announcementId ? { ...ann, read: true } : ann
        )
      )
    } catch (err) {
      console.error("Error marking announcement as read:", err)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const toggleExpand = (announcementId, isRead) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId)
      } else {
        newSet.add(announcementId)
        // Auto-mark as read when expanded
        if (!isRead) {
          handleMarkAsRead(announcementId)
        }
      }
      return newSet
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-red-500"
      case "important":
        return "bg-amber-500"
      case "normal":
        return "bg-emerald-500"
      default:
        return "bg-zinc-500"
    }
  }

  // Delete single announcement
  const handleDeleteAnnouncement = async (announcementId) => {
    if (!employeeId) return

    setDeletingIds((prev) => new Set([...prev, announcementId]))

    try {
      await apiService.announcements.dismissAnnouncement(announcementId, employeeId)
      
      // Remove from both active and archived lists
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
      setArchivedAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    } catch (err) {
      console.error("Error deleting announcement:", err)
      // Still remove from UI even if API fails
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
      setArchivedAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    }
  }

  // Delete multiple selected announcements
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !employeeId) return

    const idsToDelete = [...selectedIds]
    setDeletingIds(new Set(idsToDelete))

    try {
      // Delete all selected announcements
      await Promise.all(
        idsToDelete.map((id) => 
          apiService.announcements.dismissAnnouncement(id, employeeId).catch((err) => {
            console.error(`Failed to delete announcement ${id}:`, err)
          })
        )
      )

      // Remove from local state
      setAnnouncements((prev) => prev.filter((ann) => !idsToDelete.includes(ann.id)))
      setArchivedAnnouncements((prev) => prev.filter((ann) => !idsToDelete.includes(ann.id)))
      setSelectedIds(new Set())
      setIsSelectionMode(false)
    } catch (err) {
      console.error("Error deleting announcements:", err)
    } finally {
      setDeletingIds(new Set())
    }
  }

  // Archive single announcement
  const handleArchiveAnnouncement = (announcementId) => {
    if (!employeeId) return

    setArchivingIds((prev) => new Set([...prev, announcementId]))

    try {
      // Find the announcement
      const announcement = announcements.find((ann) => ann.id === announcementId)
      if (!announcement) return

      // Move to archived
      setArchivedAnnouncements((prev) => [...prev, announcement])
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
      
      // Save to localStorage
      const storedArchived = localStorage.getItem(`archived_announcements_${employeeId}`)
      const archivedIds = storedArchived ? JSON.parse(storedArchived) : []
      archivedIds.push(announcementId)
      localStorage.setItem(`archived_announcements_${employeeId}`, JSON.stringify(archivedIds))
      
      // Clear from selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    } finally {
      setArchivingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    }
  }

  // Unarchive single announcement
  const handleUnarchiveAnnouncement = (announcementId) => {
    if (!employeeId) return

    setArchivingIds((prev) => new Set([...prev, announcementId]))

    try {
      // Find the announcement
      const announcement = archivedAnnouncements.find((ann) => ann.id === announcementId)
      if (!announcement) return

      // Move to active
      setAnnouncements((prev) => [...prev, announcement])
      setArchivedAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementId))
      
      // Update localStorage
      const storedArchived = localStorage.getItem(`archived_announcements_${employeeId}`)
      const archivedIds = storedArchived ? JSON.parse(storedArchived) : []
      const newArchivedIds = archivedIds.filter((id) => id !== announcementId)
      localStorage.setItem(`archived_announcements_${employeeId}`, JSON.stringify(newArchivedIds))
      
      // Clear from selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    } finally {
      setArchivingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(announcementId)
        return newSet
      })
    }
  }

  // Archive multiple selected announcements
  const handleArchiveSelected = () => {
    if (selectedIds.size === 0 || !employeeId) return

    const idsToArchive = [...selectedIds]
    setArchivingIds(new Set(idsToArchive))

    try {
      // Find announcements to archive
      const toArchive = announcements.filter((ann) => idsToArchive.includes(ann.id))
      
      // Move to archived
      setArchivedAnnouncements((prev) => [...prev, ...toArchive])
      setAnnouncements((prev) => prev.filter((ann) => !idsToArchive.includes(ann.id)))
      
      // Save to localStorage
      const storedArchived = localStorage.getItem(`archived_announcements_${employeeId}`)
      const archivedIds = storedArchived ? JSON.parse(storedArchived) : []
      const newArchivedIds = [...archivedIds, ...idsToArchive]
      localStorage.setItem(`archived_announcements_${employeeId}`, JSON.stringify(newArchivedIds))
      
      setSelectedIds(new Set())
      setIsSelectionMode(false)
    } finally {
      setArchivingIds(new Set())
    }
  }

  // Unarchive multiple selected announcements
  const handleUnarchiveSelected = () => {
    if (selectedIds.size === 0 || !employeeId) return

    const idsToUnarchive = [...selectedIds]
    setArchivingIds(new Set(idsToUnarchive))

    try {
      // Find announcements to unarchive
      const toUnarchive = archivedAnnouncements.filter((ann) => idsToUnarchive.includes(ann.id))
      
      // Move to active
      setAnnouncements((prev) => [...prev, ...toUnarchive])
      setArchivedAnnouncements((prev) => prev.filter((ann) => !idsToUnarchive.includes(ann.id)))
      
      // Update localStorage
      const storedArchived = localStorage.getItem(`archived_announcements_${employeeId}`)
      const archivedIds = storedArchived ? JSON.parse(storedArchived) : []
      const newArchivedIds = archivedIds.filter((id) => !idsToUnarchive.includes(id))
      localStorage.setItem(`archived_announcements_${employeeId}`, JSON.stringify(newArchivedIds))
      
      setSelectedIds(new Set())
      setIsSelectionMode(false)
    } finally {
      setArchivingIds(new Set())
    }
  }

  // Toggle selection of an announcement
  const toggleSelection = (announcementId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId)
      } else {
        newSet.add(announcementId)
      }
      return newSet
    })
  }

  // Select all announcements (filtered)
  const selectAll = () => {
    setSelectedIds(new Set(filteredAndSortedAnnouncements.map((ann) => ann.id)))
  }

  // Deselect all announcements
  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev)
    if (isSelectionMode) {
      setSelectedIds(new Set())
    }
  }

  // Get current list based on view mode
  const currentList = viewMode === "archived" ? archivedAnnouncements : announcements

  // Filter and sort announcements
  const filteredAndSortedAnnouncements = useMemo(() => {
    const sourceList = viewMode === "archived" ? archivedAnnouncements : announcements
    let result = [...sourceList]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (ann) =>
          ann.title.toLowerCase().includes(query) ||
          ann.description.toLowerCase().includes(query)
      )
    }

    // Apply filter
    switch (filterBy) {
      case "unread":
        result = result.filter((ann) => !ann.read)
        break
      case "read":
        result = result.filter((ann) => ann.read)
        break
      case "urgent":
        result = result.filter((ann) => ann.priority?.toLowerCase() === "urgent")
        break
      case "important":
        result = result.filter((ann) => ann.priority?.toLowerCase() === "important")
        break
      default:
        // "all" - no filter
        break
    }

    // Apply sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case "priority":
        const priorityOrder = { urgent: 0, important: 1, normal: 2 }
        result.sort((a, b) => {
          const aPriority = priorityOrder[a.priority?.toLowerCase()] ?? 3
          const bPriority = priorityOrder[b.priority?.toLowerCase()] ?? 3
          return aPriority - bPriority
        })
        break
      case "newest":
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
    }

    return result
  }, [announcements, archivedAnnouncements, viewMode, filterBy, sortBy, searchQuery])

  // Paginate the filtered and sorted announcements
  const totalItems = filteredAndSortedAnnouncements.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAnnouncements = filteredAndSortedAnnouncements.slice(startIndex, endIndex)

  // Reset to page 1 when filters change or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterBy, sortBy, searchQuery, viewMode, itemsPerPage])

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToFirstPage = () => setCurrentPage(1)
  const goToLastPage = () => setCurrentPage(totalPages)
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1))

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setFilterBy("all")
    setSortBy("newest")
  }

  const hasActiveFilters = searchQuery.trim() || filterBy !== "all" || sortBy !== "newest"

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDarkMode ? "text-white" : "text-zinc-900"}`} />
          <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            Loading announcements...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
          Announcements
        </h2>
        <div className={`p-4 sm:p-6 rounded-xl border flex items-center gap-3 ${isDarkMode ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
          Announcements
        </h2>
        {(announcements.length > 0 || archivedAnnouncements.length > 0) && (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`text-xs sm:text-sm whitespace-nowrap ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {announcements.filter((a) => !a.read).length} unread
            </span>
            
            {/* Filter Toggle Button */}
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-xs ${showFilters ? (isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700") : ""}`}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </Button>
            
            {/* Selection Mode Toggle */}
            <Button
              variant={isSelectionMode ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleSelectionMode}
              className={`text-xs ${isSelectionMode ? (isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700") : ""}`}
            >
              {isSelectionMode ? (
                <>
                  <XSquare className="w-4 h-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* View Mode Tabs */}
      {(announcements.length > 0 || archivedAnnouncements.length > 0) && (
        <div className={`flex items-center gap-1 p-1 rounded-lg w-fit ${isDarkMode ? "bg-zinc-800" : "bg-zinc-200"}`}>
          <button
            onClick={() => {
              setViewMode("active")
              setSelectedIds(new Set())
              setIsSelectionMode(false)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === "active"
                ? isDarkMode
                  ? "bg-zinc-900 text-white shadow"
                  : "bg-white text-zinc-900 shadow"
                : isDarkMode
                  ? "text-zinc-400 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Active
            {announcements.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                viewMode === "active"
                  ? isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                  : isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-zinc-300 text-zinc-600"
              }`}>
                {announcements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setViewMode("archived")
              setSelectedIds(new Set())
              setIsSelectionMode(false)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === "archived"
                ? isDarkMode
                  ? "bg-zinc-900 text-white shadow"
                  : "bg-white text-zinc-900 shadow"
                : isDarkMode
                  ? "text-zinc-400 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Archive className="w-4 h-4" />
            Archived
            {archivedAnnouncements.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                viewMode === "archived"
                  ? isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                  : isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-zinc-300 text-zinc-600"
              }`}>
                {archivedAnnouncements.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filter and Sort Controls */}
      {showFilters && currentList.length > 0 && (
        <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-10 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-amber-500/50" 
                  : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-amber-500/50"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${isDarkMode ? "hover:bg-zinc-700" : "hover:bg-zinc-200"}`}
              >
                <X className={`w-3 h-3 ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter By */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Filter:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: "all", label: "All" },
                  { value: "unread", label: "Unread" },
                  { value: "read", label: "Read" },
                  { value: "urgent", label: "Urgent" },
                  { value: "important", label: "Important" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterBy(option.value)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                      filterBy === option.value
                        ? isDarkMode
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                          : "bg-amber-100 text-amber-700 border border-amber-300"
                        : isDarkMode
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                          : "bg-white text-zinc-600 border border-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Sort:</span>
              <div className="flex gap-1">
                {[
                  { value: "newest", label: "Newest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "priority", label: "Priority" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-all flex items-center gap-1 ${
                      sortBy === option.value
                        ? isDarkMode
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                          : "bg-blue-100 text-blue-700 border border-blue-300"
                        : isDarkMode
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                          : "bg-white text-zinc-600 border border-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                  isDarkMode
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          
          {/* Results count */}
          <div className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
            Showing {filteredAndSortedAnnouncements.length} of {currentList.length} {viewMode === "archived" ? "archived " : ""}announcements
          </div>
        </div>
      )}

      {/* Selection Controls Bar */}
      {isSelectionMode && filteredAndSortedAnnouncements.length > 0 && (
        <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border flex-wrap ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-100 border-zinc-200"}`}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === filteredAndSortedAnnouncements.length ? deselectAll : selectAll}
              className="text-xs"
            >
              {selectedIds.size === filteredAndSortedAnnouncements.length ? (
                <>
                  <XSquare className="w-4 h-4 mr-1" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select All
                </>
              )}
            </Button>
            <span className={`text-xs ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {selectedIds.size} selected
            </span>
          </div>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {/* Archive/Unarchive Button */}
              {viewMode === "active" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveSelected}
                  disabled={archivingIds.size > 0}
                  className={`text-xs ${isDarkMode ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50"}`}
                >
                  {archivingIds.size > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-1" />
                      Archive ({selectedIds.size})
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnarchiveSelected}
                  disabled={archivingIds.size > 0}
                  className={`text-xs ${isDarkMode ? "text-emerald-400 hover:bg-emerald-500/10" : "text-emerald-600 hover:bg-emerald-50"}`}
                >
                  {archivingIds.size > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="w-4 h-4 mr-1" />
                      Restore ({selectedIds.size})
                    </>
                  )}
                </Button>
              )}
              
              {/* Delete Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deletingIds.size > 0}
                className="text-xs"
              >
                {deletingIds.size > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedIds.size})
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {currentList.length === 0 ? (
        <div className={`p-6 sm:p-8 rounded-xl border text-center ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          {viewMode === "archived" ? (
            <>
              <Archive className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-zinc-600" : "text-zinc-400"}`} />
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                No archived announcements
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                Archived announcements will appear here
              </p>
            </>
          ) : (
            <>
              <Inbox className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-zinc-600" : "text-zinc-400"}`} />
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                No announcements available
              </p>
            </>
          )}
        </div>
      ) : filteredAndSortedAnnouncements.length === 0 ? (
        <div className={`p-6 sm:p-8 rounded-xl border text-center ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            No announcements match your filters
          </p>
          <button
            onClick={clearFilters}
            className={`mt-2 text-xs ${isDarkMode ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"}`}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
        <div className="space-y-3 sm:space-y-4">
          {paginatedAnnouncements.map((announcement) => {
            const isExpanded = expandedIds.has(announcement.id)
            const hasAttachments = announcement.attachments && announcement.attachments.length > 0
            const isSelected = selectedIds.has(announcement.id)
            const isDeleting = deletingIds.has(announcement.id)
            
            const handleKeyDown = (e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isSelectionMode) {
                e.preventDefault()
                toggleExpand(announcement.id, announcement.read)
              }
            }
            
            return (
              <Card key={announcement.id} className={`overflow-hidden transition-all ${isSelected ? (isDarkMode ? "ring-2 ring-amber-500/50" : "ring-2 ring-amber-400") : ""}`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3">
                    {/* Collapsed View - Title Only */}
                    <div className="flex items-center gap-3">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelection(announcement.id)
                          }}
                          className={`shrink-0 p-1 rounded transition-colors ${isDarkMode ? "hover:bg-zinc-700" : "hover:bg-zinc-200"}`}
                        >
                          {isSelected ? (
                            <CheckSquare className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                          ) : (
                            <Square className={`w-5 h-5 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`} />
                          )}
                        </button>
                      )}
                      
                      <div 
                        className="flex items-center justify-between gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => !isSelectionMode && toggleExpand(announcement.id, announcement.read)}
                        onKeyDown={handleKeyDown}
                        role="button"
                        tabIndex={isSelectionMode ? -1 : 0}
                        aria-expanded={isExpanded}
                        aria-label={`${announcement.title}${!announcement.read ? ' (unread)' : ''}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Priority/Unread indicator */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${!announcement.read ? 'bg-red-500 animate-pulse' : getPriorityColor(announcement.priority)}`}></div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold text-base truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                                {announcement.title}
                              </p>
                              {!announcement.read && (
                                <Badge variant="destructive" className="shrink-0 text-xs">
                                  New
                                </Badge>
                              )}
                              {announcement.priority && announcement.priority !== "normal" && (
                                <Badge className={`text-xs shrink-0 ${getPriorityColor(announcement.priority)} text-white`}>
                                  {announcement.priority}
                                </Badge>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                              {announcement.time}
                            </p>
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Toggle */}
                        {!isSelectionMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`shrink-0 ${isDarkMode ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"}`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <>
                                <span className="text-xs mr-1 hidden sm:inline">Read More</span>
                                <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className={`pt-3 border-t space-y-3 animate-fadeIn ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                        {/* Description */}
                        {announcement.description && (
                          <div className={`text-sm whitespace-pre-wrap ${isDarkMode ? "text-zinc-300" : "text-zinc-600"}`}>
                            {announcement.description}
                          </div>
                        )}

                        {/* Attachments Section */}
                        {hasAttachments && (
                          <div className={`pt-3 border-t ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                            <p className={`text-xs font-medium mb-2 flex items-center gap-2 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                              <FileText className="w-4 h-4" />
                              Attachments ({announcement.attachments.length})
                            </p>
                            <div className="space-y-2">
                              {announcement.attachments.map((attachment, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadAttachment(announcement.id, attachment.filename)
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                                    isDarkMode
                                      ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                                      : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                                        {attachment.original_name || attachment.filename}
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                                        {formatFileSize(attachment.file_size)}
                                      </p>
                                    </div>
                                  </div>
                                  <Download className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAnnouncement(announcement.id)
                            }}
                            disabled={isDeleting}
                            className={`text-xs ${isDarkMode ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:text-red-700 hover:bg-red-50"}`}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3 mr-1.5" />
                                Delete
                              </>
                            )}
                          </Button>
                          
                          {/* Archive/Unarchive Button */}
                          {viewMode === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveAnnouncement(announcement.id)
                              }}
                              disabled={archivingIds.has(announcement.id)}
                              className={`text-xs ${isDarkMode ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                            >
                              {archivingIds.has(announcement.id) ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                  Archiving...
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3 h-3 mr-1.5" />
                                  Archive
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnarchiveAnnouncement(announcement.id)
                              }}
                              disabled={archivingIds.has(announcement.id)}
                              className={`text-xs ${isDarkMode ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}`}
                            >
                              {archivingIds.has(announcement.id) ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                  Restoring...
                                </>
                              ) : (
                                <>
                                  <ArchiveRestore className="w-3 h-3 mr-1.5" />
                                  Restore
                                </>
                              )}
                            </Button>
                          )}
                          
                          {/* Mark as Read Button */}
                          {!announcement.read && viewMode === "active" && (
                            <Button
                              variant={isDarkMode ? "secondary" : "outline"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(announcement.id)
                              }}
                              disabled={markingAsRead === announcement.id}
                            >
                              {markingAsRead === announcement.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 mr-1.5" />
                                  Mark as Seen
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            goToPage={goToPage}
            goToFirstPage={goToFirstPage}
            goToLastPage={goToLastPage}
            goToPrevPage={goToPrevPage}
            goToNextPage={goToNextPage}
            isDarkMode={isDarkMode}
          />
        )}
        </>
      )}
    </div>
  )
}