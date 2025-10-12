'use client'

import { Search, ShoppingBag, Bell, Menu, X, User, LogOut } from 'lucide-react'
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import Link from 'next/link'
import { useState, useCallback } from 'react'


import { AuthModal } from './auth-modal'
import { useAuth } from './auth-context'
import { useAuthModal } from './use-auth-modal'

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isOpen, defaultTab, openLogin, close } = useAuthModal()
  const { user, logout, isInitialized } = useAuth()

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [logout])

  return (
    <>
      {/* Header */}
      <header className="bg-[#ff9800] py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href={'/'} className="text-xl md:text-2xl font-bold text-black">
            WowKeystore
          </Link>

          {/* Desktop Search Bar */}
          <div className="relative flex-1 max-w-xl mx-4 hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              placeholder="ค้นหา"
            />
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/cart" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link href="/notifications" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <Bell className="h-5 w-5" />
            </Link>
            
            {!isInitialized ? (
              <div className="h-10 w-10 rounded-full bg-white/20 animate-pulse transition-opacity duration-300" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800]">
                    <Avatar className="h-8 w-8">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ''} />}
                      <AvatarFallback className="bg-[#ff9800] text-white">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.displayName && (
                        <p className="font-medium">{user.displayName}</p>
                      )}
                      {user.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>โปรไฟล์</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={openLogin}
                className="bg-[#292d32] hover:bg-[#3c3c3c] text-white rounded-md px-4 py-2"
              >
                เข้าสู่ระบบ
              </Button>
            )}
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex md:hidden items-center space-x-2">
            <Link href="/cart" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link href="/notifications" className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200">
              <Bell className="h-4 w-4" />
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mt-4 md:hidden">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              placeholder="ค้นหา"
            />
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="bg-white border-b border-gray-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-6">
          <ul className="flex space-x-8 justify-center">
            <li className="py-4">
              <Link href="/products" className="text-gray-700 hover:text-[#ff9800] transition-colors duration-200">
                สินค้าทั้งหมด
              </Link>
            </li>
            <li className="py-4">
              <Link href="/seller" className="text-gray-700 hover:text-[#ff9800] transition-colors duration-200">
                ขายสินค้ากับเรา
              </Link>
            </li>
            <li className="py-4">
              <Link href="/profile?tab=myGame" className="text-gray-700 hover:text-[#ff9800] transition-colors duration-200">
                ไอดีเกมของฉัน
              </Link>
            </li>
            <li className="py-4">
              <a href="/profile?tab=help" className="text-gray-700 hover:text-[#ff9800] transition-colors duration-200">
                ติดต่อเรา
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="bg-white border-b border-gray-200 md:hidden">
          <div className="px-4 py-2">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/products" 
                  className="block py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  สินค้าทั้งหมด
                </Link>
              </li>
              <li>
                <Link 
                  href="/seller" 
                  className="block py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ขายสินค้ากับเรา
                </Link>
              </li>
              <li>
                <a 
                  href="/profile?tab=myGame"
                  className="block py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ไอดีเกมของฉัน
                </a>
              </li>
              <li>
                <a 
                  href="/profile?tab=help" 
                  className="block py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ติดต่อเรา
                </a>
              </li>
              <li className="pt-2 border-t border-gray-200">
                {!isInitialized ? (
                  <div className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : user ? (
                  <div className="space-y-2">
                    <div className="px-4 py-2">
                      <p className="font-medium text-gray-900">{user.displayName || 'ผู้ใช้'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="block py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      โปรไฟล์
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="block w-full text-left py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      openLogin()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full bg-[#292d32] hover:bg-[#3c3c3c] text-white rounded-md py-3"
                  >
                    เข้าสู่ระบบ
                  </Button>
                )}
              </li>
            </ul>
          </div>
        </nav>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isOpen} 
        onClose={close} 
        defaultTab={defaultTab}
      />
    </>
  )
}
