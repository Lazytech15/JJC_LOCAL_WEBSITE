import { Card, CardContent } from "../../ui/UiComponents"
import { Badge } from "../../ui/UiComponents"

export default function Announcements({ announcements, isDarkMode }) {
  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
        Announcements
      </h2>
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold text-lg ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                      {announcement.title}
                    </p>
                    {!announcement.read && (
                      <Badge className="bg-red-500 text-white">New</Badge>
                    )}
                  </div>
                  <p className={`text-sm mt-2 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    {announcement.time}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}