import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'

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
        <AuthProvider>
          <main>
            {children}
          </main>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
