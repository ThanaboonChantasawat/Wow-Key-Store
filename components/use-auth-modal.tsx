'use client'

import { useState } from 'react'

export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<'login' | 'register'>('login')

  const openLogin = () => {
    setDefaultTab('login')
    setIsOpen(true)
  }

  const openRegister = () => {
    setDefaultTab('register')
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    defaultTab,
    openLogin,
    openRegister,
    close
  }
}
