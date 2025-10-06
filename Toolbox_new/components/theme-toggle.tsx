import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button } from "./ui/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="h-9 w-9 relative"
      title={`Current theme: ${theme === "system" ? `system (${resolvedTheme})` : theme}`}
    >
      {/* Light mode icon */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      
      {/* Dark mode icon */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      
      {/* System mode indicator */}
      {theme === "system" && (
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-background" />
      )}
      
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  )
}
