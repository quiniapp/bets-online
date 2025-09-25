import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockGames, type User } from "@/lib/mock-data"

interface GamesSectionProps {
  user: User
}

export function GamesSection({ user }: GamesSectionProps) {
  const getGameName = (gameId: string) => {
    return mockGames.find((g) => g.id === gameId)?.name || "Juego desconocido"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Juegos Habilitados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {user.enabledGames.length > 0 ? (
            user.enabledGames.map((gameId) => {
              const game = mockGames.find((g) => g.id === gameId)
              return (
                <div key={gameId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{getGameName(gameId)}</p>
                    {game && (
                      <p className="text-sm text-muted-foreground">
                        ${game.minBet} - ${game.maxBet}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground text-center py-4">No tienes acceso a ningún juego</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}