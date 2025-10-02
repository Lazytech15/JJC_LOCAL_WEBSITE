"use client"

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
  Menu,
  X,
  Wifi,
  WifiOff,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
} from "lucide-react"
import { Button } from "../ui/UiComponents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/UiComponents"
import { Avatar, AvatarFallback } from "../ui/UiComponents"
import { Badge } from "../ui/UiComponents"
import { useAuth } from "../../contexts/AuthContext"
import { useOnlineStatus } from "../../hooks/use-online-status"
import { useServiceWorker } from "../../hooks/use-service-worker"
import { clearTokens } from "../../utils/auth"

export default function EmployeeDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
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
    // Clear all stored tokens
    clearTokens()
    
    // Clear session storage
    sessionStorage.clear()
    
    // Update context state
    if (employeeLogout) {
      employeeLogout()
    }
    
    // Navigate to login (replace prevents going back)
    navigate("/employee/login", { replace: true })
  }

  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "announcements", icon: Bell, label: "Announcements", badge: unreadCount },
    { id: "profile", icon: User, label: "My Profile" },
    { id: "attendance", icon: Clock, label: "Time & Attendance" },
    { id: "performance", icon: BarChart3, label: "Performance" },
    { id: "settings", icon: Settings, label: "Settings" },
  ]

  const stats = [
    { label: "Attendance Rate", value: "98%", icon: CheckCircle2, color: "primary" },
    { label: "Tasks Completed", value: "24", icon: TrendingUp, color: "secondary" },
    { label: "Team Members", value: "12", icon: Users, color: "primary" },
    { label: "Days Active", value: "156", icon: Calendar, color: "secondary" },
  ]

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-gray-900" : "bg-white"}`}>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="bg-primary text-primary-foreground px-4 py-3 text-center">
          <span className="text-sm font-medium">A new version is available. </span>
          <button onClick={updateServiceWorker} className="underline font-semibold">
            Update now
          </button>
        </div>
      )}

      <header
        className={`sticky top-0 z-40 border-b shadow-sm ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-foreground"}`}>
              JJC Employee Portal
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold ${
                isOnline
                  ? connectionQuality === "good"
                    ? "bg-primary/10 text-primary-foreground"
                    : "bg-secondary/10 text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? (connectionQuality === "good" ? "Online" : "Slow") : "Offline"}
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>

            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {employee?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 border-r transition-transform duration-300 ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-muted/30 border-border"
          } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div className="flex flex-col h-full">
            <div className={`p-6 border-b ${isDarkMode ? "border-gray-700" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base">
                    {employee?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-base ${isDarkMode ? "text-white" : "text-foreground"}`}>
                    {employee?.name}
                  </p>
                  <p className={`text-sm truncate ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                    {employee?.position}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                      isActive
                        ? isDarkMode
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-primary text-primary-foreground shadow-md"
                        : isDarkMode
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge > 0 && (
                      <Badge className="ml-auto bg-secondary text-secondary-foreground">{item.badge}</Badge>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className={`p-4 border-t space-y-2 ${isDarkMode ? "border-gray-700" : "border-border"}`}>
              <Button variant="ghost" className="w-full justify-start font-medium" onClick={toggleDarkMode}>
                <Settings className="w-5 h-5 mr-3" />
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-secondary hover:text-secondary hover:bg-secondary/10 font-medium"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-foreground"}`}>
                  Welcome back, {employee?.name?.split(" ")[0]}!
                </h2>
                <p className={`text-base mt-1 ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon
                  const isGreen = stat.color === "primary"
                  return (
                    <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}
                            >
                              {stat.label}
                            </p>
                            <p className={`text-3xl font-bold mt-2 ${isDarkMode ? "text-white" : "text-foreground"}`}>
                              {stat.value}
                            </p>
                          </div>
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                              isGreen ? "bg-primary" : "bg-secondary"
                            }`}
                          >
                            <Icon
                              className={`w-7 h-7 ${isGreen ? "text-primary-foreground" : "text-secondary-foreground"}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Recent Announcements</CardTitle>
                  <CardDescription className="text-base">Stay updated with the latest company news</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`p-5 rounded-xl border transition-all cursor-pointer ${
                          isDarkMode ? "border-gray-700 hover:bg-gray-800" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold ${isDarkMode ? "text-white" : "text-foreground"}`}>
                                {announcement.title}
                              </p>
                              {!announcement.read && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                            </div>
                            <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                              {announcement.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-6">
              <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-foreground"}`}>Announcements</h2>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className={`font-semibold text-lg ${isDarkMode ? "text-white" : "text-foreground"}`}>
                              {announcement.title}
                            </p>
                            {!announcement.read && <Badge className="bg-primary text-primary-foreground">New</Badge>}
                          </div>
                          <p className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
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
              <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-foreground"}`}>My Profile</h2>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <label
                        className={`text-sm font-semibold ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}
                      >
                        Employee ID
                      </label>
                      <p className={`mt-2 text-lg ${isDarkMode ? "text-white" : "text-foreground"}`}>
                        {employee?.employeeId}
                      </p>
                    </div>
                    <div>
                      <label
                        className={`text-sm font-semibold ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}
                      >
                        Department
                      </label>
                      <p className={`mt-2 text-lg ${isDarkMode ? "text-white" : "text-foreground"}`}>
                        {employee?.department}
                      </p>
                    </div>
                    <div>
                      <label
                        className={`text-sm font-semibold ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}
                      >
                        Position
                      </label>
                      <p className={`mt-2 text-lg ${isDarkMode ? "text-white" : "text-foreground"}`}>
                        {employee?.position}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}