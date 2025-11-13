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
  const [images, setImages] = useState<SliderImage[]>(initialImages)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [images.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
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

  return (
    <div className="relative w-full h-[280px] md:h-[500px] lg:h-[800px]">
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
    </div>
  )
}
