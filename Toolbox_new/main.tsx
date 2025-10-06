import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app/page"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/error-boundary"
import { KeyboardShortcuts } from "./components/keyboard-shortcuts"
import { LoadingProvider } from "./components/loading-context"
import "./app/globals.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="toolbox-theme">
        <LoadingProvider>
          <KeyboardShortcuts />
          <App />
        </LoadingProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
