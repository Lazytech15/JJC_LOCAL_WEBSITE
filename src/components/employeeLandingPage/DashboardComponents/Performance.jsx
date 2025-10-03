import { BarChart3, TrendingUp, Award, Target, Clock, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/UiComponents"

export default function Performance({ dailySummaries, isDarkMode }) {
  const calculatePerformanceMetrics = () => {
    if (!dailySummaries || dailySummaries.length === 0) {
      return {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        avgHoursPerDay: 0,
        productivityScore: 0,
        consistencyScore: 0,
        punctualityScore: 0,
        completionRate: 0,
      }
    }

    console.log("[v0] Performance - Processing summaries:", dailySummaries.length)

    const totalHours = dailySummaries.reduce((sum, day) => sum + (day.total_hours || 0), 0)
    const regularHours = dailySummaries.reduce((sum, day) => sum + (day.regular_hours || 0), 0)
    const overtimeHours = dailySummaries.reduce((sum, day) => sum + (day.overtime_hours || 0), 0)
    const avgHoursPerDay = totalHours / dailySummaries.length

    // Calculate completion rate (days with complete sessions)
    const completeDays = dailySummaries.filter((day) => !day.is_incomplete).length
    const completionRate = (completeDays / dailySummaries.length) * 100

    // Calculate punctuality score (days without late entries)
    const onTimeDays = dailySummaries.filter((day) => !day.has_late_entry).length
    const punctualityScore = (onTimeDays / dailySummaries.length) * 100

    // Calculate consistency score based on variance in daily hours
    const avgHours = avgHoursPerDay
    const variance =
      dailySummaries.reduce((sum, day) => {
        const diff = (day.total_hours || 0) - avgHours
        return sum + diff * diff
      }, 0) / dailySummaries.length
    const stdDev = Math.sqrt(variance)
    const consistencyScore = Math.max(0, 100 - stdDev * 10)

    // Calculate productivity score (combination of hours worked and completion rate)
    const productivityScore = completionRate * 0.6 + Math.min(avgHoursPerDay / 8, 1) * 40

    return {
      totalHours: totalHours.toFixed(1),
      regularHours: regularHours.toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      productivityScore: productivityScore.toFixed(0),
      consistencyScore: consistencyScore.toFixed(0),
      punctualityScore: punctualityScore.toFixed(0),
      completionRate: completionRate.toFixed(0),
    }
  }

  const metrics = calculatePerformanceMetrics()

  const getScoreColor = (score) => {
    const numScore = Number.parseFloat(score)
    if (numScore >= 90) return isDarkMode ? "text-emerald-400" : "text-emerald-600"
    if (numScore >= 75) return isDarkMode ? "text-blue-400" : "text-blue-600"
    if (numScore >= 60) return isDarkMode ? "text-amber-400" : "text-amber-600"
    return isDarkMode ? "text-red-400" : "text-red-600"
  }

  const getPerformanceLevel = (score) => {
    const numScore = Number.parseFloat(score)
    if (numScore >= 90) return "Excellent"
    if (numScore >= 75) return "Good"
    if (numScore >= 60) return "Fair"
    return "Needs Improvement"
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Performance</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}
                >
                  Productivity
                </p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(metrics.productivityScore)}`}>
                  {metrics.productivityScore}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                  {getPerformanceLevel(metrics.productivityScore)}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
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
                  Punctuality
                </p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(metrics.punctualityScore)}`}>
                  {metrics.punctualityScore}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                  {getPerformanceLevel(metrics.punctualityScore)}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
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
                  Consistency
                </p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(metrics.consistencyScore)}`}>
                  {metrics.consistencyScore}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                  {getPerformanceLevel(metrics.consistencyScore)}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"}`}
              >
                <Target className="w-6 h-6" />
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
                  Completion
                </p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(metrics.completionRate)}`}>
                  {metrics.completionRate}%
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-zinc-500"}`}>
                  {getPerformanceLevel(metrics.completionRate)}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600"}`}
              >
                <Award className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardHeader>
          <CardTitle className={isDarkMode ? "text-white" : "text-zinc-900"}>Hours Breakdown</CardTitle>
          <CardDescription className={isDarkMode ? "text-zinc-400" : "text-zinc-600"}>
            Your work hours distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Total Hours</p>
                  <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>All tracked time</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {metrics.totalHours}h
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Regular Hours</p>
                  <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Standard work time</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {metrics.regularHours}h
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"}`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Overtime Hours</p>
                  <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Extra work time</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {metrics.overtimeHours}h
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600"}`}
                >
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Average Per Day</p>
                  <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>Daily average hours</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {metrics.avgHoursPerDay}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {dailySummaries && dailySummaries.length > 0 && (
        <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <CardHeader>
            <CardTitle className={isDarkMode ? "text-white" : "text-zinc-900"}>Performance Insights</CardTitle>
            <CardDescription className={isDarkMode ? "text-zinc-400" : "text-zinc-600"}>
              Key observations about your work patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Number.parseFloat(metrics.productivityScore) >= 80 && (
                <div
                  className={`p-4 rounded-lg ${isDarkMode ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"}`}
                >
                  <p className={`text-sm font-medium ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                    Great productivity! You're consistently meeting your work hours.
                  </p>
                </div>
              )}

              {Number.parseFloat(metrics.punctualityScore) < 70 && (
                <div
                  className={`p-4 rounded-lg ${isDarkMode ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}
                >
                  <p className={`text-sm font-medium ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>
                    Consider arriving on time more consistently to improve your punctuality score.
                  </p>
                </div>
              )}

              {Number.parseFloat(metrics.overtimeHours) > 10 && (
                <div
                  className={`p-4 rounded-lg ${isDarkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
                >
                  <p className={`text-sm font-medium ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>
                    You've logged {metrics.overtimeHours} hours of overtime. Great dedication!
                  </p>
                </div>
              )}

              {Number.parseFloat(metrics.completionRate) < 80 && (
                <div
                  className={`p-4 rounded-lg ${isDarkMode ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}
                >
                  <p className={`text-sm font-medium ${isDarkMode ? "text-red-400" : "text-red-700"}`}>
                    Some days have incomplete clock records. Make sure to clock in and out properly.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
