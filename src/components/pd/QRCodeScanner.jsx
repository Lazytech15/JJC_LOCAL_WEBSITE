"use client"

import { useState, useRef, useEffect } from "react"

function QRCodeScanner({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState("")
  const [manualInput, setManualInput] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
      }
    } catch (err) {
      setError("Camera access denied or not available. Please use manual input.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualInput.trim()) {
      onScan(manualInput.trim())
    }
  }

  // Mock QR code detection - in real implementation, use html5-qrcode or qr-scanner
  const simulateQRDetection = () => {
    // Simulate finding a QR code with item number
    const mockItemNo = Math.floor(Math.random() * 1000) + 1
    onScan(mockItemNo.toString())
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">QR Code Scanner</h2>

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Camera Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Camera Scanner</h3>

            {!isScanning ? (
              <div className="text-center">
                <div className="bg-gray-100 rounded-lg p-8 mb-4">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-600">Click to start camera</p>
                </div>
                <button
                  onClick={startCamera}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Start Camera
                </button>
              </div>
            ) : (
              <div className="text-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-48 bg-black rounded-lg mb-4" />
                <div className="flex gap-2">
                  <button
                    onClick={simulateQRDetection}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Simulate Scan
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Manual Input</h3>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter item number or QR code data"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Process Input
              </button>
            </form>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Point camera at QR code to scan automatically</li>
              <li>• Use manual input if camera is not available</li>
              <li>• Enter item number to quickly find items</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeScanner
