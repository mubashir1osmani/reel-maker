import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "AI Animated Video Maker",
  description: "Create stunning animated videos with AI in seconds",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <main>
          {children}
        </main>
        
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
