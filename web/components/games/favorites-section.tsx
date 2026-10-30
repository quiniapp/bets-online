"use client"
import { Heart } from "lucide-react"
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
      icon={Heart}
      games={favoriteGames}
      loading={loading}
      maxItems={8}
    />
  )
}
