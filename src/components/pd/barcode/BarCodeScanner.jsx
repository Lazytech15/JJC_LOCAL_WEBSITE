import { useState, useEffect, useRef } from "react"

function BarcodeScanner({ isOpen, onClose, onScan }) {
  const [manualInput, setManualInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize camera when scanner opens
  useEffect(() => {
    if (isOpen && scanning) {
      initializeCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, scanning])

  // Focus on manual input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  const initializeCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Camera access error:", err)
      setError("Unable to access camera. Please use manual input or check camera permissions.")
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  const handleManualScan = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      setManualInput("")
      handleClose()
    }
  }

  const handleClose = () => {
    setScanning(false)
    setManualInput("")
    setError(null)
    stopCamera()
    onClose()
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleManualScan()
    }
  }

  // Simulated barcode detection (in a real app, you'd use a barcode scanning library)
  const simulateBarcodeDetection = () => {
    // This is a placeholder - in reality you'd integrate with a barcode scanning library
    // like QuaggaJS, ZXing, or similar
    // For now, we'll prompt for a manual item number
    const itemNumber = prompt("Enter item number to simulate scan:")
    if (itemNumber) {
      onScan(itemNumber.trim())
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black dark:text-white">Scan Barcode</h3>
          <button
            onClick={handleClose}
            className="text-black hover:text-black dark:text-black dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Camera Scanner Section */}
          <div className="text-center">
            {!scanning ? (
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-black dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                    </svg>
                  </div>
                  <p className="text-black dark:text-gray-400 mb-4">
                    Use your camera to scan Code 128 barcodes
                  </p>
                  <button
                    onClick={() => setScanning(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                  >
                    Start Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {error ? (
                  <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                    <p className="text-black dark:text-red-400 text-sm">{error}</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-48 object-cover rounded"
                    />
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-green-400 bg-green-400/10 w-48 h-20 rounded-lg relative">
                        <div className="absolute inset-0 border border-green-400 rounded-lg animate-pulse" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-400 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-white text-sm mt-2">Position barcode within the frame</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={simulateBarcodeDetection}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                  >
                    Simulate Scan (Demo)
                  </button>
                  <button
                    onClick={() => {
                      setScanning(false)
                      stopCamera()
                    }}
                    className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-black dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="px-3 text-sm text-black dark:text-gray-400 bg-white dark:bg-gray-800">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Manual Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
                Enter Item Number Manually
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter item number..."
                  className="flex-1 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handleManualScan}
                  disabled={!manualInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Scan
                </button>
              </div>
            </div>

            <div className="text-xs text-black dark:text-gray-400 space-y-1">
              <p>• Compatible with Code 128 barcodes</p>
              <p>• Optimized for Goojprt printer barcodes</p>
              <p>• Enter the item number from the barcode label</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-black dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner