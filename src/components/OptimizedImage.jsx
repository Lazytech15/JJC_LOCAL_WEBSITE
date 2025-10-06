import { useState, useEffect } from 'react'

/**
 * OptimizedImage Component
 * Provides WebP support with fallback, lazy loading, and proper dimensions for CLS prevention
 * 
 * @param {string} src - Image source path
 * @param {string} alt - Alternative text for accessibility
 * @param {number} width - Image width (required for CLS)
 * @param {number} height - Image height (required for CLS)
 * @param {string} className - Additional CSS classes
 * @param {boolean} priority - If true, loads immediately (for LCP images)
 * @param {string} objectFit - CSS object-fit property (cover, contain, fill, etc.)
 */
export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  objectFit = 'cover'
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)
  
  // Generate WebP version of the image path
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  
  // Calculate aspect ratio for proper sizing
  const aspectRatio = height && width ? (height / width) * 100 : 0
  
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        maxWidth: width ? `${width}px` : '100%',
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
      }}
    >
      <picture>
        {/* WebP source for modern browsers */}
        <source srcSet={webpSrc} type="image/webp" />
        
        {/* Fallback for browsers that don't support WebP */}
        <img 
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={`
            absolute inset-0 w-full h-full transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            objectFit: objectFit,
          }}
        />
      </picture>
      
      {/* Loading skeleton */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-slate-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
      )}
    </div>
  )
}

/**
 * OptimizedBackgroundImage Component
 * For background images with WebP support
 */
export function OptimizedBackgroundImage({ 
  src, 
  className = '', 
  children,
  priority = false 
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  
  useEffect(() => {
    if (!priority) return
    
    // Preload the image
    const img = new Image()
    img.src = webpSrc
    img.onload = () => setIsLoaded(true)
    img.onerror = () => {
      // Fallback to original format
      const fallbackImg = new Image()
      fallbackImg.src = src
      fallbackImg.onload = () => setIsLoaded(true)
    }
  }, [webpSrc, src, priority])
  
  return (
    <div 
      className={`relative ${className}`}
      style={{
        backgroundImage: `url(${webpSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {!isLoaded && !priority && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
      {children}
    </div>
  )
}

export default OptimizedImage
