
import { Button } from "@/components/ui/button"
import { Activity, CreditCard, UserIcon, Gamepad2, Bell, X } from "lucide-react"

interface ProfileSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isOpen: boolean
  onClose: () => void
}

const sidebarItems = [
  { id: "estadisticas", label: "Estadísticas", icon: Activity },
  { id: "cuenta", label: "Cuenta corriente", icon: CreditCard },
  { id: "datos", label: "Datos Personales", icon: UserIcon },
  { id: "juegos", label: "Juegos Habilitados", icon: Gamepad2 },
  { id: "eventos", label: "Eventos", icon: Bell },
]

export function ProfileSidebar({ activeSection, onSectionChange, isOpen, onClose }: ProfileSidebarProps) {
  return (
    <aside 
      className={`
        w-64 bg-background border-r min-h-screen transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:block
        ${isOpen 
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0' 
          : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:translate-x-0'
        }
      `}
    >
      <div className="lg:hidden p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Menú</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    activeSection === item.id
                      ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}