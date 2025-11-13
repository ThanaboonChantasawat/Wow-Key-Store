'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface SliderImage {
  id: string
  url: string
  order: number
}

export function HomeSlider() {
  const [images, setImages] = useState<SliderImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSliderImages()
  }, [])

  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  const fetchSliderImages = async () => {
    try {
      const response = await fetch('/api/slider?activeOnly=true')
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('Error fetching slider images:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  if (isLoading) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">🎮 WOW KEY STORE</h2>
          <p className="text-xl md:text-2xl">ร้านค้าคีย์เกมออนไลน์ ราคาดีที่สุด</p>
        </div>
      </div>
    )
  }

  // Mobile: Show only center image
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Show only one image if there's only one
  if (images.length === 1) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] overflow-hidden">
        <div className="relative w-full h-full md:rounded-xl overflow-hidden">
          <Image
            src={images[0].url}
            alt="Slider"
            fill
            className="object-contain object-center"
            priority
            sizes="100vw"
          />
        </div>
      </div>
    )
  }

  const getVisibleImages = () => {
    // Only show center image
    return [{ ...images[currentIndex], position: 'center', index: currentIndex }]
  }

  const visibleImages = getVisibleImages()

  return (
    <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px]">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`absolute w-full md:w-[90%] lg:w-[85%] h-full transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-20' : 'opacity-0 z-10'
            }`}
          >
            <div className="relative w-full h-full overflow-hidden md:rounded-xl">
              <Image
                src={image.url}
                alt={`Slider ${index + 1}`}
                fill
                className="object-contain object-center"
                sizes="100vw"
                priority={index === 0}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
      </button>

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-30 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all ${
                index === currentIndex
                  ? 'w-8 h-3 bg-white rounded-full shadow-lg'
                  : 'w-3 h-3 bg-white/60 hover:bg-white/75 rounded-full shadow-lg'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
