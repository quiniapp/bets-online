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
import { GripVertical, Loader2, Building2, Upload } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useProviders } from "@/hooks/useProviders"
import type { Provider } from "helper"

function ProviderLogoUpload({
  providerName,
  onUploaded,
}: {
  providerName: string
  onUploaded: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      const res = await fetch(`/api/admin/providers/${encodeURIComponent(providerName)}/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const json = await res.json()
      if (json.success) onUploaded()
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
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        title="Subir logo"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}

function ProviderRow({ provider, onLogoUploaded }: { provider: Provider; onLogoUploaded: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.name,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-3 touch-manipulation"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="w-9 h-9 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {provider.logoUrl ? (
          <img src={provider.logoUrl} alt={provider.name} className="w-full h-full object-contain" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <span className="flex-1 font-medium text-sm truncate">
        {provider.displayName ?? provider.name}
      </span>
      <ProviderLogoUpload providerName={provider.name} onUploaded={onLogoUploaded} />
      <Badge variant={provider.isActive ? "default" : "secondary"} className="text-xs shrink-0">
        {provider.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </div>
  )
}

function ProviderRowOverlay({ provider }: { provider: Provider }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-primary rounded-lg px-3 py-3 shadow-lg opacity-90">
      <div className="p-1 text-muted-foreground shrink-0">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="w-9 h-9 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {provider.logoUrl ? (
          <img src={provider.logoUrl} alt={provider.name} className="w-full h-full object-contain" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <span className="flex-1 font-medium text-sm truncate">
        {provider.displayName ?? provider.name}
      </span>
      <Badge variant={provider.isActive ? "default" : "secondary"} className="text-xs shrink-0">
        {provider.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </div>
  )
}

export default function AdminProviders() {
  const { providers, setProviders, loading, saving, fetchProviders, saveOrder } = useProviders(true)
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalOrder, setOriginalOrder] = useState<Provider[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const provider = providers.find(p => p.name === event.active.id)
    setActiveProvider(provider ?? null)
    if (!hasChanges) setOriginalOrder([...providers])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProvider(null)
    if (!over || active.id === over.id) return

    setProviders(prev => {
      const oldIndex = prev.findIndex(p => p.name === active.id)
      const newIndex = prev.findIndex(p => p.name === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    const result = await saveOrder(providers)
    if (result.success) {
      toast({ title: "Orden guardado", description: "El orden de proveedores fue actualizado" })
      setHasChanges(false)
      setOriginalOrder([])
    } else {
      toast({ title: "Error", description: "No se pudo guardar el orden", variant: "destructive" })
    }
  }

  const handleCancel = () => {
    if (originalOrder.length > 0) setProviders(originalOrder)
    setHasChanges(false)
    setOriginalOrder([])
  }

  return (
    <DashboardLayout title="Proveedores">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Arrastrá para reordenar. El orden afecta cómo se agrupan los juegos.
        </p>
        {hasChanges && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 shrink-0">
            Cambios pendientes
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay proveedores</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={providers.map(p => p.name)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {providers.map(provider => (
                <ProviderRow key={provider.name} provider={provider} onLogoUploaded={fetchProviders} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeProvider && <ProviderRowOverlay provider={activeProvider} />}
          </DragOverlay>
        </DndContext>
      )}

      <div className="flex gap-2 mt-6">
        {hasChanges && (
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Guardando..." : "Guardar orden"}
        </Button>
      </div>
    </DashboardLayout>
  )
}
