"use client"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import { useFavorites } from "@/contexts/favorites-context"
import { StaticGameSection } from "./static-game-section"

export function FavoritesSection() {
  const { user, role } = useAuth()
  const { favoriteGames, loading } = useFavorites()
  if (!user || role !== UserRole.PLAYER) return null
  return (
    <StaticGameSection
      title="Tus favoritos"
      emoji="❤️"
      games={favoriteGames}
      loading={loading}
      maxItems={8}
    />
  )
}
