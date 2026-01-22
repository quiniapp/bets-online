"use client"

import type React from "react"
import { Providers } from "@/components/providers"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
