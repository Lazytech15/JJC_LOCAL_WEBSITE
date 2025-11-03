import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "../components/theme-provider"
import { ErrorBoundary } from "../components/error-boundary"
import { KeyboardShortcuts } from "../components/keyboard-shortcuts"
import { LoadingProvider } from "../components/loading-context"
import { Suspense } from "react"
import "./globals.css"
import dynamic from 'next/dynamic'

// Client-only Global Barcode Listener
const GlobalBarcodeListener = dynamic(() => import('../components/GlobalBarcodeListener.client'), { ssr: false })

export const metadata: Metadata = {
  title: "Toolbox Inventory - Warehouse Management",
  description: "Professional warehouse inventory management system with offline capability for employees",
  generator: "Next.js + PWA",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Toolbox Inventory"
  },
  icons: {
    apple: "/ToolBoxlogo.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "Toolbox Inventory"
  }
}

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
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground overflow-hidden h-screen`}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ThemeProvider defaultTheme="dark" storageKey="toolbox-theme">
              <LoadingProvider>
                <KeyboardShortcuts />
                <GlobalBarcodeListener />
                {children}
              </LoadingProvider>
            </ThemeProvider>
          </Suspense>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
