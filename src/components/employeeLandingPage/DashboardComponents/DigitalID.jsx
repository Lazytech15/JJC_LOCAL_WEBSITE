import { useState, useEffect, useRef } from "react"
import html2canvas from 'html2canvas'

export default function DigitalID({ employee, profileImage, companyLogo, backgroundImage, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const barcodeRef = useRef(null)
  const [barcodeGenerated, setBarcodeGenerated] = useState(false)
  const cardRef = useRef(null)
  
  const employeeName = (employee?.fullName || employee?.name || "N/A").toUpperCase()
  const employeePosition = employee?.position || "N/A"
  const employeeId = employee?.idNumber || "N/A"
  const employeeBarcode = employee?.idBarcode || ""
  
  // Load JsBarcode library and generate barcode
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js'
    script.async = true
    script.onload = () => {
      if (barcodeRef.current && employeeBarcode && window.JsBarcode) {
        try {
          window.JsBarcode(barcodeRef.current, employeeBarcode.toString(), {
            format: "CODE128",
            width: 3,
            height: 80,
            displayValue: false,
            margin: 10
          })
          setBarcodeGenerated(true)
        } catch (error) {
          console.error('Barcode generation error:', error)
        }
      }
    }
    document.body.appendChild(script)
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [employeeBarcode])
  
  // Calculate valid until date (1 year from hire date or current date)
  const calculateValidUntil = () => {
    if (employee?.hireDate && employee.hireDate !== "0000-00-00") {
      const hireDate = new Date(employee.hireDate)
      hireDate.setFullYear(hireDate.getFullYear() + 1)
      return hireDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
    const today = new Date()
    today.setFullYear(today.getFullYear() + 1)
    return today.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const validUntil = calculateValidUntil()
  
  const companyName = "JJC ENGINEERING WORKS & GENERAL SERVICES"
  const companyAddress = "Blk 3 Lot 11 B-C, South Carolina St. Joyous Heights Subdivision, Sitio Hinapao, Brgy. San Jose, Antipolo City, Rizal, Philippines, 1870"
  const terms = `This identification card: (1) Certifies that the bearer is an employee of JJC Engineering Works and General Services; (2) is non-transferable, and; (3) is valid until ${validUntil} only, or unless resigned/terminated from the company.`

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleSave = async () => {
    try {
      if (!cardRef.current) {
        alert('Card not found')
        return
      }

      // Get the card element (front or back depending on flip state)
      const cardElement = cardRef.current.querySelector(isFlipped ? '[data-side="back"]' : '[data-side="front"]')
      
      if (!cardElement) {
        alert('Card element not found')
        return
      }

      // Load dom-to-image library dynamically
      if (!window.domtoimage) {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js'
        script.onload = () => captureWithDomToImage()
        document.head.appendChild(script)
      } else {
        captureWithDomToImage()
      }

      function captureWithDomToImage() {
        window.domtoimage.toPng(cardElement, {
          quality: 1,
          width: cardElement.offsetWidth * 2,
          height: cardElement.offsetHeight * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
            width: cardElement.offsetWidth + 'px',
            height: cardElement.offsetHeight + 'px'
          }
        })
        .then((dataUrl) => {
          const link = document.createElement('a')
          link.href = dataUrl
          link.download = `DigitalID_${employeeId}_${isFlipped ? 'Back' : 'Front'}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          alert(`${isFlipped ? 'Back' : 'Front'} side of ID saved successfully!`)
        })
        .catch((error) => {
          console.error('Save error:', error)
          alert('Failed to save ID card: ' + error.message)
        })
      }

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save ID card: ' + error.message)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-md mx-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Action Buttons */}
        <div className="flex justify-between items-center mb-4 gap-3">
          <button
            onClick={handleSave}
            style={{ backgroundColor: '#3f3f46' }}
            className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 hover:opacity-90 text-white rounded-full font-medium transition-all shadow-lg text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
            Save {isFlipped ? 'Back' : 'Front'}
          </button>
          <button
            onClick={handleFlip}
            style={{ backgroundColor: '#3f3f46' }}
            className="px-4 py-2 sm:px-6 sm:py-2.5 hover:opacity-90 text-white rounded-full font-medium transition-all shadow-lg text-sm sm:text-base"
          >
            Flip Card
          </button>
          <button
            onClick={handleClose}
            style={{ backgroundColor: '#3f3f46' }}
            className="p-2.5 sm:p-3 hover:opacity-90 text-white rounded-full font-medium transition-all shadow-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* ID Card Container with 3D Flip Effect */}
        <div 
          ref={cardRef}
          className="relative cursor-pointer"
          style={{ 
            perspective: '1000px',
            aspectRatio: '2.125/3.375'
          }}
          onClick={handleFlip}
        >
          <div
            className="relative w-full h-full transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front Side */}
            <div
              data-side="front"
              className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                backgroundColor: '#ffffff',
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',        
                backgroundPosition: 'center',   
                backgroundRepeat: 'no-repeat'   
                }}
            >
              <div className="relative h-full">
                {/* White Content Background */}
                <div className="relative h-full flex flex-col">
                  {/* Top Section - Employee Info */}
                  <div className="flex-1 p-3 sm:p-6 pb-2 sm:pb-4">
                    {/* Employee Name and Position */}
                    <div className="mb-2 sm:mb-4 mt-4 sm:mt-8 ml-5">
                      <h2 className="text-sm sm:text-2xl font-bold tracking-wide" style={{ color: '#1f2937' }}>
                        {employeeName}
                      </h2>
                      <p className="text-base sm:text-xl mt-1" style={{ color: '#374151' }}>
                        {employeePosition}
                      </p>
                      <p className="text-lg sm:text-2xl mb-1" style={{ color: '#dc2626' }}>
                        I.D. No. <span className="font-semibold">{employeeId}</span>
                      </p>
                    </div>

                    {/* Photo Container */}
                    <div className="flex justify-center mb-2 sm:mb-4">
                      <div 
                        className="mt-4 sm:mt-10 flex items-center justify-center overflow-hidden rounded-2xl w-32 h-40 sm:w-44 sm:h-52"
                        style={{ 
                          width: '270px', 
                          height: '270px',
                          backgroundColor: '#ffffff',
                          border: '2px solid #d1d5db'
                        }}
                      >
                        {profileImage ? (
                          <img src={profileImage} alt={employeeName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)' }}>
                            <span className="text-2xl sm:text-4xl font-bold" style={{ color: '#2563eb' }}>
                              {employeeName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section - Company Logo and Name (Dark Blue Background) */}
                  <div className="p-2 sm:p-4 flex items-center gap-2 sm:gap-3" style={{ backgroundColor: '#1e3a5f' }}>
                    {/* Company Logo */}
                    <div className="shrink-0 rounded p-1 sm:p-1.5 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                      {companyLogo ? (
                        <img src={companyLogo} alt="Company Logo" className="w-35 h-35 object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: '#e5e7eb', color: '#6b7280' }}>
                          Logo
                        </div>
                      )}
                    </div>

                    {/* Company Name */}
                    <div className="flex-1">
                      <h3 className="font-bold leading-tight califoniaFont" style={{ color: '#ffffff', fontSize: '21px' }}>
                        JJC ENGINEERING WORKS & GENERAL SERVICES
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Side */}
            <div
              data-side="back"
              className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden p-3 sm:p-6"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundColor: '#ffffff',
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',        
                backgroundPosition: 'center',   
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="h-full w-80 sm:w-80 flex flex-col justify-between relative mx-auto">
                <div className="relative space-y-2 sm:space-y-4 z-10 mt-10 sm:mt-10">
                  {/* Terms and Conditions */}
                  <div className="text-sm sm:text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {terms}
                  </div>

                  {/* Company Address */}
                  <div className="text-sm sm:text-sm text-center mt-10 sm:mt-10" style={{ color: '#374151' }}>
                    {companyAddress}
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col items-center py-2 sm:py-4 sm:mt-10 mt-10">
                    {employeeBarcode ? (
                      <>
                        <svg ref={barcodeRef} style={{ backgroundColor: '#ffffff' }} className="max-w-full"></svg>
                        <span className="text-xs font-mono mt-1 tracking-widest" style={{ color: '#374151' }}>
                          {employeeBarcode}
                        </span>
                      </>
                    ) : (
                      <div className="text-sm" style={{ color: '#6b7280' }}>No barcode available</div>
                    )}
                  </div>
                </div>

                {/* Bottom Logo and Company Name */}
                <div className="relative z-10 flex items-center gap-2 sm:gap-3 justify-center pt-2 sm:pt-4 sm:mb-5 mb-5" style={{ borderTop: '1px solid #d1d5db' }}>
                  <div className="rounded p-1 sm:p-1.5 flex items-center justify-center w-16 h-24 sm:w-24 sm:h-36">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
                        Logo
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-bold califoniaFont" style={{ color: '#1f2937' }}>
                    JJC ENGINEERING<br/>
                    WORKS & GENERAL<br/>
                    SERVICES
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-4 text-xs sm:text-sm" style={{ color: '#d4d4d8' }}>
          Click card or flip button to see both sides
        </p>
      </div>
    </div>
  )
}