import { useEffect, useRef } from "react"
import bwipjs from "bwip-js"

function BarcodeGenerator({ item, isOpen, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (isOpen && item && canvasRef.current) {
      try {
        // Generate Code 128 barcode using bwip-js
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',       // Barcode type
          text: item.item_no.toString(),    // Text to encode
          scale: 3,               // 3x scaling factor
          height: 10,             // Bar height, in millimeters
          includetext: true,      // Show human-readable text
          textxalign: 'center',   // Always good to set this
          textfont: 'Helvetica', // Use a standard font
          textsize: 13,          // Font size for human readable text
          backgroundcolor: 'ffffff', // Background color (white)
          color: '000000',       // Foreground color (black)
          paddingwidth: 10,      // Padding on left and right
          paddingheight: 5,      // Padding on top and bottom
        })
      } catch (error) {
        console.error("Error generating barcode:", error)
        
        // Fallback: Try with different settings or show error
        try {
          bwipjs.toCanvas(canvasRef.current, {
            bcid: 'code128',
            text: item.item_no.toString(),
            scale: 2,
            height: 8,
            includetext: true,
            textxalign: 'center',
          })
        } catch (fallbackError) {
          console.error("Fallback barcode generation failed:", fallbackError)
          // Could display an error message to user here
        }
      }
    }
  }, [isOpen, item])

  const downloadBarcode = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const link = document.createElement("a")
      link.download = `Barcode-${item.item_no}-${item.item_name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      link.href = canvas.toDataURL("image/png", 1.0) // Maximum quality
      link.click()
    }
  }

  const printBarcode = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode - ${item.item_name}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .barcode-container {
                text-align: center;
                border: 2px solid #000;
                padding: 20px;
                margin: 20px;
                background: white;
                page-break-inside: avoid;
              }
              .item-info {
                margin-bottom: 15px;
                font-size: 14px;
                font-weight: bold;
              }
              img {
                margin: 10px 0;
                max-width: 100%;
                height: auto;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                .no-print { display: none; }
                .barcode-container {
                  border: 1px solid #000;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <div class="item-info">
                <div>${item.item_name}</div>
                <div>Brand: ${item.brand || 'N/A'}</div>
                <div>Type: ${item.item_type || 'N/A'}</div>
                <div>Location: ${item.location || 'N/A'}</div>
              </div>
              <img src="${canvas.toDataURL('image/png', 1.0)}" alt="Barcode for ${item.item_name}" />
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  // Generate a test barcode for different formats
  const generateTestBarcode = async (format = 'code128') => {
    if (canvasRef.current && item) {
      try {
        const options = {
          text: item.item_no.toString(),
          includetext: true,
          textxalign: 'center',
          scale: 3,
          backgroundcolor: 'ffffff',
          color: '000000',
          paddingwidth: 10,
          paddingheight: 5,
        }

        switch (format) {
          case 'code128':
            options.bcid = 'code128'
            options.height = 10
            break
          case 'code39':
            options.bcid = 'code39'
            options.height = 10
            break
          case 'ean13':
            // EAN13 requires exactly 12 digits (13th is checksum)
            if (item.item_no.toString().length === 12) {
              options.bcid = 'ean13'
              options.height = 8
            } else {
              throw new Error('EAN13 requires 12 digits')
            }
            break
          case 'upca':
            // UPC-A requires exactly 11 digits (12th is checksum)
            if (item.item_no.toString().length === 11) {
              options.bcid = 'upca'
              options.height = 8
            } else {
              throw new Error('UPC-A requires 11 digits')
            }
            break
          default:
            options.bcid = 'code128'
            options.height = 10
        }

        await bwipjs.toCanvas(canvasRef.current, options)
      } catch (error) {
        console.error(`Error generating ${format} barcode:`, error)
        // Fallback to Code 128
        if (format !== 'code128') {
          generateTestBarcode('code128')
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generate Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center space-y-4">
          {/* Item Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{item?.item_name}</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Brand: {item?.brand || 'N/A'}</div>
              <div>Type: {item?.item_type || 'N/A'}</div>
              <div>Location: {item?.location || 'N/A'}</div>
              <div>Item #: {item?.item_no}</div>
            </div>
          </div>

          {/* Barcode Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Barcode Format:</label>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => generateTestBarcode('code128')}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
              >
                Code 128
              </button>
              <button
                onClick={() => generateTestBarcode('code39')}
                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors"
              >
                Code 39
              </button>
              {item?.item_no?.toString().length === 12 && (
                <button
                  onClick={() => generateTestBarcode('ean13')}
                  className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md transition-colors"
                >
                  EAN-13
                </button>
              )}
              {item?.item_no?.toString().length === 11 && (
                <button
                  onClick={() => generateTestBarcode('upca')}
                  className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors"
                >
                  UPC-A
                </button>
              )}
            </div>
          </div>

          {/* Barcode Display */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            High-quality barcode using bwip-js - Compatible with all standard scanners
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={downloadBarcode}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Download PNG
          </button>
          <button
            onClick={printBarcode}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Print Label
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default BarcodeGenerator