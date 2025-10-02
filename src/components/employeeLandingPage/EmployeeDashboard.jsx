import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Home,
  Bell,
  User,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "../ui/UiComponents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/UiComponents"
import { Avatar, AvatarFallback } from "../ui/UiComponents"
import { Badge } from "../ui/UiComponents"
import { useAuth } from "../../contexts/AuthContext"
import { useOnlineStatus } from "../../hooks/use-online-status"
import { useServiceWorker } from "../../hooks/use-service-worker"
import { clearTokens } from "../../utils/auth"
import logo from "../../assets/companyLogo.jpg"

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: "Safety Training Tomorrow", time: "2 hours ago", read: false },
    { id: 2, title: "New Project Assignment", time: "5 hours ago", read: false },
    { id: 3, title: "Monthly Meeting Schedule", time: "1 day ago", read: true },
  ])

  const navigate = useNavigate()
  const { employee, employeeLogout, isDarkMode, toggleDarkMode } = useAuth()
  const { isOnline, connectionQuality } = useOnlineStatus()
  const { updateAvailable, updateServiceWorker } = useServiceWorker()

  const unreadCount = announcements.filter((a) => !a.read).length

  const handleLogout = () => {
    clearTokens()
    sessionStorage.clear()
    if (employeeLogout) {
      employeeLogout()
    }
    navigate("/employee/login", { replace: true })
  }

  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "announcements", icon: Bell, label: "Announcements", badge: unreadCount },
    { id: "attendance", icon: Clock, label: "Attendance" },
    { id: "performance", icon: BarChart3, label: "Performance" },
    { id: "profile", icon: User, label: "Profile" },
  ]

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
    <div className={`min-h-screen pb-20 lg:pb-0 ${isDarkMode ? "bg-zinc-950" : "bg-zinc-50"}`}>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="bg-zinc-900 text-white px-4 py-3 text-center text-sm">
          <span>A new version is available. </span>
          <button onClick={updateServiceWorker} className="underline font-semibold">
            Update now
          </button>
        </div>
      )}

      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-lg ${isDarkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-zinc-200"
          }`}
      >
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="JJC Engineering Works Logo"
                className="w-12 h-12 rounded-xl object-cover shadow-md bg-primary"
              />
              <h1 className={`text-lg font-bold hidden sm:block ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                JJC Portal
              </h1>
            </div>

            {/* Centered Desktop Navigation */}
            <div className="hidden lg:block border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}">
              <div className="flex items-center justify-center py-3">
                <nav className={`inline-flex items-center gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${isActive
                            ? "bg-white text-zinc-900 shadow-md"
                            : isDarkMode
                              ? "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-300/50"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {isActive && <span>{item.label}</span>}
                        {isActive && item.badge > 0 && (
                          <Badge className="ml-1 bg-red-500 text-white">{item.badge}</Badge>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <div className="absolute top-7 flex items-center right-44 lg:right-36">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-600" : "bg-red-500"}`}></span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={`relative lg:hidden ${isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                onClick={() => setActiveTab("announcements")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="focus:outline-none"
                >
                  <Avatar className={`w-9 h-9 ring-2 cursor-pointer hover:ring-4 transition-all ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                    <AvatarFallback className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}>
                      {employee?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                      }`}>
                      <div className={`p-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className={`w-12 h-12 ring-2 ${isDarkMode ? "ring-zinc-800" : "ring-zinc-200"}`}>
                            <AvatarFallback className={`${isDarkMode ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white"} text-sm font-semibold`}>
                              {employee?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
                              {employee?.name}
                            </p>
                            <p className={`text-xs truncate ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                              {employee?.position}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            setActiveTab("profile")
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm font-medium">View Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            handleLogout()
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-zinc-800 text-red-400" : "hover:bg-zinc-100 text-red-600"
                            }`}
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
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
        )}

        {activeTab === "announcements" && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Announcements</h2>
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
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>My Profile</h2>
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
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Time & Attendance</h2>
            <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              <CardContent className="p-8 text-center">
                <Clock className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-zinc-700" : "text-zinc-300"}`} />
                <p className={`text-lg ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Attendance tracking coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>Performance</h2>
            <Card className={`border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              <CardContent className="p-8 text-center">
                <BarChart3 className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-zinc-700" : "text-zinc-300"}`} />
                <p className={`text-lg ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                  Performance metrics coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t backdrop-blur-lg ${isDarkMode ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-zinc-200"
          }`}
      >
        <div className="flex items-center justify-around px-2 py-3 safe-area-inset-bottom">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-0 flex-1"
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${isActive
                        ? isDarkMode ? "text-white" : "text-zinc-900"
                        : isDarkMode ? "text-zinc-500" : "text-zinc-400"
                      }`}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium truncate w-full text-center ${isActive
                      ? isDarkMode ? "text-white" : "text-zinc-900"
                      : isDarkMode ? "text-zinc-500" : "text-zinc-400"
                    }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full ${isDarkMode ? "bg-white" : "bg-zinc-900"
                    }`} />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}