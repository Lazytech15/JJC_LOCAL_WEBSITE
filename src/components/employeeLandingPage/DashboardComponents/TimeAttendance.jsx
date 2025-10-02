import { Clock } from "lucide-react"
import { Card, CardContent } from "../../ui/UiComponents"

export default function TimeAttendance({ isDarkMode }) {
  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
        Time & Attendance
      </h2>
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-8 text-center">
          <Clock className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-zinc-700" : "text-zinc-300"}`} />
          <p className={`text-lg ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
            Attendance tracking coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  )
}