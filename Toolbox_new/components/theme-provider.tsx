import * as React from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  resolvedTheme: "dark",
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "toolbox-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage?.getItem(storageKey) as Theme) || defaultTheme
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = React.useState<"dark" | "light">("dark")

  React.useEffect(() => {
    const root = window.document.documentElement

    console.log("ThemeProvider useEffect running")
    console.log("Current theme:", theme)
    console.log("Current HTML classes:", root.className)

    // Remove both classes first
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      console.log("System theme detected:", systemTheme)
      root.classList.add(systemTheme)
      setResolvedTheme(systemTheme)
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light"
        console.log("System theme changed to:", newTheme)
        root.classList.remove("light", "dark")
        root.classList.add(newTheme)
        setResolvedTheme(newTheme)
      }
      
      mediaQuery.addEventListener("change", handleChange)
      return () => {
        mediaQuery.removeEventListener("change", handleChange)
      }
    } else {
      console.log("Applying theme:", theme)
      root.classList.add(theme)
      setResolvedTheme(theme)
      console.log("HTML classes after apply:", root.className)
    }

    return undefined
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => {
      console.log("Setting theme to:", newTheme)
      localStorage?.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
