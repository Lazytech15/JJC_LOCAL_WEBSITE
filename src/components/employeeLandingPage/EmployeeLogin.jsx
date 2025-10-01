"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Factory, Loader2, Wifi, WifiOff } from "lucide-react"
import { Button } from "../ui/UiComponents"
import { Input } from "../ui/UiComponents"
import { Label } from "../ui/UiComponents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/UiComponents"
import { Checkbox } from "../ui/UiComponents"
import { useAuth } from "../../contexts/AuthContext"
import { useOnlineStatus } from "../../hooks/use-online-status"

export default function EmployeeLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const { employeeLogin } = useAuth()
  const { isOnline } = useOnlineStatus()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const employeeData = {
        id: "emp-001",
        username,
        name: "John Doe",
        employeeId: "JJC-2024-001",
        department: "Engineering",
        position: "Senior Engineer",
        loginTime: new Date().toISOString(),
      }

      employeeLogin(employeeData, rememberMe)
      navigate("/employee/dashboard")
    } catch (err) {
      setError("Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-4 shadow-lg">
            <Factory className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">JJC Engineering Works</h1>
          <p className="text-muted-foreground text-lg">Employee Portal</p>
        </div>

        <div className="mb-6">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
              isOnline ? "bg-primary/10 text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            <span className="text-sm font-medium">{isOnline ? "Connected" : "Offline Mode"}</span>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-base">Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl">
                  <p className="text-sm text-secondary-foreground font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-base">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={setRememberMe} disabled={isLoading} />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Keep me signed in
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
