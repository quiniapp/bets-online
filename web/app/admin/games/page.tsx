"use client"

import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CreateGameDto, UpdateGameDto, Game } from "helper"

export default function AdminGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { games, loading, page, totalPages, total, goToPage, createGame, updateGame, toggleGameStatus, syncGames } = useGames(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [formData, setFormData] = useState<CreateGameDto>({
    name: "",
    description: "",
    minBet: 1,
    maxBet: 1000,
    houseEdge: 2.5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  if (!user) return null

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

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const response = await createGame(formData)
      if (response.success) {
        toast({
          title: "Juego creado",
          description: `${formData.name} ha sido creado exitosamente`,
        })
        setIsCreateDialogOpen(false)
        setFormData({
          name: "",
          description: "",
          minBet: 1,
          maxBet: 1000,
          houseEdge: 2.5,
        })
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo crear el juego",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el juego",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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
        toast({
          title: "Juego actualizado",
          description: `${formData.name} ha sido actualizado exitosamente`,
        })
        setIsEditDialogOpen(false)
        setSelectedGame(null)
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo actualizar el juego",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el juego",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (gameId: string) => {
    try {
      const response = await toggleGameStatus(gameId)
      if (response.success) {
        toast({
          title: "Estado actualizado",
          description: response.data?.message || "Estado del juego actualizado",
        })
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo cambiar el estado",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (game: Game) => {
    setSelectedGame(game)
    setFormData({
      name: game.name,
      description: game.description,
      minBet: game.minBet,
      maxBet: game.maxBet,
      houseEdge: game.houseEdge,
    })
    setIsEditDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Juegos</h1>
            <p className="text-muted-foreground">Administrar juegos del casino</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Juego
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Juego</DialogTitle>
                <DialogDescription>Crea un nuevo juego para el casino</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Nombre del Juego</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ruleta, Blackjack, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del juego..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minBet">Apuesta Mínima ($)</Label>
                    <Input
                      id="minBet"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.minBet}
                      onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxBet">Apuesta Máxima ($)</Label>
                    <Input
                      id="maxBet"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.maxBet}
                      onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="houseEdge">House Edge (%)</Label>
                  <Input
                    id="houseEdge"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.houseEdge}
                    onChange={(e) => setFormData({ ...formData, houseEdge: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Porcentaje de ventaja de la casa (ej: 2.5%)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <main className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <Card key={game.id}>
                  <CardHeader>
                    {game.defaultLogo && (
                      <img src={game.defaultLogo} alt={game.name} className="w-full h-28 object-cover rounded-md mb-2" />
                    )}
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{game.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {game.providerName && (
                          <Badge variant="outline" className="text-xs">{game.providerName}</Badge>
                        )}
                        <Badge variant={game.isActive ? "default" : "secondary"}>
                          {game.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{game.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Apuesta mínima:</span>
                        <span className="font-medium">${game.minBet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Apuesta máxima:</span>
                        <span className="font-medium">${game.maxBet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">House Edge:</span>
                        <span className="font-medium">{game.houseEdge}%</span>
                      </div>
                      {game.providerGameId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Provider ID:</span>
                          <span className="font-mono text-xs truncate max-w-[140px]">{game.providerGameId}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => openEditDialog(game)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant={game.isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleStatus(game.id)}
                        className="flex-1"
                      >
                        {game.isActive ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && games.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">No hay juegos creados aún</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Juego
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {total} juego{total !== 1 ? 's' : ''} — página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </main>

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
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-minBet">Apuesta Mínima ($)</Label>
                  <Input
                    id="edit-minBet"
                    type="number"
                    step="0.01"
                    value={formData.minBet}
                    onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxBet">Apuesta Máxima ($)</Label>
                  <Input
                    id="edit-maxBet"
                    type="number"
                    step="0.01"
                    value={formData.maxBet}
                    onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-houseEdge">House Edge (%)</Label>
                <Input
                  id="edit-houseEdge"
                  type="number"
                  step="0.1"
                  value={formData.houseEdge}
                  onChange={(e) => setFormData({ ...formData, houseEdge: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
