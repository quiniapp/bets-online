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

// Share of page views that report Web Vitals, in (0, 1]. Defaults to 1% so the
// team's free Speed Insights quota (10k events / 30 days) is not exhausted.
const DEFAULT_SPEED_INSIGHTS_SAMPLE_RATE = 0.01

function speedInsightsSampleRate(): number {
  const rate = Number(process.env.SPEED_INSIGHTS_SAMPLE_RATE)
  return rate > 0 && rate <= 1 ? rate : DEFAULT_SPEED_INSIGHTS_SAMPLE_RATE
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
            Both env vars are read server-side at build time: changing them
            needs a redeploy. */}
        {process.env.ENABLE_SPEED_INSIGHTS === "true" && (
          <SpeedInsights sampleRate={speedInsightsSampleRate()} />
        )}
      </body>
    </html>
  )
}
