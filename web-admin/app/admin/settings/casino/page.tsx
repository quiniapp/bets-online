"use client"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useOwnerGuard } from "@/hooks/useOwnerGuard"
import { ChevronRight, PanelTop, LayoutGrid, Link2, Smartphone, Gamepad2, type LucideIcon } from "lucide-react"

interface SettingsItem {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

const ITEMS: SettingsItem[] = [
  {
    href: "/admin/settings/casino/header",
    title: "Header",
    description: "Categorías visibles y su orden en la barra superior",
    icon: PanelTop,
  },
  {
    href: "/admin/settings/casino/lobby",
    title: "Lobby",
    description: "Secciones del lobby: categorías, proveedores o ambos",
    icon: LayoutGrid,
  },
  {
    href: "/admin/settings/casino/navbar",
    title: "Navbar mobile",
    description: "Orden y visibilidad de la barra inferior en celulares",
    icon: Smartphone,
  },
  {
    href: "/admin/settings/casino/juegos",
    title: "Juegos",
    description: "Orden de tipos por proveedor y juego por juego",
    icon: Gamepad2,
  },
  {
    href: "/admin/settings/casino/footer",
    title: "Footer",
    description: "Enlaces del pie de página del casino",
    icon: Link2,
  },
]

export default function CasinoSettingsIndexPage() {
  useOwnerGuard()

  return (
    <DashboardLayout title="Personalización del Casino">
      <div className="mx-auto w-full max-w-2xl space-y-2">
        <p className="text-sm text-muted-foreground pb-2">
          Configurá cómo se ve el casino para los jugadores. Cada sección se edita por separado.
        </p>
        {ITEMS.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3 hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
