"use client"

import { useEffect, useRef } from 'react'
import { useToast } from '../hooks/use-toast'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './ui/toast'
import { CheckCircle, AlertCircle, XCircle, Info, Loader2 } from 'lucide-react'

// Define our custom toast type
type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

// Enhanced toast styling and icons
const getToastStyling = (toastType?: string) => {
  switch (toastType) {
    case 'success':
      return {
        icon: CheckCircle,
        className: "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/90 text-green-900 dark:text-green-100 backdrop-blur-md"
      }
    case 'error':
      return {
        icon: XCircle,
        className: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-100 backdrop-blur-md"
      }
    case 'warning':
      return {
        icon: AlertCircle,
        className: "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/90 text-yellow-900 dark:text-yellow-100 backdrop-blur-md"
      }
    case 'loading':
      return {
        icon: Loader2,
        className: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100 backdrop-blur-md"
      }
    default:
      return {
        icon: Info,
        className: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100 backdrop-blur-md"
      }
  }
}

export function EnhancedToaster() {
  const { toasts } = useToast()
  const prevToastsRef = useRef<typeof toasts>([])

  useEffect(() => {
    prevToastsRef.current = toasts
  }, [toasts])

  return (
    <ToastProvider swipeDirection="right" duration={4000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Check if this is a custom enhanced toast
        const toastType = (props as any).toastType as string
        const styling = getToastStyling(toastType)
        const IconComponent = styling.icon
        
        return (
          <Toast 
            key={id} 
            variant={variant}
            {...props}
            className={`${styling.className} shadow-xl transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl animate-in slide-in-from-right-full fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0 pointer-events-auto`}
          >
            <div className="flex items-start gap-3 w-full pr-8">
              <div className="flex-shrink-0 mt-0.5 transition-transform duration-300 ease-out">
                <IconComponent 
                  className={`h-5 w-5 ${
                    toastType === 'loading' ? 'animate-spin' : 'animate-in zoom-in-50 duration-300'
                  }`} 
                />
              </div>
              
              <div className="flex-1 space-y-1 min-w-0">
                {title && <ToastTitle className="font-semibold text-sm break-words">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-sm opacity-90 break-words">
                    {description}
                  </ToastDescription>
                )}
              </div>
              
              {action && <div className="flex-shrink-0">{action}</div>}
            </div>
            
            <ToastClose className="hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 hover:scale-110" />
          </Toast>
        )
      })}
      
      <ToastViewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-20 sm:right-4 sm:max-w-[420px] md:max-w-[480px] sm:flex-col gap-2 pointer-events-none" />
    </ToastProvider>
  )
}

// Enhanced toast helper functions using custom props
export const enhancedToast = {
  success: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'success',
      duration: 4000,
    } as any)
  },
  
  error: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: 'destructive',
      toastType: 'error',
      duration: 6000,
    } as any)
  },
  
  warning: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'warning',
      duration: 5000,
    } as any)
  },
  
  info: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'info',
      duration: 4000,
    } as any)
  },
  
  loading: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'loading',
      duration: 0, // Don't auto-dismiss loading toasts
    } as any)
  }
}

// Usage example helper
export const createActionToast = (
  title: string,
  description: string,
  actionText: string,
  onAction: () => void,
  toastType: EnhancedToastType = 'info'
) => {
  const { toast } = useToast()
  
  return toast({
    title,
    description,
    toastType,
    variant: toastType === 'error' ? 'destructive' : 'default',
    action: (
      <button
        onClick={onAction}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {actionText}
      </button>
    ),
    duration: 8000,
  } as any)
}