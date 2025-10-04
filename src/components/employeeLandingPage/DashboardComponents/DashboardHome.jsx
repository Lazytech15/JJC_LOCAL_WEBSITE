import { Calendar, CheckCircle2, FileText, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/UiComponents"

export default function DashboardHome({
  employee,
  employeeData,
  announcements,
  dailySummaries = [],
  documentData,
  isDarkMode,
}) {
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

  const totalHours = userSummaries.reduce((sum, day) => sum + (day.total_hours || 0), 0)
  const overtimeHours = userSummaries.reduce((sum, day) => sum + (day.overtime_hours || 0), 0)

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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            Welcome back, {employee?.name?.split(" ")[0]}!
          </h2>
          <p className={`text-sm mt-2 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={index}
              className={`border transition-all hover:scale-105 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p
                      className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"
                        }`}
                    >
                      {stat.label}
                    </p>
                    <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatColor(stat.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {overtimeHours > 0 && (
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
              >
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Overtime Hours This Period
                </p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {overtimeHours.toFixed(1)} hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Announcements */}
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardHeader>
          <CardTitle className={isDarkMode ? "text-white" : "text-zinc-900"}>Recent Announcements</CardTitle>
          <CardDescription className={isDarkMode ? "text-zinc-400" : "text-zinc-600"}>
            Stay updated with the latest company news
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.slice(0, 3).map((announcement) => (
            <div
              key={announcement.id}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${isDarkMode ? "border-zinc-800 hover:bg-zinc-800/50" : "border-zinc-200 hover:bg-zinc-50"
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                      {announcement.title}
                    </p>
                    {!announcement.read && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                  </div>
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    {announcement.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
