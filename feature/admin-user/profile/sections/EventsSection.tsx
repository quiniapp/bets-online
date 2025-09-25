import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const recentActivity = [
  { action: "Login", timestamp: new Date(Date.now() - 1000 * 60 * 30), ip: "192.168.1.1" },
  { action: "Bet Placed", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), ip: "192.168.1.1" },
  { action: "Profile Updated", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), ip: "192.168.1.1" },
]

export function EventsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Actividad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{activity.action}</p>
                <p className="text-sm text-muted-foreground">IP: {activity.ip}</p>
              </div>
              <div className="text-sm text-muted-foreground">{activity.timestamp.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}