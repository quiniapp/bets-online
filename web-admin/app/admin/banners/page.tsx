"use client"

import { useState, useRef } from "react"
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
import { GripVertical, Loader2, ImageIcon, X, Upload } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useGameBanners } from "@/hooks/useGameBanners"
import type { GameBanner } from "helper"

function BannerThumb({ url }: { url?: string | null }) {
  return (
    <div className="w-16 h-10 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
      {url ? (
        <img src={url} alt="banner" className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
      )}
    </div>
  )
}

function ReplaceImageButton({
  bannerId,
  onUploaded,
}: {
  bannerId: string
  onUploaded: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const formData = new FormData()
    formData.append("image", file)
    setUploading(true)
    try {
      const res = await fetch(`/api/admin/banners/${bannerId}/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const json = await res.json()
      if (json.success) onUploaded()
      else toast({ title: "Error al subir la imagen", variant: "destructive" })
    } catch {
      toast({ title: "Error al subir la imagen", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
        aria-label="Reemplazar imagen"
        title="Reemplazar imagen"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </button>
    </>
  )
}

function BannerRow({
  item,
  onToggleActive,
  onRemove,
  onImageUploaded,
}: {
  item: GameBanner
  onToggleActive: (id: string, isActive: boolean) => void
  onRemove: (id: string) => void
  onImageUploaded: () => void
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
      <BannerThumb url={item.imageUrl} />
      <div className="flex-1 min-w-0" />
      <Switch
        checked={item.isActive}
        onCheckedChange={checked => onToggleActive(item.id, checked)}
        className="shrink-0"
      />
      <ReplaceImageButton bannerId={item.id} onUploaded={onImageUploaded} />
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

function BannerRowOverlay({ item }: { item: GameBanner }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-primary rounded-lg px-3 py-2.5 shadow-lg opacity-90">
      <div className="p-1 text-muted-foreground shrink-0">
        <GripVertical className="h-5 w-5" />
      </div>
      <BannerThumb url={item.imageUrl} />
      <div className="flex-1 min-w-0" />
    </div>
  )
}

function UploadBannerButton({ onUploaded }: { onUploaded: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const formData = new FormData()
    formData.append("image", file)
    setUploading(true)
    try {
      const res = await fetch(`/api/admin/banners`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const json = await res.json()
      if (json.success) onUploaded()
      else toast({ title: "Error al subir el banner", variant: "destructive" })
    } catch {
      toast({ title: "Error al subir el banner", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button size="sm" className="shrink-0" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
        {uploading ? "Subiendo..." : "Subir banner"}
      </Button>
    </>
  )
}

export default function AdminBanners() {
  const { items, setItems, loading, saving, fetchAll, update, remove, saveOrder } = useGameBanners()
  const { toast } = useToast()
  const [activeItem, setActiveItem] = useState<GameBanner | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
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
    if (!result.success) toast({ title: "Error al actualizar", variant: "destructive" })
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    const result = await remove(id)
    setRemovingId(null)
    if (!result.success) toast({ title: "Error al eliminar", variant: "destructive" })
  }

  return (
    <DashboardLayout title="Banners">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Subí imágenes desde el celular o la PC. Arrastrá para reordenar, usá el switch para activar/desactivar.
        </p>
        <UploadBannerButton onUploaded={fetchAll} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No hay banners configurados</p>
          <UploadBannerButton onUploaded={fetchAll} />
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
                  <BannerRow
                    item={item}
                    onToggleActive={handleToggleActive}
                    onRemove={handleRemove}
                    onImageUploaded={fetchAll}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeItem && <BannerRowOverlay item={activeItem} />}</DragOverlay>
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
    </DashboardLayout>
  )
}
