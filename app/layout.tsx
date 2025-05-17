import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import Link from 'next/link'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "LATEEEEEE - AI Reel Maker",
  description: "Create amazing reels with AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">AI Reel Maker</Link>
            <div className="space-x-4">
              <Link href="/" className="hover:text-gray-300">Home</Link>
              <Link href="/generate" className="hover:text-gray-300">Generate Reel</Link>
            </div>
          </div>
        </nav>
        
        <main>
          {children}
        </main>
        
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
