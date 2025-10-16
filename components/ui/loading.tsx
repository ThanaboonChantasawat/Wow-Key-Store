import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function Loading({ className, size = 'md', text = 'กำลังโหลด...' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('animate-spin rounded-full border-b-2 border-[#ff9800]', sizeClasses[size])}></div>
      {text && <p className="text-gray-500 mt-4">{text}</p>}
    </div>
  )
}

interface LoadingScreenProps {
  text?: string
}

export function LoadingScreen({ text = 'กำลังโหลด...' }: LoadingScreenProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-12">
      <Loading text={text} />
    </div>
  )
}

interface LoadingOverlayProps {
  show: boolean
  text?: string
}

export function LoadingOverlay({ show, text = 'กำลังโหลด...' }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <Loading text={text} />
      </div>
    </div>
  )
}
