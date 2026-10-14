"use client"
import { useEffect, useState } from "react"
import LoaderPage from "@/components/loader-page"

type Phase = "visible" | "fading" | "hidden"

/**
 * First-paint splash. Shows the loading animation over the app and fades it out
 * once the app has booted, so users never stare at a blank screen.
 */
export function LoadingSplash() {
  const [phase, setPhase] = useState<Phase>("visible")

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), 1400)
    const hide = setTimeout(() => setPhase("hidden"), 1900)
    return () => {
      clearTimeout(fade)
      clearTimeout(hide)
    }
  }, [])

  if (phase === "hidden") return null

  return (
    <div
      className={
        "fixed inset-0 z-[100] transition-opacity duration-500 " +
        (phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100")
      }
    >
      <LoaderPage />
    </div>
  )
}
