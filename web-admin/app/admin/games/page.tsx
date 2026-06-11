"use client"

import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Edit, Loader2, Gamepad2, ImageIcon, Search,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { UpdateGameDto, Game } from "helper"
import { UserRole } from "helper"
import { formatChips } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { GameImageManager } from "@/components/admin/game-image-manager"

type StatusFilter = 'all' | 'active' | 'inactive'

export default function AdminGames() {
  const { user, role } = useAuth()
  const { toast } = useToast()
  const isOwner = role === UserRole.OWNER

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<'default' | 'az' | 'za'>('default')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  const [providers, setProviders] = useState<string[]>([])
  const [gameTypes, setGameTypes] = useState<string[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350)
    return () => clearTimeout(t)
  }, [searchTerm])

  const {
    games: rawGames, loading, loadingMore, hasMore, total,
    loadMore, updateGame, bulkSetStatus
  } = useGames({
    status: statusFilter,
    providerName: providerFilter === 'all' ? null : providerFilter,
    gameType: typeFilter === 'all' ? null : typeFilter,
    search: debouncedSearch || undefined,
  })

  const games = sortBy === 'az'
    ? [...rawGames].sort((a, b) => a.name.localeCompare(b.name))
    : sortBy === 'za'
      ? [...rawGames].sort((a, b) => b.name.localeCompare(a.name))
      : rawGames

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [formData, setFormData] = useState({ description: "", minBet: 1, maxBet: 1000, houseEdge: 2.5, sortOrder: "" as string })
  const [submitting, setSubmitting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [imageManagerGame, setImageManagerGame] = useState<{ id: string; name: string; defaultLogo: string | null } | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      apiService.get<{ providers: string[] }>('/games/providers'),
      apiService.get<{ types: string[] }>('/games/types'),
    ]).then(([pRes, tRes]) => {
      if (pRes.success && pRes.data) setProviders(pRes.data.providers)
      if (tRes.success && tRes.data) setGameTypes(tRes.data.types)
    })
  }, [])

  useEffect(() => { setSelected(new Set()) }, [statusFilter, providerFilter, typeFilter])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  if (!user) return null

  const filtersActive = statusFilter !== 'all' || providerFilter !== 'all' || typeFilter !== 'all'
  const allPageSelected = games.length > 0 && games.every(g => selected.has(g.id))
  const someSelected = selected.size > 0
  const allSelectedActive = someSelected && games.filter(g => selected.has(g.id)).every(g => g.isActive)

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

  const handleEdit = async () => {
    if (!selectedGame) return
    setSubmitting(true)
    try {
      const updateData: UpdateGameDto = {
        description: formData.description,
        minBet: formData.minBet,
        maxBet: formData.maxBet,
        houseEdge: formData.houseEdge,
        sortOrder: formData.sortOrder !== "" ? Number(formData.sortOrder) : null,
      }
      const response = await updateGame(selectedGame.id, updateData)
      if (response.success) {
        toast({ title: "Juego actualizado", description: `${selectedGame.name} actualizado exitosamente` })
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

  const openEditDialog = (game: Game) => {
    setSelectedGame(game)
    setFormData({ description: game.description, minBet: game.minBet, maxBet: game.maxBet, houseEdge: game.houseEdge, sortOrder: game.sortOrder != null ? String(game.sortOrder) : "" })
    setIsEditDialogOpen(true)
  }

  return (
    <DashboardLayout title="Juegos">
      {/* Filter bar */}
      <div className="space-y-2 mb-3">
        {/* Row 0: search + sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar juegos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={sortBy} onValueChange={v => setSortBy(v as 'default' | 'az' | 'za')}>
            <SelectTrigger className="h-8 w-[120px] text-xs shrink-0">
              <span>{sortBy === 'default' ? 'Ordenar' : sortBy === 'az' ? 'A → Z' : 'Z → A'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Por defecto</SelectItem>
              <SelectItem value="az">A → Z</SelectItem>
              <SelectItem value="za">Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 1: status tabs + switch */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden flex-1">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
          {bulkLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
          <Label htmlFor="bulk-switch" className="text-xs text-muted-foreground cursor-pointer shrink-0">Activo</Label>
          <Switch
            id="bulk-switch"
            checked={allSelectedActive}
            onCheckedChange={handleBulkSelected}
            disabled={!someSelected || bulkLoading}
          />
        </div>

        {/* Row 2: dropdowns + actions */}
        <div className="flex items-center gap-2">
          {providers.length > 0 && (
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-8 flex-1 min-w-0 text-xs">
                <span className="truncate">
                  {providerFilter === 'all' ? 'Proveedores' : providerFilter}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {gameTypes.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 flex-1 min-w-0 text-xs">
                <span className="truncate">
                  {typeFilter === 'all' ? 'Tipos' : typeFilter}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {gameTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {someSelected && (
            <Button size="sm" variant="ghost" className="h-8 text-xs px-2 shrink-0" onClick={() => setSelected(new Set())}>
              Cancelar
            </Button>
          )}

          {filtersActive && !someSelected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground px-2 shrink-0"
              onClick={() => { setStatusFilter('all'); setProviderFilter('all'); setTypeFilter('all') }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>


      {/* Game table */}
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
        <>
          {/* Mobile/tablet: row-cards (same pattern as Providers) */}
          <div className="space-y-1.5 lg:hidden">
            {games.map((game) => {
              const isSelected = selected.has(game.id)
              const logo = game.customLogo || game.defaultLogo
              return (
                <div
                  key={game.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  onClick={() => toggleSelect(game.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(game.id)}
                    className="h-4 w-4 shrink-0 bg-white dark:bg-white border-gray-400"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="h-11 w-11 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {logo ? (
                      <img src={logo} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{game.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {game.providerName ?? '—'}{game.gameType ? ` · ${game.gameType}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <Badge
                      variant={game.isActive ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {game.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    {isOwner && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        RTP {game.rtp != null ? `${game.rtp}%` : '—'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Imágenes"
                      onClick={e => { e.stopPropagation(); setImageManagerGame({ id: game.id, name: game.name, defaultLogo: game.defaultLogo ?? null }) }}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Editar"
                      onClick={e => { e.stopPropagation(); openEditDialog(game) }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Wide desktop: table */}
          <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-4 py-3 text-left">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                      className="h-4 w-4 bg-white dark:bg-white border-gray-400"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">Juego</th>
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">Proveedor</th>
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">Min / Max</th>
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Edge</th>
                  {isOwner && (
                    <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">RTP</th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-sm text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-sm text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {games.map((game) => {
                  const isSelected = selected.has(game.id)
                  return (
                    <tr
                      key={game.id}
                      className={`transition-colors hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(game.id)}
                          className="h-4 w-4 bg-white dark:bg-white border-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {game.defaultLogo ? (
                              <img src={game.defaultLogo} alt={game.name} className="w-full h-full object-cover" />
                            ) : (
                              <Gamepad2 className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[200px]">{game.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {game.providerName ? (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">{game.providerName}</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {game.gameType || <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        ${formatChips(game.minBet)} / ${formatChips(game.maxBet)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                        {game.houseEdge}%
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {game.rtp != null ? `${game.rtp}%` : <span className="opacity-40">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge
                          variant={game.isActive ? "default" : "secondary"}
                          className="text-xs px-2 py-0.5"
                        >
                          {game.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-sm px-3"
                            onClick={() => setImageManagerGame({ id: game.id, name: game.name, defaultLogo: game.defaultLogo ?? null })}
                          >
                            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                            Imágenes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-sm px-3"
                            onClick={() => openEditDialog(game)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!loading && !hasMore && total > 0 && (
        <p className="text-center text-xs text-muted-foreground py-3">
          {total} juego{total !== 1 ? 's' : ''} en total
        </p>
      )}

      {/* Image Manager Dialog */}
      {imageManagerGame && (
        <GameImageManager
          gameId={imageManagerGame.id}
          gameName={imageManagerGame.name}
          defaultLogo={imageManagerGame.defaultLogo}
          open={!!imageManagerGame}
          onOpenChange={open => !open && setImageManagerGame(null)}
        />
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
            <div>
              <Label htmlFor="edit-sortOrder">Orden (vacío = automático)</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                min="1"
                placeholder="Automático (alfabético)"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Orden relativo dentro del proveedor y tipo. Vacío = al final, alfabético.</p>
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
