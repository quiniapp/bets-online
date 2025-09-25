import { type User } from "@/lib/mock-data"

import { Card, CardContent } from "@/components/ui/card"
import { StatisticsSection } from "./sections/StatisticsSection"
import { PersonalDataSection } from "./sections/PersonalDataSection"
import { GamesSection } from "./sections/GamesSection"
import { EventsSection } from "./sections/EventsSection"

interface ProfileContentProps {
  activeSection: string
  user: User
}

export function ProfileContent({ activeSection, user }: ProfileContentProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "estadisticas":
        return <StatisticsSection user={user} />
      case "datos":
        return <PersonalDataSection user={user} />
      case "juegos":
        return <GamesSection user={user} />
      case "eventos":
        return <EventsSection />
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Sección en desarrollo</p>
            </CardContent>
          </Card>
        )
    }
  }

  return <div>{renderSection()}</div>
}