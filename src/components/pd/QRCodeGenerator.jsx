"use client"

import { useState, useEffect, useRef } from "react"

function QRCodeGenerator({ item, onClose }) {
  const [qrCodeData, setQrCodeData] = useState("")
  const canvasRef = useRef(null)

  useEffect(() => {
    if (item) {
      // Create QR code data with item information
      const qrData = JSON.stringify({
        item_no: item.item_no,
        item_name: item.item_name,
        location: item.location,
        balance: item.balance,
      })
      setQrCodeData(qrData)
      generateQRCode(qrData)
    }
  }, [item])

  const generateQRCode = (data) => {
    // Mock QR code generation - in real implementation, use qrcode library
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")

      // Clear canvas
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, 200, 200)

      // Create a simple pattern to represent QR code
      ctx.fillStyle = "black"
      const size = 10
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if ((i + j) % 3 === 0 || (i * j) % 7 === 0) {
            ctx.fillRect(i * size, j * size, size, size)
          }
        }
      }

      // Add corner markers
      ctx.fillRect(0, 0, 30, 30)
      ctx.fillRect(170, 0, 30, 30)
      ctx.fillRect(0, 170, 30, 30)

      ctx.fillStyle = "white"
      ctx.fillRect(10, 10, 10, 10)
      ctx.fillRect(180, 10, 10, 10)
      ctx.fillRect(10, 180, 10, 10)
    }
  }

  const downloadQRCode = () => {
    const canvas = canvasRef.current
    const link = document.createElement("a")
    link.download = `qr-code-${item.item_no}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const printQRCode = () => {
    const canvas = canvasRef.current
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${item.item_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
            }
            .qr-container { 
              border: 2px solid #000; 
              padding: 20px; 
              display: inline-block; 
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${item.item_name}</h2>
            <img src="${canvas.toDataURL()}" alt="QR Code" />
            <p>Item #: ${item.item_no}</p>
            <p>Location: ${item.location || "N/A"}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">QR Code Generator</h2>

          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{item.item_name}</h3>
            <p className="text-gray-600">Item #{item.item_no}</p>
          </div>

          <div className="flex justify-center mb-6">
            <canvas ref={canvasRef} width={200} height={200} className="border border-gray-300 rounded-lg" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">QR Code Data:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{qrCodeData}</pre>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadQRCode}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Download
            </button>
            <button
              onClick={printQRCode}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRCodeGenerator
