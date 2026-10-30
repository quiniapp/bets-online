"use client"
import { History } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import { useRecentGames } from "@/hooks/useRecentGames"
import { StaticGameSection } from "./static-game-section"

export function RecentGamesSection() {
  const { user, role } = useAuth()
  const { games, loading } = useRecentGames()
  if (!user || role !== UserRole.PLAYER) return null
  return (
    <StaticGameSection
      title="Últimos juegos"
      icon={History}
      games={games}
      loading={loading}
      maxItems={8}
    />
  )
}
