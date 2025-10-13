import { useState, useEffect } from "react"
import { Card, CardContent, Badge, Button } from "../../ui/UiComponents"
import { Loader2, AlertCircle, Check } from "lucide-react"
import apiService from "../../../utils/api/api-service"
import { getStoredToken, verifyToken } from "../../../utils/auth"

export default function Announcements({ isDarkMode }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [markingAsRead, setMarkingAsRead] = useState(null)

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
        
        if (response?.data) {
          const formattedAnnouncements = response.data.map((ann) => ({
            id: ann.id,
            title: ann.title || ann.message || "Announcement",
            description: ann.description || ann.content || "",
            time: new Date(ann.created_at || ann.date).toLocaleDateString(),
            read: ann.is_read || ann.read || false,
            priority: ann.priority || "normal",
            fullData: ann,
          }))
          setAnnouncements(formattedAnnouncements)
        } else {
          setAnnouncements([])
        }
      } catch (err) {
        console.error("Error fetching announcements:", err)
        setError("Failed to load announcements")
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncementsData()
  }, [])

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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-amber-500"
      case "low":
        return "bg-emerald-500"
      default:
        return "bg-zinc-500"
    }
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
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  {/* Title and Badges Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className={`font-semibold text-base sm:text-lg break-words ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                          {announcement.title}
                        </p>
                        {!announcement.read && (
                          <Badge variant="destructive" className="flex-shrink-0 text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      {announcement.priority && announcement.priority !== "normal" && (
                        <Badge className={`text-xs flex-shrink-0 ${getPriorityColor(announcement.priority)} text-white`}>
                          {announcement.priority}
                        </Badge>
                      )}
                    </div>
                    {!announcement.read && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isDarkMode ? "bg-red-500" : "bg-red-500"}`}></div>
                    )}
                  </div>

                  {/* Description */}
                  {announcement.description && (
                    <p className={`text-sm line-clamp-2 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                      {announcement.description}
                    </p>
                  )}

                  {/* Footer with Time and Button */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                      {announcement.time}
                    </p>
                    {!announcement.read && (
                      <Button
                        variant={isDarkMode ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleMarkAsRead(announcement.id)}
                        disabled={markingAsRead === announcement.id}
                        className="flex-shrink-0"
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}