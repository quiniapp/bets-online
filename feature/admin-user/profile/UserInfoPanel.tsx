import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { type User } from "@/lib/mock-data"

interface UserInfoPanelProps {
  user: User
}

export function UserInfoPanel({ user }: UserInfoPanelProps) {
  return (
    <aside className="hidden xl:block w-64 bg-muted/30 p-4 border-l">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Moneda:</Label>
          <p className="text-lg font-semibold">ARS</p>
        </div>

        <div>
          <Label className="text-sm font-medium">Estado:</Label>
          <div className="mt-1">
            <Badge variant={user?.isActive ? "default" : "secondary"} className="bg-green-500">
              {user.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Último ingreso:</Label>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            {new Date().toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            hs
          </p>
        </div>
      </div>
    </aside>
  )
}