import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";

import { AuthProvider } from "@/components/auth-context";
import { Navbar } from "@/components/navbar/Navbar";
import { EmailPromptToast } from "@/components/email-prompt-toast";

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover', // สำหรับ iPhone notch
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-gray-100`}
      >
        <AuthProvider>
          <Navbar/>
          <main className="flex-1 min-h-0">
            {children}
          </main>
          <Footer />
          <EmailPromptToast />
        </AuthProvider>
      </body>
    </html>
  );
}
