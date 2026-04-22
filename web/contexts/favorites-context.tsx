"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import type { Game } from "helper"

interface FavoritesContextType {
  favoriteIds: Set<string>
  favoriteGames: Game[]
  loading: boolean
  toggleFavorite: (gameId: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const [idsRes, gamesRes] = await Promise.all([
        apiService.get<{ ids: string[] }>("/favorites/my-ids"),
        apiService.get<{ games: Game[] }>("/favorites/my-games"),
      ])
      if (idsRes.success && idsRes.data) {
        setFavoriteIds(new Set(idsRes.data.ids))
      }
      if (gamesRes.success && gamesRes.data) {
        setFavoriteGames(gamesRes.data.games)
      }
    } catch {
      // silently fail — favorites are non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && role === UserRole.PLAYER) {
      loadFavorites()
    }
  }, [user, role, loadFavorites])

  const toggleFavorite = useCallback(async (gameId: string) => {
    const isFav = favoriteIds.has(gameId)

    // optimistic update
    if (isFav) {
      setFavoriteIds(prev => { const next = new Set(prev); next.delete(gameId); return next })
      setFavoriteGames(prev => prev.filter(g => g.id !== gameId))
    } else {
      setFavoriteIds(prev => new Set(prev).add(gameId))
    }

    try {
      if (isFav) {
        await apiService.delete(`/favorites/${gameId}`)
      } else {
        await apiService.post(`/favorites/${gameId}`, {})
        // fetch full game object to add to list
        const res = await apiService.get<{ games: Game[] }>("/favorites/my-games")
        if (res.success && res.data) {
          setFavoriteGames(res.data.games)
          setFavoriteIds(new Set(res.data.games.map(g => g.id)))
        }
      }
    } catch {
      // rollback
      await loadFavorites()
    }
  }, [favoriteIds, loadFavorites])

  return (
    <FavoritesContext.Provider value={{ favoriteIds, favoriteGames, loading, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider")
  return ctx
}
