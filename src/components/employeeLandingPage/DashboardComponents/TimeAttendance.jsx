import { useState } from "react"
import { Clock, Calendar, TrendingUp, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "../../ui/UiComponents"
import { Badge } from "../../ui/UiComponents"

export default function TimeAttendance({ dailySummaries, isDarkMode }) {
  const [showAll, setShowAll] = useState(false)
  const INITIAL_DISPLAY_COUNT = 10

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

    const totalHours = dailySummaries.reduce((sum, day) => sum + (parseFloat(day.total_hours) || 0), 0)
    const overtimeHours = dailySummaries.reduce((sum, day) => sum + (parseFloat(day.overtime_hours) || 0), 0)
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

  const displayedRecords = showAll ? dailySummaries : dailySummaries.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreRecords = dailySummaries.length > INITIAL_DISPLAY_COUNT

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Time & Attendance</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Total Hours
                </p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.totalHours}
                </p>
              </div>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
              >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Attendance Rate
                </p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.attendanceRate}%
                </p>
              </div>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Overtime Hours
                </p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.overtimeHours}
                </p>
              </div>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"}`}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Days Tracked
                </p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                  {stats.totalDays}
                </p>
              </div>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600"}`}
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className={`text-base sm:text-lg lg:text-xl ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Attendance History</CardTitle>
              <CardDescription className={`text-xs sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                Your recent clock-in and clock-out records
              </CardDescription>
            </div>
            {hasMoreRecords && (
              <span className={`text-[10px] sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                Showing {showAll ? dailySummaries.length : INITIAL_DISPLAY_COUNT} of {dailySummaries.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
          {!dailySummaries || dailySummaries.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Clock className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 ${isDarkMode ? "text-zinc-700" : "text-zinc-300"}`} />
              <p className={`text-sm sm:text-lg ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>No attendance records found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
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
                    {displayedRecords.map((day, index) => (
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
                          {(parseFloat(day.total_hours) || 0).toFixed(1)}h
                        </td>
                        <td className="py-4 px-4 text-right">{getStatusBadge(day)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-2 sm:space-y-4">
                {displayedRecords.map((day, index) => (
                  <div
                    key={day.id || index}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                      isDarkMode ? "bg-zinc-800/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    {/* Header with Date and Status */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className={`font-semibold text-sm sm:text-base ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        {formatDate(day.date)}
                      </div>
                      {getStatusBadge(day)}
                    </div>

                    {/* Time Sessions */}
                    <div className="space-y-1.5 sm:space-y-2">
                      {/* Morning */}
                      {(day.morning_in || day.morning_out) && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            Morning
                          </span>
                          <span className={isDarkMode ? "text-zinc-300" : "text-zinc-700"}>
                            {formatTime(day.morning_in)} - {formatTime(day.morning_out)}
                          </span>
                        </div>
                      )}

                      {/* Afternoon */}
                      {(day.afternoon_in || day.afternoon_out) && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            Afternoon
                          </span>
                          <span className={isDarkMode ? "text-zinc-300" : "text-zinc-700"}>
                            {formatTime(day.afternoon_in)} - {formatTime(day.afternoon_out)}
                          </span>
                        </div>
                      )}

                      {/* Evening */}
                      {(day.evening_in || day.evening_out) && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            Evening
                          </span>
                          <span className={isDarkMode ? "text-zinc-300" : "text-zinc-700"}>
                            {formatTime(day.evening_in)} - {formatTime(day.evening_out)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total Hours */}
                    <div className={`mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex items-center justify-between ${
                      isDarkMode ? "border-zinc-700" : "border-zinc-200"
                    }`}>
                      <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        Total Hours
                      </span>
                      <span className={`text-base sm:text-lg font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                        {(parseFloat(day.total_hours) || 0).toFixed(1)}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {hasMoreRecords && (
                <div className="mt-3 sm:mt-4 flex justify-center">
                  <Button
                    variant={isDarkMode ? "secondary" : "outline"}
                    onClick={() => setShowAll(!showAll)}
                    className="min-w-[160px] sm:min-w-[200px] text-xs sm:text-sm py-2"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Show All ({dailySummaries.length - INITIAL_DISPLAY_COUNT} more)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {stats.totalDays > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stats.lateDays > 0
                      ? isDarkMode
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-amber-50 text-amber-600"
                      : isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Late Arrivals
                  </p>
                  <p className={`text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {stats.lateDays} {stats.lateDays === 1 ? "day" : "days"}
                  </p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                    Out of {stats.totalDays} tracked days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stats.incompleteDays > 0
                      ? isDarkMode
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-50 text-red-600"
                      : isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    Incomplete Days
                  </p>
                  <p className={`text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                    {stats.incompleteDays} {stats.incompleteDays === 1 ? "day" : "days"}
                  </p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
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