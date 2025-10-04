import { Clock, Calendar, TrendingUp, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/UiComponents"
import { Badge } from "../../ui/UiComponents"

export default function TimeAttendance({ dailySummaries, isDarkMode }) {
  const calculateStats = () => {
    if (!dailySummaries || dailySummaries.length === 0) {
      return {
        totalDays: 0,
        totalHours: 0,
        avgHoursPerDay: 0,
        overtimeHours: 0,
        lateDays: 0,
        incompleteDays: 0,
        attendanceRate: 0,
      }
    }

    console.log("[v0] TimeAttendance - Processing summaries:", dailySummaries.length)

    const totalHours = dailySummaries.reduce((sum, day) => sum + (day.total_hours || 0), 0)
    const overtimeHours = dailySummaries.reduce((sum, day) => sum + (day.overtime_hours || 0), 0)
    const lateDays = dailySummaries.filter((day) => day.has_late_entry === 1 || day.has_late_entry === true).length
    const incompleteDays = dailySummaries.filter((day) => day.is_incomplete === 1 || day.is_incomplete === true).length
    const completeDays = dailySummaries.length - incompleteDays
    const attendanceRate = dailySummaries.length > 0 ? (completeDays / dailySummaries.length) * 100 : 0

    return {
      totalDays: dailySummaries.length,
      totalHours: totalHours.toFixed(1),
      avgHoursPerDay: (totalHours / dailySummaries.length).toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      lateDays,
      incompleteDays,
      attendanceRate: attendanceRate.toFixed(0),
    }
  }

  const stats = calculateStats()

  const formatTime = (timeString) => {
    if (!timeString) return "--:--"
    const date = new Date(timeString)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getStatusBadge = (day) => {
    if (day.is_incomplete) {
      return <Badge className="bg-red-500 text-white">Incomplete</Badge>
    }
    if (day.has_late_entry) {
      return <Badge className="bg-amber-500 text-white">Late</Badge>
    }
    if (day.has_overtime) {
      return <Badge className="bg-blue-500 text-white">Overtime</Badge>
    }
    return <Badge className="bg-emerald-500 text-white">Complete</Badge>
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Time & Attendance</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Total Hours
                </p>
                <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.totalHours}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
              >
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Attendance Rate
                </p>
                <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.attendanceRate}%
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
              >
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Overtime Hours
                </p>
                <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.overtimeHours}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"}`}
              >
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Days Tracked
                </p>
                <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.totalDays}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600"}`}
              >
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardHeader>
          <CardTitle className={isDarkMode ? "text-white" : "text-zinc-900"}>Attendance History</CardTitle>
          <CardDescription className={isDarkMode ? "text-zinc-400" : "text-zinc-600"}>
            Your recent clock-in and clock-out records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!dailySummaries || dailySummaries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-zinc-700" : "text-zinc-300"}`} />
              <p className={`text-lg ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                    <th
                      className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Date
                    </th>
                    <th
                      className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Morning
                    </th>
                    <th
                      className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Afternoon
                    </th>
                    <th
                      className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Evening
                    </th>
                    <th
                      className={`text-right py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Total Hours
                    </th>
                    <th
                      className={`text-right py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.slice(0, 10).map((day, index) => (
                    <tr
                      key={day.id || index}
                      className={`border-b transition-colors ${
                        isDarkMode ? "border-zinc-800 hover:bg-zinc-800/50" : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <td className={`py-4 px-4 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        <div className="font-medium">{formatDate(day.date)}</div>
                      </td>
                      <td className={`py-4 px-4 text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <div>{formatTime(day.morning_in)}</div>
                        <div>{formatTime(day.morning_out)}</div>
                      </td>
                      <td className={`py-4 px-4 text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <div>{formatTime(day.afternoon_in)}</div>
                        <div>{formatTime(day.afternoon_out)}</div>
                      </td>
                      <td className={`py-4 px-4 text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        <div>{formatTime(day.evening_in)}</div>
                        <div>{formatTime(day.evening_out)}</div>
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}
                      >
                        {day.total_hours?.toFixed(1) || "0.0"}h
                      </td>
                      <td className="py-4 px-4 text-right">{getStatusBadge(day)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {stats.totalDays > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stats.lateDays > 0
                      ? isDarkMode
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-amber-50 text-amber-600"
                      : isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Late Arrivals
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {stats.lateDays} {stats.lateDays === 1 ? "day" : "days"}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                    Out of {stats.totalDays} tracked days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stats.incompleteDays > 0
                      ? isDarkMode
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-50 text-red-600"
                      : isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Incomplete Days
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {stats.incompleteDays} {stats.incompleteDays === 1 ? "day" : "days"}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                    Missing clock-in or clock-out
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
