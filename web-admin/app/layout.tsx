import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ClientLayout } from "@/components/client-layout"
import "./../styles/globals.css"

export const metadata: Metadata = {
  title: "BettArena Admin",
  description: "Panel de administración",
  generator: "SudacaDev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="h-full" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
        {/* Vercel Speed Insights (Core Web Vitals), opt-in per environment: set
            ENABLE_SPEED_INSIGHTS=true only where we want metrics (production).
            Read server-side at build time, so changing it needs a redeploy. */}
        {process.env.ENABLE_SPEED_INSIGHTS === "true" && <SpeedInsights />}
      </body>
    </html>
  )
}
