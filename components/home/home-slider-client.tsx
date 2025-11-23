'use client'

import { useState, useEffect } from 'react'
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
    </div>
  )
}
