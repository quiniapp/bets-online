import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { ClientLayout } from "@/components/client-layout"
import "./../styles/globals.css"

export const metadata: Metadata = {
  title: "BettArena",
  description: "Professional betting platform with dual authentication",
  generator: "SudacaDev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={GeistSans.variable}>
      <head>
        {/* Image origins: Supabase Storage (banners/logos propios) and the
            integrator thumbnail CDNs. Saves DNS+TLS (~300-600ms on 3G). */}
        <link rel="preconnect" href="https://irgzsshhlkrffrjohqpt.supabase.co" />
        <link rel="preconnect" href="https://viral-fe-assets.s3.eu-north-1.amazonaws.com" />
        <link rel="preconnect" href="https://common-static.ppgames.net" />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
