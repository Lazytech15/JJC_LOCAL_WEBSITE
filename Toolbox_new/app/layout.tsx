import type React from "react"
import { ThemeProvider } from "../components/theme-provider"
import { ErrorBoundary } from "../components/error-boundary"
import { KeyboardShortcuts } from "../components/keyboard-shortcuts"
import { LoadingProvider } from "../components/loading-context"
import { Suspense } from "react"
import "./globals.css"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Toolbox Inventory" />
        <link rel="apple-touch-icon" href="/ToolBoxlogo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('toolbox-theme') || 'dark';
                const root = document.documentElement;
                
                if (theme === 'system') {
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  root.classList.add(systemTheme);
                } else {
                  root.classList.remove('light', 'dark');
                  root.classList.add(theme);
                }
              } catch (e) {
                root.classList.add('dark');
              }
            `,
          }}
        />
      </head>
      {/* Removed global overflow-hidden to allow proper mobile scrolling and fixed header interaction */}
      <body className="font-sans bg-background text-foreground min-h-screen overflow-x-hidden">
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ThemeProvider defaultTheme="dark" storageKey="toolbox-theme">
              <LoadingProvider>
                <KeyboardShortcuts />
                {children}
              </LoadingProvider>
            </ThemeProvider>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
}
