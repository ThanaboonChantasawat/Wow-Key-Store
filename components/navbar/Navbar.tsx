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
  { href: "/profile?tab=myGame", label: "ไอดีเกมของฉัน" },
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

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [logout]);

  return (
    <>
      {/* Header */}
      <header className="bg-[#ff9800] px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Top Row - Logo and Actions */}
          <div className="h-20 md:h-24 flex items-center justify-between">
            {/* Logo */}
            <Link href={"/"} className="relative h-36 md:h-56 w-56 md:w-64 flex-shrink-0">
              <Image
                src={"/images/logo.png"}
                alt="wowkeystore logo"
                fill
                className="object-contain"
                priority
              />
            </Link>

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

          {/* Mobile Action Buttons */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              href="/cart"
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
            >
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link
              href="/notifications"
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
            >
              <Bell className="h-4 w-4" />
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-full bg-white/20 hover:bg-white hover:text-[#ff9800] transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
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
      <nav className="bg-white border-b border-gray-200 hidden md:block">
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

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="bg-white border-b border-gray-200 md:hidden">
          <div className="px-4 py-2">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    pathname === "/"
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    pathname.startsWith("/products")
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  สินค้าทั้งหมด
                </Link>
              </li>
              <li>
                <Link
                  href="/shops"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    pathname.startsWith("/shops") || pathname.startsWith("/sellerprofile")
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ร้านค้าทั้งหมด
                </Link>
              </li>
              <li>
                <Link
                  href="/seller"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    (pathname === "/seller" || (pathname.startsWith("/seller/") && !pathname.startsWith("/sellerprofile")))
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ขายสินค้ากับเรา
                </Link>
              </li>
              <li>
                <Link
                  href="/profile?tab=myGame"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    pathname.startsWith("/profile") && searchParams?.get("tab") === "myGame"
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ไอดีเกมของฉัน
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className={`block py-3 px-4 rounded-md transition-colors duration-200 ${
                    pathname.startsWith("/support")
                      ? "text-[#ff9800] bg-orange-50 font-medium"
                      : "text-gray-700 hover:text-[#ff9800] hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ติดต่อเรา
                </Link>
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
                      <p className="font-medium text-gray-900">
                        {user.displayName || "ผู้ใช้"}
                      </p>
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
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-3 px-4 text-gray-700 hover:text-[#ff9800] hover:bg-gray-50 rounded-md transition-colors duration-200"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      openLogin();
                      setIsMobileMenuOpen(false);
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
      <AuthModal isOpen={isOpen} onClose={close} defaultTab={defaultTab} />
    </>
  );
}

export function Navbar() {
  return (
    <Suspense
      fallback={
        <nav className="bg-[#292d32] text-white py-3 px-6">
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
