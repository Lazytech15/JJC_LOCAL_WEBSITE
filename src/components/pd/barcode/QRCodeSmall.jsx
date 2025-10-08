import { useEffect, useRef, memo } from "react"
import bwipjs from "bwip-js"

const formatITM = (itemNo) => `ITM${itemNo.toString().padStart(3, '0')}`

function QRCodeSmall({ itemNo, size = 2 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const id = formatITM(itemNo)
    try {
      bwipjs.toCanvas(ref.current, {
        bcid: 'code128',
        text: id,
        scale: size,
        height: 10,
        includetext: false,
        backgroundcolor: 'ffffff',
        paddingwidth: 2,
        paddingheight: 2,
      })
    } catch (e) {
      console.error('QR small render failed', e)
    }
  }, [itemNo, size])

  return <canvas ref={ref} className="inline-block ml-2" />
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export default memo(QRCodeSmall)
