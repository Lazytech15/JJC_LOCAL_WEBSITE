import { useState, useEffect } from "react"
import { Card, CardContent, Badge, Button } from "../../ui/UiComponents"
import { Loader2, AlertCircle, Check, ChevronDown, ChevronUp, Download, FileText } from "lucide-react"
import apiService from "../../../utils/api/api-service"
import { getStoredToken, verifyToken } from "../../../utils/auth"

export default function Announcements({ isDarkMode }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [markingAsRead, setMarkingAsRead] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())

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
        const uid = payload?.userId

        if (!uid) {
          setError("Invalid session")
          setLoading(false)
          return
        }

        setEmployeeId(uid)

        // Fetch announcements for the employee
        const response = await apiService.announcements.getEmployeeAnnouncements(uid)
        
        console.log("📢 Employee announcements response:", response)
        console.log("📋 Raw data:", response.data)
        
        if (response?.data) {
          const formattedAnnouncements = response.data.map((ann) => {
            console.log("📋 Processing announcement:", ann.id, ann.title)
            console.log("📎 Attachments found:", ann.attachments)
            
            return {
              id: ann.id,
              title: ann.title || ann.message || "Announcement",
              description: ann.description || ann.content || ann.message || "",
              time: new Date(ann.created_at || ann.date).toLocaleDateString(),
              read: ann.is_read || ann.read || false,
              priority: ann.priority || "normal",
              attachments: ann.attachments || [], // Get attachments from API response
              fullData: ann,
            }
          })
          
          console.log("✅ Formatted announcements:", formattedAnnouncements)
          console.log("✅ First announcement attachments:", formattedAnnouncements[0]?.attachments)
          setAnnouncements(formattedAnnouncements)
        } else {
          setAnnouncements([])
        }
      } catch (err) {
        console.error("❌ Error fetching announcements:", err)
        setError("Failed to load announcements")
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncementsData()
  }, [])

  const handleDownloadAttachment = async (announcementId, filename) => {
    try {
      console.log(`📥 Downloading: ${filename} from announcement ${announcementId}`)
      const blob = await apiService.announcements.getAnnouncementAttachment(announcementId, filename)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log("✅ Download successful")
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
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
          Announcements
        </h2>
        {announcements.length > 0 && (
          <span className={`text-xs sm:text-sm whitespace-nowrap ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            {announcements.filter((a) => !a.read).length} unread
          </span>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className={`p-6 sm:p-8 rounded-xl border text-center ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
          <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            No announcements available
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {announcements.map((announcement) => {
            const isExpanded = expandedIds.has(announcement.id)
            const hasAttachments = announcement.attachments && announcement.attachments.length > 0
            
            console.log(`🔍 Rendering announcement ${announcement.id}, hasAttachments:`, hasAttachments, announcement.attachments)
            
            return (
              <Card key={announcement.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3">
                    {/* Title and Badges Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className={`font-semibold text-base sm:text-lg wrap-break-word ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                            {announcement.title}
                          </p>
                          {!announcement.read && (
                            <Badge variant="destructive" className="shrink-0 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        {announcement.priority && announcement.priority !== "normal" && (
                          <Badge className={`text-xs shrink-0 ${getPriorityColor(announcement.priority)} text-white`}>
                            {announcement.priority}
                          </Badge>
                        )}
                      </div>
                      {!announcement.read && (
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 bg-red-500`}></div>
                      )}
                    </div>

                    {/* Description Preview or Full */}
                    {announcement.description && (
                      <div className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <p className={isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}>
                          {announcement.description}
                        </p>
                      </div>
                    )}

                    {/* Attachments Section */}
                    {hasAttachments && (
                      <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                        <p className={`text-xs font-medium mb-2 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          <FileText className="w-4 h-4" />
                          Attachments ({announcement.attachments.length})
                        </p>
                        <div className="space-y-2">
                          {announcement.attachments.map((attachment, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleDownloadAttachment(announcement.id, attachment.filename)}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                                isDarkMode
                                  ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                                  : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                    {attachment.original_name || attachment.filename}
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                                    {formatFileSize(attachment.file_size)}
                                  </p>
                                </div>
                              </div>
                              <Download className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer with Time and Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                      <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                        {announcement.time}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {/* Expand/Collapse Button */}
                        {announcement.description && announcement.description.length > 100 && (
                          <Button
                            variant={isDarkMode ? "ghost" : "ghost"}
                            size="sm"
                            onClick={() => toggleExpand(announcement.id, announcement.read)}
                            className="shrink-0"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 sm:mr-1.5" />
                                <span className="hidden sm:inline">Show Less</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 sm:mr-1.5" />
                                <span className="hidden sm:inline">Read More</span>
                              </>
                            )}
                          </Button>
                        )}

                        {/* Mark as Read Button */}
                        {!announcement.read && (
                          <Button
                            variant={isDarkMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleMarkAsRead(announcement.id)}
                            disabled={markingAsRead === announcement.id}
                            className="shrink-0"
                          >
                            {markingAsRead === announcement.id ? (
                              <>
                                <Loader2 className="w-3 h-3 sm:mr-1.5 animate-spin" />
                                <span className="hidden sm:inline">Marking...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 sm:mr-1.5" />
                                <span className="hidden sm:inline">Mark as Seen</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}