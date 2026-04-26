"use client"

import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Edit, ToggleLeft, ToggleRight, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, Gamepad2,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useGames } from "@/hooks/useGames"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { UpdateGameDto, Game } from "helper"
import { formatChips } from "@/lib/utils"
import { apiService } from "@/services/api.service"

type StatusFilter = 'all' | 'active' | 'inactive'

export default function AdminGames() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const [providers, setProviders] = useState<string[]>([])
  const [gameTypes, setGameTypes] = useState<string[]>([])

  const {
    games, loading, page, totalPages, total,
    goToPage, updateGame, toggleGameStatus, bulkSetStatus, bulkSetStatusByFilter, syncGames
  } = useGames({
    status: statusFilter,
    providerName: providerFilter === 'all' ? null : providerFilter,
    gameType: typeFilter === 'all' ? null : typeFilter,
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", minBet: 1, maxBet: 1000, houseEdge: 2.5 })
  const [submitting, setSubmitting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    Promise.all([
      apiService.get<{ providers: string[] }>('/games/providers'),
      apiService.get<{ types: string[] }>('/games/types'),
    ]).then(([pRes, tRes]) => {
      if (pRes.success && pRes.data) setProviders(pRes.data.providers)
      if (tRes.success && tRes.data) setGameTypes(tRes.data.types)
    })
  }, [])

  useEffect(() => { setSelected(new Set()) }, [statusFilter, providerFilter, typeFilter, page])

  if (!user) return null

  const filtersActive = statusFilter !== 'all' || providerFilter !== 'all' || typeFilter !== 'all'
  const allPageSelected = games.length > 0 && games.every(g => selected.has(g.id))
  const someSelected = selected.size > 0

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(games.map(g => g.id)))
    }
  }

  // Bulk activate/deactivate selected IDs (current page)
  const handleBulkSelected = async (isActive: boolean) => {
    setBulkLoading(true)
    try {
      const response = await bulkSetStatus(Array.from(selected), isActive)
      if (response.success) {
        toast({ title: isActive ? "Juegos activados" : "Juegos desactivados", description: response.data?.message })
        setSelected(new Set())
      } else {
        toast({ title: "Error", description: response.error?.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk activate/deactivate ALL games matching current filters (ignores pagination)
  const handleBulkFiltered = async (isActive: boolean) => {
    setBulkLoading(true)
    try {
      const response = await bulkSetStatusByFilter(isActive, {
        providerName: providerFilter === 'all' ? null : providerFilter,
        gameType: typeFilter === 'all' ? null : typeFilter,
        currentStatus: statusFilter === 'all' ? undefined : statusFilter,
      })
      if (response.success) {
        toast({ title: isActive ? "Juegos activados" : "Juegos desactivados", description: response.data?.message })
        setSelected(new Set())
      } else {
        toast({ title: "Error", description: response.error?.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await syncGames()
      if (response.success) {
        toast({ title: "Sincronización completa", description: `${response.data?.synced ?? 0} juegos sincronizados` })
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo sincronizar", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedGame) return
    setSubmitting(true)
    try {
      const updateData: UpdateGameDto = {
        name: formData.name,
        description: formData.description,
        minBet: formData.minBet,
        maxBet: formData.maxBet,
        houseEdge: formData.houseEdge,
      }
      const response = await updateGame(selectedGame.id, updateData)
      if (response.success) {
        toast({ title: "Juego actualizado", description: `${formData.name} actualizado exitosamente` })
        setIsEditDialogOpen(false)
        setSelectedGame(null)
      } else {
        toast({ title: "Error", description: response.error?.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (gameId: string) => {
    try {
      const response = await toggleGameStatus(gameId)
      if (!response.success) {
        toast({ title: "Error", description: response.error?.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const openEditDialog = (game: Game) => {
    setSelectedGame(game)
    setFormData({ name: game.name, description: game.description, minBet: game.minBet, maxBet: game.maxBet, houseEdge: game.houseEdge })
    setIsEditDialogOpen(true)
  }

  return (
    <DashboardLayout title="Juegos">
      {/* Top action bar */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Sincronizar</span>
        </Button>

        {/* Select all on current page */}
        <div
          role="button"
          tabIndex={games.length === 0 ? -1 : 0}
          onClick={games.length === 0 ? undefined : toggleSelectAll}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (games.length > 0) toggleSelectAll(); } }}
          aria-disabled={games.length === 0}
          className={`inline-flex items-center justify-center gap-1.5 ml-auto rounded-md border border-input bg-background px-3 h-8 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${games.length === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        >
          <Checkbox
            checked={allPageSelected}
            className="h-3.5 w-3.5 pointer-events-none"
            aria-hidden
          />
          <span>{allPageSelected ? 'Deseleccionar' : 'Seleccionar'} página</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        {providers.length > 0 && (
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {providers.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {gameTypes.length > 0 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {gameTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setStatusFilter('all'); setProviderFilter('all'); setTypeFilter('all') }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Bulk action bar — shows when items selected OR filters active */}
      {(someSelected || filtersActive) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-lg bg-muted/60 border border-border">
          {someSelected ? (
            <>
              <span className="text-xs font-medium text-foreground">
                {selected.size} seleccionado{selected.size !== 1 ? 's' : ''} en esta página
              </span>
              <div className="flex gap-1.5 ml-auto flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleBulkSelected(true)} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleRight className="h-3 w-3" />}
                  Activar seleccionados
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleBulkSelected(false)} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleLeft className="h-3 w-3" />}
                  Desactivar seleccionados
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {total} juego{total !== 1 ? 's' : ''} con los filtros actuales
              </span>
              <div className="flex gap-1.5 ml-auto flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleBulkFiltered(true)} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleRight className="h-3 w-3" />}
                  Activar todos
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleBulkFiltered(false)} disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleLeft className="h-3 w-3" />}
                  Desactivar todos
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Game grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : games.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay juegos disponibles</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {games.map((game) => {
            const isSelected = selected.has(game.id)
            return (
              <Card
                key={game.id}
                className={`overflow-hidden transition-colors ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail + checkbox */}
                  <div className="shrink-0 relative">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {game.defaultLogo ? (
                        <img src={game.defaultLogo} alt={game.name} className="w-full h-full object-cover" />
                      ) : (
                        <Gamepad2 className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="absolute -top-1 -left-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(game.id)}
                        className="h-4 w-4 bg-background border-border shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="font-semibold text-sm leading-tight truncate">{game.name}</p>
                      <Badge
                        variant={game.isActive ? "default" : "secondary"}
                        className="shrink-0 text-[10px] px-1.5 py-0"
                      >
                        {game.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    {game.providerName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1.5">{game.providerName}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Min ${formatChips(game.minBet)} · Max ${formatChips(game.maxBet)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Edge {game.houseEdge}%
                      {game.gameType && <span className="ml-1 opacity-60">· {game.gameType}</span>}
                    </p>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex gap-2 px-3 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => openEditDialog(game)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={game.isActive ? "destructive" : "default"}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleToggleStatus(game.id)}
                  >
                    {game.isActive
                      ? <><ToggleLeft className="h-3 w-3 mr-1" />Desactivar</>
                      : <><ToggleRight className="h-3 w-3 mr-1" />Activar</>}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            {total} juego{total !== 1 ? 's' : ''} · pág {page}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Juego</DialogTitle>
            <DialogDescription>Modifica la configuración del juego</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Juego</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minBet">Apuesta Mínima ($)</Label>
                <Input id="edit-minBet" type="number" step="0.01" value={formData.minBet} onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="edit-maxBet">Apuesta Máxima ($)</Label>
                <Input id="edit-maxBet" type="number" step="0.01" value={formData.maxBet} onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-houseEdge">House Edge (%)</Label>
              <Input id="edit-houseEdge" type="number" step="0.1" value={formData.houseEdge} onChange={(e) => setFormData({ ...formData, houseEdge: parseFloat(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
