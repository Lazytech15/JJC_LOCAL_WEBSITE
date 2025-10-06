import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button } from "./ui/button"
import { useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)
  const isDark = resolvedTheme === "dark"

  const toggleTheme = () => {
    console.log("Current theme:", theme, "Resolved:", resolvedTheme)
    
    // Trigger animation
    setIsAnimating(true)
    
    // Simple toggle: dark <-> light
    if (resolvedTheme === "dark") {
      console.log("Switching to light")
      setTheme("light")
    } else {
      console.log("Switching to dark")
      setTheme("dark")
    }
    
    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 500)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`h-9 w-9 relative overflow-hidden transition-all duration-300 ${
        isAnimating 
          ? 'scale-90 rotate-180' 
          : 'scale-100 rotate-0'
      } hover:bg-slate-200/50 dark:hover:bg-slate-700/50`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sun icon - visible in DARK mode (shows what you'll switch TO) */}
      <Sun 
        className={`h-[1.3rem] w-[1.3rem] absolute transition-all duration-500 ease-in-out ${
          isDark 
            ? 'rotate-0 scale-100 opacity-100 text-amber-500' 
            : 'rotate-90 scale-0 opacity-0 text-amber-500'
        }`} 
      />
      
      {/* Moon icon - visible in LIGHT mode (shows what you'll switch TO) */}
      <Moon 
        className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-500 ease-in-out ${
          !isDark 
            ? 'rotate-0 scale-100 opacity-100 text-indigo-600' 
            : '-rotate-90 scale-0 opacity-0 text-indigo-600'
        }`} 
      />
      
      {/* Animated ring effect on click */}
      {isAnimating && (
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 opacity-20 animate-ping" />
      )}
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
