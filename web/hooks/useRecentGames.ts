"use client"
import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import type { Game } from "helper"

/** Games the player most recently played, most-recent first. */
export function useRecentGames() {
  const { user, role } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiService.get<{ games: Game[] }>("/games/my-recents")
      if (res.success && res.data) setGames(res.data.games)
    } catch {
      // non-critical section
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && role === UserRole.PLAYER) load()
  }, [user, role, load])

  return { games, loading }
}
