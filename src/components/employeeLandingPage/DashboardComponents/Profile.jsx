import { ArrowLeft } from "lucide-react"
import { Button } from "../../ui/UiComponents"
import { Card, CardContent } from "../../ui/UiComponents"
import { Avatar, AvatarFallback } from "../../ui/UiComponents"

export default function Profile({ employee, handleLogout, isDarkMode }) {
  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
        My Profile
      </h2>
      <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <Avatar className={`w-24 h-24 ring-4 mb-4 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
              <AvatarFallback className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-3xl font-bold`}>
                {employee?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              {employee?.name}
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {employee?.position}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"
                }`}>
                Employee ID
              </label>
              <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {employee?.employeeId}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50"}`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-zinc-400" : "text-zinc-600"
                }`}>
                Department
              </label>
              <p className={`mt-2 text-lg font-semibold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                {employee?.department}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={`w-full sm:w-auto lg:hidden ${isDarkMode ? "border-zinc-800 text-zinc-400 hover:text-white" : ""}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}