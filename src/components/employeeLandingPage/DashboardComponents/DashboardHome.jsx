import { useEffect, useState } from "react"
import { Calendar, CheckCircle2, FileText, Clock, TrendingUp, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from "../../ui/UiComponents"
import apiService from "../../../utils/api/api-service"

export default function DashboardHome({
  employee,
  employeeData,
  dailySummaries = [],
  documentData,
  isDarkMode,
}) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  // Fetch announcements on component mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
        setError(null)

        let announcementData = []

        // If employee ID exists, fetch employee-specific announcements
        if (employeeData?.id) {
          const response = await apiService.announcements.getEmployeeAnnouncements(
            employeeData.id
          )
          // Handle the wrapped response from getEmployeeAnnouncements
          announcementData = Array.isArray(response?.data) ? response.data : []
        } else {
          // Otherwise fetch all announcements
          const response = await apiService.announcements.getAnnouncements({
            limit: 10,
            offset: 0,
          })
          // Handle both array and object responses
          announcementData = Array.isArray(response?.announcements)
            ? response.announcements
            : Array.isArray(response)
            ? response
            : []
        }

        // Format announcements and add missing 'time' field
        const formattedAnnouncements = announcementData.map((ann) => ({
          ...ann,
          title: ann.title || ann.message || "Announcement",
          description: ann.description || ann.content || "",
          time:
            ann.time ||
            new Date(ann.createdAt || ann.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          read: ann.is_read || ann.read || false,
          priority: ann.priority || "normal",
        }))

        setAnnouncements(formattedAnnouncements)
      } catch (err) {
        console.error("Failed to fetch announcements:", err)
        setError(err.message)
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [employeeData?.id])

  const userSummaries = Array.isArray(dailySummaries)
    ? dailySummaries.filter((day) => (employeeData?.id ? day.employee_uid === employeeData.id : true))
    : []

  // Calculate Days Active from daily summaries (unique dates)
  const daysActive = userSummaries.length
  const calculateAttendanceRate = () => {
    if (!userSummaries || userSummaries.length === 0) return "0%"

    const completeDays = userSummaries.filter((day) => {
      return (
        day.is_incomplete === 0 ||
        day.is_incomplete === false ||
        (day.completed_sessions > 0 && day.completed_sessions === day.total_sessions)
      )
    }).length

    const rate = Math.round((completeDays / userSummaries.length) * 100)
    return `${rate}%`
  }

  // Count documents
  const documentCount = documentData?.documents?.length || documentData?.length || 0

  const totalHours = userSummaries.reduce((sum, day) => sum + (parseFloat(day.total_hours) || 0), 0)
  const overtimeHours = userSummaries.reduce((sum, day) => sum + (parseFloat(day.overtime_hours) || 0), 0)

  const stats = [
    {
      label: "Attendance Rate",
      value: calculateAttendanceRate(),
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Days Active",
      value: daysActive.toString(),
      icon: Calendar,
      color: "amber",
    },
    {
      label: "Documents",
      value: documentCount.toString(),
      icon: FileText,
      color: "blue",
    },
    {
      label: "Total Hours",
      value: totalHours.toFixed(1),
      icon: Clock,
      color: "violet",
    },
  ]

  const getStatColor = (color) => {
    const colors = {
      emerald: isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600",
      blue: isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600",
      violet: isDarkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600",
      amber: isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600",
    }
    return colors[color] || colors.emerald
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

  const handleAnnouncementClick = async (announcement) => {
    setSelectedAnnouncement(announcement)
    
    // Mark as read when opened
    if (!announcement.read && employeeData?.id) {
      try {
        await apiService.announcements.markAnnouncementAsRead(announcement.id, employeeData.id)
        // Update local state
        setAnnouncements((prev) =>
          prev.map((ann) =>
            ann.id === announcement.id ? { ...ann, read: true } : ann
          )
        )
      } catch (err) {
        console.error("Failed to mark announcement as read:", err)
      }
    }
  }

  const closeModal = () => {
    setSelectedAnnouncement(null)
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              Welcome back, {employee?.name?.split(" ")[0]}!
            </h2>
            <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card
                key={index}
                className={`border transition-all hover:scale-[1.02] sm:hover:scale-105 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                  }`}
              >
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"
                          }`}
                      >
                        {stat.label}
                      </p>
                      <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${getStatColor(stat.color)}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {overtimeHours > 0 && (
          <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
                >
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Overtime Hours This Period
                  </p>
                  <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {overtimeHours.toFixed(1)} hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Announcements */}
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className={`text-base sm:text-lg lg:text-xl ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Recent Announcements</CardTitle>
            <CardDescription className={`text-xs sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              Stay updated with the latest company news
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-2 sm:pt-3">
            {loading ? (
              <p className={`text-xs sm:text-sm text-center py-4 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                Loading announcements...
              </p>
            ) : error ? (
              <p className={`text-xs sm:text-sm text-center py-4 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                Failed to load announcements
              </p>
            ) : announcements.length > 0 ? (
              announcements.slice(0, 3).map((announcement) => (
                <div
                  key={announcement.id}
                  onClick={() => handleAnnouncementClick(announcement)}
                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${isDarkMode ? "border-zinc-800 hover:bg-zinc-800/50" : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Priority indicator */}
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${!announcement.read ? 'bg-red-500' : getPriorityColor(announcement.priority)}`}></div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className={`font-semibold truncate text-sm sm:text-base ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                            {announcement.title}
                          </p>
                          {!announcement.read && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs shrink-0">
                              New
                            </Badge>
                          )}
                          {announcement.priority && announcement.priority !== "normal" && (
                            <Badge className={`text-[10px] sm:text-xs shrink-0 ${getPriorityColor(announcement.priority)} text-white`}>
                              {announcement.priority}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                          {announcement.time}
                        </p>
                      </div>
                    </div>
                    
                    <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-xs sm:text-sm text-center py-4 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                No announcements at this time
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className={`relative w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 flex items-start justify-between gap-3 sm:gap-4 p-4 sm:p-6 border-b ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2">
                  <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold break-words ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {selectedAnnouncement.title}
                  </h3>
                  {!selectedAnnouncement.read && (
                    <Badge variant="destructive" className="flex-shrink-0 text-[10px] sm:text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <p className={`text-[10px] sm:text-xs ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                    {selectedAnnouncement.time}
                  </p>
                  {selectedAnnouncement.priority && selectedAnnouncement.priority !== "normal" && (
                    <Badge className={`text-[10px] sm:text-xs ${getPriorityColor(selectedAnnouncement.priority)} text-white`}>
                      {selectedAnnouncement.priority}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                className="flex-shrink-0 p-1.5 sm:p-2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              <div className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
                <p className={`text-xs sm:text-sm lg:text-base whitespace-pre-wrap ${isDarkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                  {selectedAnnouncement.description || "No additional details available."}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              <Button
                variant={isDarkMode ? "secondary" : "outline"}
                onClick={closeModal}
                className="text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}