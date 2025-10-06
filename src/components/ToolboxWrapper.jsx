import '../../Toolbox_new/app/globals.css'
import UserInventory from "../../Toolbox_new/app/page"
import { LoadingProvider } from "../../Toolbox_new/components/loading-context"
import { ThemeProvider } from "../../Toolbox_new/components/theme-provider"
import { ErrorBoundary } from "../../Toolbox_new/components/error-boundary"
import { KeyboardShortcuts } from "../../Toolbox_new/components/keyboard-shortcuts"

export default function ToolboxWrapper() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="toolbox-theme">
        <LoadingProvider>
          <KeyboardShortcuts />
          <div data-app="toolbox" className="min-h-screen">
            <UserInventory />
          </div>
        </LoadingProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
