"use client"

import { useState, useRef, useEffect } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical, Loader2, Star, X, Plus, Gamepad2, Search,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useFeaturedGames } from "@/hooks/useFeaturedGames"
import { useGames } from "@/hooks/useGames"
import type { FeaturedGameWithGame, Game } from "helper"
import { UserRole } from "helper"
import { useAuth } from "@/contexts/auth-context"

function FeaturedRow({
  item,
  onToggleActive,
  onRemove,
}: {
  item: FeaturedGameWithGame
  onToggleActive: (id: string, isActive: boolean) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 touch-manipulation"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="w-9 h-9 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {item.game?.defaultLogo ? (
          <img src={item.game.defaultLogo} alt={item.game.name} className="w-full h-full object-cover" />
        ) : (
          <Gamepad2 className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.game?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground truncate">{item.game?.providerName ?? ""}</p>
      </div>
      <Switch
        checked={item.isActive}
        onCheckedChange={checked => onToggleActive(item.id, checked)}
        className="shrink-0"
      />
      <button
        onClick={() => onRemove(item.id)}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        aria-label="Eliminar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function FeaturedRowOverlay({ item }: { item: FeaturedGameWithGame }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-primary rounded-lg px-3 py-2.5 shadow-lg opacity-90">
      <div className="p-1 text-muted-foreground shrink-0">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="w-9 h-9 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {item.game?.defaultLogo ? (
          <img src={item.game.defaultLogo} alt={item.game.name} className="w-full h-full object-cover" />
        ) : (
          <Gamepad2 className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.game?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground truncate">{item.game?.providerName ?? ""}</p>
      </div>
    </div>
  )
}

function AddGameDialog({
  open,
  onClose,
  onAdd,
  existingGameIds,
}: {
  open: boolean
  onClose: () => void
  onAdd: (game: Game) => void
  existingGameIds: Set<string>
}) {
  const [search, setSearch] = useState("")
  const { role } = useAuth()
  const isOwner = role === UserRole.OWNER
  const { games, loading, loadMore, hasMore, loadingMore } = useGames({ activeOnly: true, search })
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loadingMore])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar juego destacado</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar juego..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : games.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
          ) : (
            games.map(game => {
              const already = existingGameIds.has(game.id)
              return (
                <button
                  key={game.id}
                  disabled={already}
                  onClick={() => { onAdd(game); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {game.defaultLogo ? (
                      <img src={game.defaultLogo} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{game.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{game.providerName}{isOwner && game.rtp != null ? ` · RTP ${game.rtp}%` : ''}</p>
                  </div>
                  {already && <Badge variant="secondary" className="text-xs shrink-0">Ya agregado</Badge>}
                </button>
              )
            })
          )}
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminFeaturedGames() {
  const { items, setItems, loading, saving, create, update, remove, saveOrder, maxSortOrder } = useFeaturedGames()
  const { toast } = useToast()
  const [activeItem, setActiveItem] = useState<FeaturedGameWithGame | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find(i => i.id === event.active.id)
    setActiveItem(item ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id)
      const newIndex = prev.findIndex(i => i.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    const result = await saveOrder(items)
    if (result.success) {
      toast({ title: "Orden guardado" })
      setHasChanges(false)
    } else {
      toast({ title: "Error al guardar", variant: "destructive" })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const result = await update(id, { isActive })
    if (!result.success) {
      toast({ title: "Error al actualizar", variant: "destructive" })
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    const result = await remove(id)
    setRemovingId(null)
    if (!result.success) {
      toast({ title: "Error al eliminar", variant: "destructive" })
    }
  }

  const handleAdd = async (game: Game) => {
    const result = await create({ gameId: game.id, sortOrder: maxSortOrder + 1 })
    if (!result.success) {
      toast({ title: "Error al agregar", variant: "destructive" })
    }
  }

  const existingGameIds = new Set(items.map(i => i.gameId))

  return (
    <DashboardLayout title="Juegos Destacados">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Arrastrá para reordenar. Usá el switch para activar/desactivar.
        </p>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No hay juegos destacados</p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar primero
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className={removingId === item.id ? "opacity-50 pointer-events-none" : ""}>
                  <FeaturedRow
                    item={item}
                    onToggleActive={handleToggleActive}
                    onRemove={handleRemove}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem && <FeaturedRowOverlay item={activeItem} />}
          </DragOverlay>
        </DndContext>
      )}

      {hasChanges && (
        <div className="mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Guardando..." : "Guardar orden"}
          </Button>
        </div>
      )}

      <AddGameDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAdd}
        existingGameIds={existingGameIds}
      />
    </DashboardLayout>
  )
}
