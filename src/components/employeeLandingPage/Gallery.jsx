import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, ZoomIn, Maximize2 } from "lucide-react"
import ImageWithLoading from "../../../public/ImageWithLoading"
import GearLoadingSpinner from "../../../public/LoadingGear"

const Gallery = ({ images = [], isLoading = false }) => {
  const [selectedImage, setSelectedImage] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const displayLimit = 5
  const hasMoreImages = images.length > displayLimit
  const displayedImages = showFullGallery ? images : images.slice(0, displayLimit)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null)
        } else if (isModalOpen) {
          setIsModalOpen(false)
          setShowFullGallery(false)
        }
      }
    }

    if (selectedImage || isModalOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [selectedImage, isModalOpen])

  const openLightbox = (index) => {
    const actualIndex = showFullGallery ? index : index
    setCurrentIndex(actualIndex)
    setSelectedImage(images[actualIndex])
  }

  const closeLightbox = () => {
    setSelectedImage(null)
  }

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % images.length
    setCurrentIndex(nextIndex)
    setSelectedImage(images[nextIndex])
  }

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setCurrentIndex(prevIndex)
    setSelectedImage(images[prevIndex])
  }

  const openFullGalleryModal = () => {
    setIsModalOpen(true)
    setShowFullGallery(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setShowFullGallery(false)
  }

   if (isLoading) {
    return (
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Gallery</h3>
          </div>
          {/* Full Page Gear Loading */}
          <GearLoadingSpinner />
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Gallery</h3>
            <p className="text-lg text-zinc-600">No images available yet</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Main Gallery Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Gallery</h3>
            <p className="text-lg text-zinc-600">Explore our projects and capabilities</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {images.slice(0, displayLimit).map((image, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                {/* Image with Loading Spinner */}
                <ImageWithLoading
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  containerClassName="w-full h-full"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          {hasMoreImages && (
            <div className="mt-10 text-center">
              <button
                onClick={openFullGalleryModal}
                className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                <Maximize2 className="w-5 h-5" />
                View All Images ({images.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Gallery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900">Gallery</h3>
                  <p className="text-sm text-zinc-600">{images.length} images</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-12 h-12 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center transition-all"
                >
                  <X className="w-6 h-6 text-zinc-900" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  {/* Image with Loading Spinner */}
                  <ImageWithLoading
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    containerClassName="w-full h-full"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>

          <div
            className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Image with Loading */}
            <ImageWithLoading
              src={selectedImage}
              alt={`Gallery image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              showMiniSpinner={false}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default Gallery