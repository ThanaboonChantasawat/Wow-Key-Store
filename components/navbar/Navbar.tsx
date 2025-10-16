"use client";

import { Search, ShoppingBag, Bell, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchGames } from "@/hooks/useFirestore";
import SearchDropdown from "./SearchDropdown";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "../auth-modal";
import { useAuthModal } from "../use-auth-modal";
import { useAuth } from "../auth-context";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navLinks = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products", label: "สินค้าทั้งหมด" },
  { href: "/shops", label: "ร้านค้าทั้งหมด" },
  { href: "/seller", label: "ขายสินค้ากับเรา" },
  { href: "/support", label: "ติดต่อเรา" },
];

function NavbarContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isOpen, defaultTab, openLogin, close } = useAuthModal();
  const { user, logout, isInitialized } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams ? searchParams.get("q") ?? "" : "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const showDropdown =
    pathname !== "/products" && debounced && debounced.trim() !== "";
  const { games: suggestionGames, loading: suggestionLoading } =
    useSearchGames(debounced);

  const handleSearchSubmit = useCallback(
    (q?: string) => {
      const value = q !== undefined ? q : searchTerm;
      const url = value
        ? `${pathname}?q=${encodeURIComponent(value)}`
        : pathname;
      router.push(url);
      // close dropdown by clearing debounced term and blur inputs
      setDebounced("");
      try {
        desktopInputRef.current?.blur();
        mobileInputRef.current?.blur();
      } catch {
        // ignore
      }
    },
    [router, pathname, searchTerm]
  );

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      closeMobileMenu();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [logout, closeMobileMenu]);

  return (
    <>
      {/* Header */}
      <header className="bg-[#ff9800] print:hidden">
        <div className="px-4 md:px-6">
          {/* Top Row - Logo and Actions */}
          <div className="h-16 md:h-20 flex items-center justify-between gap-3">
            {/* Left Side: Logo */}
            <div className="flex items-center">
              {/* Logo */}
              <Link href={"/"} className="relative h-28 md:h-44 w-44 md:w-56 flex-shrink-0">
                <Image
                  src={"/images/logo.png"}
                  alt="wowkeystore logo"
                  fill
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Right Side: Search + Actions */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
              {/* Desktop Search Bar */}
              <div className="relative flex-1 max-w-xl mx-4 hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              ref={desktopInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              className="block w-full pl-10 pr-10 py-2 border border-transparent rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              placeholder="ค้นหา"
            />
            {/* Clear button */}
            {searchTerm && searchTerm.trim() !== "" && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDebounced("");
                  // focus inputs if present
                  desktopInputRef.current?.focus();
                  mobileInputRef.current?.focus();
                }}
                aria-label="ลบข้อความ"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Dropdown suggestions */}
            {showDropdown && (
              <SearchDropdown
                query={debounced}
                suggestionGames={suggestionGames}
                suggestionLoading={suggestionLoading}
                onSelectProduct={(id) => {
                  router.push(`/products/${id}`);
                  setSearchTerm("");
                  setDebounced("");
                  desktopInputRef.current?.blur();
                  mobileInputRef.current?.blur();
                }}
                onViewAll={() => {
                  setSearchTerm("");
                  setDebounced("");
                  desktopInputRef.current?.blur();
                  mobileInputRef.current?.blur();
                  router.push(`/products?q=${encodeURIComponent(debounced)}`);
                }}
              />
            )}
          </div>

          {/* Mobile Action Icons */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/cart"
              className="p-2 rounded-lg bg-white/20 hover:bg-white hover:text-[#ff9800] transition-all duration-200"
              aria-label="ตะกร้าสินค้า"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              className="p-2 rounded-lg bg-white/20 hover:bg-white hover:text-[#ff9800] transition-all duration-200"
              aria-label="การแจ้งเตือน"
            >
              <Bell className="h-5 w-5" />
            </Link>
            
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg bg-white/20 hover:bg-white hover:text-[#ff9800] transition-all duration-200 active:scale-95"
              aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/cart"
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
            >
              <Bell className="h-5 w-5" />
            </Link>

            {!isInitialized ? (
              <div className="h-10 w-10 rounded-full bg-white/20 animate-pulse transition-opacity duration-300" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800]"
                  >
                    <Avatar className="h-8 w-8">
                      {user.photoURL && (
                        <AvatarImage
                          src={user.photoURL}
                          alt={user.displayName || ""}
                        />
                      )}
                      <AvatarFallback className="bg-[#ff9800] text-white">
                        {user.displayName?.charAt(0) ||
                          user.email?.charAt(0) ||
                          "U"}
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
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer"
                  >
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
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="pb-4 md:hidden">
            <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              ref={mobileInputRef}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              className="block w-full pl-10 pr-10 py-2 border border-transparent rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              placeholder="ค้นหา"
            />
            {/* Clear button */}
            {searchTerm && searchTerm.trim() !== "" && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDebounced("");
                  mobileInputRef.current?.focus();
                }}
                aria-label="ลบข้อความ"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="bg-white border-b border-gray-200 hidden md:block print:hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 justify-center m-2">
            {navLinks.map((link) => {
              let isActive = false;
              
              if (link.href === "/") {
                isActive = pathname === "/";
              } else if (link.href === "/shops") {
                // Highlight "ร้านค้าทั้งหมด" when on /shops or /sellerprofile/[id]
                isActive = pathname.startsWith("/shops") || pathname.startsWith("/sellerprofile");
              } else if (link.href === "/seller") {
                // Check exactly for /seller path, not /sellerprofile
                isActive = pathname === "/seller" || (pathname.startsWith("/seller/") && !pathname.startsWith("/sellerprofile"));
              } else {
                isActive = pathname.startsWith(link.href);
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative py-3 text-lg font-medium transition-colors duration-200 group"
                >
                  <span className={isActive ? "text-[#ff9800]" : "text-gray-700 group-hover:text-[#ff9800]"}>
                    {link.label}
                  </span>
                  {/* Thin underline - 2px height */}
                  <span 
                    className={`absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff9800] transition-opacity duration-200 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  ></span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={isOpen} onClose={close} defaultTab={defaultTab} />

      {/* Mobile Drawer Menu - Custom Implementation */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/80 z-50 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] sm:w-[320px] bg-white shadow-xl md:hidden animate-in slide-in-from-left duration-300">
            <div className="flex flex-col h-full">
              {/* Header - Orange Background */}
              <div className="bg-[#ff9800] px-6 py-6 relative">
                <h2 className="text-white text-2xl font-bold">เมนู</h2>
                <button
                  onClick={closeMobileMenu}
                  className="absolute right-4 top-4 text-white hover:bg-white/10 p-1.5 rounded-md transition-colors"
                  aria-label="ปิดเมนู"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* User Profile Section */}
                {isInitialized && user ? (
                  <div className="bg-white mx-4 my-4 p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-14 w-14 ring-2 ring-orange-100">
                        {user.photoURL && (
                          <AvatarImage
                            src={user.photoURL}
                            alt={user.displayName || ""}
                          />
                        )}
                        <AvatarFallback className="bg-[#ff9800] text-white text-lg font-semibold">
                          {user.displayName?.charAt(0) ||
                            user.email?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        {user.displayName && (
                          <p className="font-semibold text-[#292d32] text-base truncate">
                            {user.displayName}
                          </p>
                        )}
                        {user.email && (
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/profile"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-[#292d32] hover:bg-gray-50 transition-colors"
                      >
                        <User className="h-5 w-5 text-[#ff9800]" />
                        <span className="font-medium">โปรไฟล์</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-[#292d32] hover:bg-gray-50 transition-colors text-left w-full"
                      >
                        <LogOut className="h-5 w-5 text-red-500" />
                        <span className="font-medium">ออกจากระบบ</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mx-4 my-4">
                    <Button
                      onClick={() => {
                        closeMobileMenu();
                        openLogin();
                      }}
                      className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-semibold py-3"
                    >
                      เข้าสู่ระบบ
                    </Button>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="px-4 py-2">
                  {navLinks.map((link) => {
                    let isActive = false;

                    if (link.href === "/") {
                      isActive = pathname === "/";
                    } else if (link.href === "/shops") {
                      isActive =
                        pathname.startsWith("/shops") ||
                        pathname.startsWith("/sellerprofile");
                    } else if (link.href === "/seller") {
                      isActive =
                        pathname === "/seller" ||
                        (pathname.startsWith("/seller/") &&
                          !pathname.startsWith("/sellerprofile"));
                    } else {
                      isActive = pathname.startsWith(link.href);
                    }

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMobileMenu}
                        className={`block px-4 py-3 rounded-lg mb-1 transition-colors ${
                          isActive
                            ? "bg-[#FFF3E0] text-[#ff9800] font-semibold"
                            : "text-[#292d32] hover:bg-gray-50"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-center text-gray-500">
                  © 2025 WowKeyStore. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function Navbar() {
  return (
    <Suspense
      fallback={
        <nav className="bg-[#292d32] text-white py-3 px-6 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="h-8 w-32 bg-gray-600 animate-pulse rounded"></div>
            <div className="h-8 w-64 bg-gray-600 animate-pulse rounded"></div>
          </div>
        </nav>
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
