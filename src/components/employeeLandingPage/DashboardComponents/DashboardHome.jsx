import {
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/UiComponents"

export default function DashboardHome({ employee, announcements, isDarkMode }) {
  const stats = [
    { label: "Attendance Rate", value: "98%", icon: CheckCircle2, color: "emerald" },
    { label: "Tasks Completed", value: "24", icon: TrendingUp, color: "blue" },
    { label: "Team Members", value: "12", icon: Users, color: "violet" },
    { label: "Days Active", value: "156", icon: Calendar, color: "amber" },
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
                    <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"
                      }`}>
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
              className={`p-4 rounded-xl border transition-all cursor-pointer ${isDarkMode
                  ? "border-zinc-800 hover:bg-zinc-800/50"
                  : "border-zinc-200 hover:bg-zinc-50"
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                      {announcement.title}
                    </p>
                    {!announcement.read && (
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
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