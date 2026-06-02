"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  DragOverlay, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';
import { apiService } from '@/services/api.service';
import type { Game } from 'helper';

const PAGE_SIZE = 20;

function GameRow({ game }: { game: Game }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: game.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 bg-card border rounded-md px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        type="button"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {game.customLogo || game.defaultLogo ? (
        <img src={(game.customLogo || game.defaultLogo)!} alt={game.name} className="h-8 w-8 rounded object-contain bg-muted shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded bg-muted shrink-0" />
      )}
      <span className="text-sm truncate flex-1">{game.name}</span>
    </div>
  );
}

function GameRowOverlay({ game }: { game: Game }) {
  return (
    <div className="flex items-center gap-2 bg-card border border-primary rounded-md px-3 py-2 shadow-lg opacity-90">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      {game.customLogo || game.defaultLogo ? (
        <img src={(game.customLogo || game.defaultLogo)!} alt={game.name} className="h-8 w-8 rounded object-contain bg-muted shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded bg-muted shrink-0" />
      )}
      <span className="text-sm truncate flex-1">{game.name}</span>
    </div>
  );
}

export function GameOrderEditor() {
  const { providers, loading: loadingProviders } = useProviders(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPage = useCallback(async (providerName: string, targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoadingGames(true);
    try {
      const qs = new URLSearchParams({ providerName, limit: String(PAGE_SIZE), page: String(targetPage) });
      const res = await apiService.get<Game[]>(`/games?${qs.toString()}`);
      if (res.success && res.data) {
        const sorted = [...res.data].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
        setGames(prev => append ? [...prev, ...sorted] : sorted);
        setPage(res.meta?.page ?? targetPage);
        setTotalPages(res.meta?.totalPages ?? 1);
        setTotal(res.meta?.total ?? 0);
      }
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      setGames([]);
      setPage(1);
      setTotalPages(1);
      setTotal(0);
      setHasChanges(false);
      loadPage(selectedProvider, 1, false);
    } else {
      setGames([]);
    }
  }, [selectedProvider, loadPage]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && !loadingGames && page < totalPages && selectedProvider) {
          loadPage(selectedProvider, page + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadingMore, loadingGames, page, totalPages, selectedProvider, loadPage]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGame(games.find(g => g.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGame(null);
    if (!over || active.id === over.id) return;
    setGames(prev => {
      const oldIdx = prev.findIndex(g => g.id === active.id);
      const newIdx = prev.findIndex(g => g.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        games.map((g, i) => apiService.patch(`/games/${g.id}`, { sortOrder: i + 1 }))
      );
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Seleccionar proveedor" />
          </SelectTrigger>
          <SelectContent>
            {loadingProviders ? (
              <SelectItem value="__loading" disabled>Cargando...</SelectItem>
            ) : (
              providers.map(p => (
                <SelectItem key={p.name} value={p.name}>
                  {p.displayName ?? p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedProvider && !loadingGames && (
          <span className="text-sm text-muted-foreground">{total} juegos</span>
        )}
        {games.length > 0 && (
          <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {saving ? 'Guardando...' : 'Guardar orden'}
          </Button>
        )}
      </div>

      {!selectedProvider && (
        <p className="text-sm text-muted-foreground">Seleccioná un proveedor para ordenar sus juegos.</p>
      )}

      {loadingGames && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </div>
      )}

      {!loadingGames && games.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Arrastrá para reordenar. El orden se aplica en el lobby.
            {page < totalPages && ` (${games.length} de ${total} cargados)`}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={games.map(g => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {games.map(game => <GameRow key={game.id} game={game} />)}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeGame && <GameRowOverlay game={activeGame} />}
            </DragOverlay>
          </DndContext>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-2 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </>
      )}
    </div>
  );
}
