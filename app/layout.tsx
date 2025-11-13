import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";

import { AuthProvider } from "@/components/auth-context";
import { Navbar } from "@/components/navbar/Navbar";
import { EmailPromptToast } from "@/components/email-prompt-toast";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wow Key Store",
  description: "Wow Key Store ID Game Shop Website.",
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="m-0 p-0">
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-gray-100 m-0 p-0`}
      >
        <AuthProvider>
          <Navbar/>
          <main className="flex-1 min-h-0">
            {children}
          </main>
          <Footer />
          <EmailPromptToast />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
