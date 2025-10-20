import { useState, useEffect } from 'react'

const ImageWithLoading = ({ 
  src, 
  alt, 
  className = "", 
  containerClassName = "",
  showMiniSpinner = true,
  isDarkMode = false
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)

  // Preload image before displaying
  useEffect(() => {
    if (!src) return

    setIsLoading(true)
    setHasError(false)

    const img = new Image()
    
    img.onload = () => {
      // Image fully loaded
      setImageSrc(src)
      setIsLoading(false)
    }
    
    img.onerror = () => {
      // Image failed to load
      setIsLoading(false)
      setHasError(true)
    }

    // Start loading
    img.src = src

    // Cleanup
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return (
    <div className={`relative ${containerClassName}`}>
      {/* Loading Spinner - Shows until image is fully loaded */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
          {showMiniSpinner ? (
            <MiniGearSpinner isDarkMode={isDarkMode} />
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Center Large Gear */}
              <svg
                className="w-28 h-28 animate-spin"
                style={{ animationDuration: '3s', animationDirection: 'reverse' }}
                viewBox="0 0 140 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="translate(70, 70)">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 360) / 12;
                    return (
                      <rect
                        key={i}
                        x="-8"
                        y="-55"
                        width="16"
                        height="20"
                        fill="#546E7A"
                        transform={`rotate(${angle})`}
                      />
                    );
                  })}
                  <circle cx="0" cy="0" r="45" fill={isDarkMode ? "#64748B" : "#546E7A"} />
                  <circle cx="0" cy="0" r="28" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="4" />
                  <circle cx="0" cy="0" r="28" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
                </g>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
          <div className="text-center text-zinc-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load</p>
          </div>
        </div>
      )}

      {/* Actual Image - Only renders when loaded */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} transition-opacity duration-500 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
    </div>
  )
}

// ============================================================================
// Mini Gear Spinner - Compact version for individual images
// ============================================================================
const MiniGearSpinner = ({ isDarkMode = false }) => {
  return (
    <div className="relative flex items-center justify-center">
      <svg
        className="w-12 h-12 animate-spin"
        style={{ animationDuration: '2s' }}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(60, 60)">
          {[...Array(8)].map((_, i) => {
            const angle = (i * 360) / 8;
            return (
              <rect
                key={i}
                x="-6"
                y="-40"
                width="12"
                height="15"
                fill={isDarkMode ? "#64748B" : "#546E7A"}
                transform={`rotate(${angle})`}
              />
            );
          })}
          <circle cx="0" cy="0" r="32" fill={isDarkMode ? "#64748B" : "#546E7A"} />
          <circle cx="0" cy="0" r="20" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="3" />
          <circle cx="0" cy="0" r="20" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
        </g>
      </svg>
    </div>
  )
}

export default ImageWithLoading