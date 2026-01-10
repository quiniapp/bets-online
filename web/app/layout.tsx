import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from "@/components/providers"
import "./../styles/globals.css"

export const metadata: Metadata = {
  title: "BettArena",
  description: "Professional betting platform with dual authentication",
  generator: "SudacaDev",
}

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
