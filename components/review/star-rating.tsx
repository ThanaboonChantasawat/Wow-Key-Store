'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  showNumber = false,
  interactive = false,
  onChange
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1)
    }
  }
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const isFilled = index < Math.floor(rating)
          const isHalf = !isFilled && index < rating
          
          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              className={cn(
                'relative',
                interactive && 'cursor-pointer hover:scale-110 transition-transform'
              )}
            >
              {/* Background star (gray) */}
              <Star
                className={cn(
                  sizeClasses[size],
                  'text-gray-300'
                )}
                fill="currentColor"
              />
              
              {/* Filled star (yellow) */}
              {isFilled && (
                <Star
                  className={cn(
                    sizeClasses[size],
                    'text-yellow-400 absolute top-0 left-0'
                  )}
                  fill="currentColor"
                />
              )}
              
              {/* Half star (yellow) */}
              {isHalf && (
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star
                    className={cn(
                      sizeClasses[size],
                      'text-yellow-400'
                    )}
                    fill="currentColor"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {showNumber && (
        <span className="text-sm text-gray-600 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
