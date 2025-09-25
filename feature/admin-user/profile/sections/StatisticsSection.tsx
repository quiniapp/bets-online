import { Card, CardContent } from "@/components/ui/card"
import { Flex, FlexCol } from "@/components/flex"
import { type User } from "@/lib/mock-data"

interface StatisticsSectionProps {
  user: User
}

export function StatisticsSection({ user }: StatisticsSectionProps) {
  const userStats = {
    fichas: user?.balance,
    jugado: 1250.5,
    ganado: 980.25,
    netLoss: 270.25,
    mesPasado: 450.75,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
            <div className="mb-4">
              <span className="text-lg font-medium">Fichas: </span>
              <span className="text-xl font-bold">{userStats.fichas?.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden">
            <FlexCol className="w-full max-w-xxl bg-muted/30">
              <Flex>
                <div className="flex-1 text-white p-3 font-medium">Jugado:</div>
                <div className="flex-1 p-3 font-medium">{userStats.jugado.toFixed(2)}</div>
              </Flex>
              <Flex>
                <div className="flex-1 text-white p-3 font-medium">Ganado:</div>
                <div className="flex-1 p-3 font-medium">{userStats.ganado.toFixed(2)}</div>
              </Flex>
              <Flex>
                <div className="flex-1 text-white p-3 font-medium">NetLoss:</div>
                <div className="flex-1 p-3 font-medium">{userStats.netLoss.toFixed(2)}</div>
              </Flex>
              <Flex>
                <div className="flex-1 text-white p-3 font-medium">Mes pasado:</div>
                <div className="flex-1 p-3 font-medium">{userStats.mesPasado.toFixed(2)}</div>
              </Flex>
            </FlexCol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}