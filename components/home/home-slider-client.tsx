'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface SliderImage {
  id: string
  url: string
  order: number
}

interface HomeSliderClientProps {
  images: SliderImage[]
}

export function HomeSliderClient({ images: initialImages }: HomeSliderClientProps) {
  const [images] = useState<SliderImage[]>(initialImages || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const validImages = images.filter(img => img && img.url && !imageErrors.has(img.id))

  useEffect(() => {
    if (validImages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [validImages.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validImages.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const handleImageError = (imageId: string) => {
    console.error('Failed to load slider image:', imageId)
    setImageErrors(prev => new Set(prev).add(imageId))
  }

  if (validImages.length === 0) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">🎮 WOW KEY STORE</h2>
          <p className="text-xl md:text-2xl">ร้านค้าคีย์เกมออนไลน์ ราคาดีที่สุด</p>
        </div>
      </div>
    )
  }

  if (validImages.length === 1) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] overflow-hidden">
        <div className="relative w-full h-full md:rounded-xl overflow-hidden">
          <Image
            src={validImages[0].url}
            alt="Slider"
            fill
            className="object-contain object-center"
            priority
            sizes="100vw"
            onError={() => handleImageError(validImages[0].id)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[280px] md:h-[500px] lg:h-[800px]">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {validImages.map((image, index) => (
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
                onError={() => handleImageError(image.id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {validImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-200"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-200"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Dots Navigation */}
      {validImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex gap-2">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-[#ff9800] w-6 md:w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
