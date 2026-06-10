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
import { GripVertical, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';
import { useProviderTypeOrders } from '@/hooks/useProviderTypeOrders';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';
import { typeLabel } from './type-labels';
import { GAMES_PAGE_LIMIT, type Game, type ProviderTypeOrderItem } from 'helper';

// ─── Game rows (drag game-by-game within provider+type) ─────────────────────

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

// ─── Games list of one provider+type (lazy, infinite scroll, dnd) ───────────

function TypeGamesList({ providerName, gameType }: { providerName: string; gameType: string }) {
  const { toast } = useToast();
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

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoadingGames(true);
    try {
      const qs = new URLSearchParams({
        providerName,
        gameType,
        limit: String(GAMES_PAGE_LIMIT),
        page: String(targetPage),
      });
      const res = await apiService.get<Game[]>(`/games?${qs.toString()}`);
      if (res.success && res.data) {
        // Server order is authoritative (provider → type rule → sortOrder → name)
        setGames(prev => append ? [...prev, ...res.data!] : res.data!);
        setPage(res.meta?.page ?? targetPage);
        setTotalPages(res.meta?.totalPages ?? 1);
        setTotal(res.meta?.total ?? 0);
      }
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingGames(false);
    }
  }, [providerName, gameType]);

  useEffect(() => {
    setGames([]);
    setPage(1);
    setTotalPages(1);
    setHasChanges(false);
    loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && !loadingGames && page < totalPages) {
          loadPage(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadingMore, loadingGames, page, totalPages, loadPage]);

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
      const res = await apiService.patch('/games/bulk-sort-order', {
        items: games.map((g, i) => ({ id: g.id, sortOrder: i + 1 })),
      });
      if (res.success) {
        setHasChanges(false);
        toast({ title: 'Guardado', description: 'Orden de juegos actualizado' });
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar el orden', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingGames) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
      </div>
    );
  }

  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No hay juegos de este tipo.</p>;
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Arrastrá para reordenar dentro del tipo.
          {page < totalPages && ` (${games.length} de ${total} cargados)`}
        </p>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {saving ? 'Guardando...' : 'Guardar juegos'}
        </Button>
      </div>
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
      <div ref={sentinelRef} className="py-1 flex justify-center">
        {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}

// ─── Sortable type group row (expandable) ────────────────────────────────────

interface TypeRowProps {
  item: ProviderTypeOrderItem;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function TypeRow({ item, expanded, onToggle, children }: TypeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.gameType });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border bg-card ${isDragging ? 'opacity-50 shadow-lg z-10' : ''}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          type="button"
          aria-label="Arrastrar tipo"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          {expanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="text-sm font-medium truncate">{typeLabel(item.gameType, item.displayName)}</span>
          <Badge variant="outline" className="ml-auto shrink-0">{item.gamesCount ?? 0} juegos</Badge>
        </button>
      </div>
      {expanded && <div className="border-t px-3 pb-3">{children}</div>}
    </div>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export function ProviderOrderingEditor() {
  const { toast } = useToast();
  const { providers, loading: loadingProviders } = useProviders(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const { types, setTypes, loading: loadingTypes, saving: savingTypes, saveOrder } = useProviderTypeOrders(selectedProvider || null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [hasTypeChanges, setHasTypeChanges] = useState(false);

  useEffect(() => {
    setExpandedType(null);
    setHasTypeChanges(false);
  }, [selectedProvider]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTypeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTypes(prev => {
      const oldIdx = prev.findIndex(t => t.gameType === active.id);
      const newIdx = prev.findIndex(t => t.gameType === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    setHasTypeChanges(true);
  };

  const handleSaveTypes = async () => {
    const ok = await saveOrder(types);
    if (ok) {
      setHasTypeChanges(false);
      toast({ title: 'Guardado', description: 'Orden de tipos actualizado. Los juegos nuevos del sync caen solos en su tipo.' });
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar el orden de tipos', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-full sm:w-56">
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
        {types.length > 0 && (
          <Button onClick={handleSaveTypes} disabled={!hasTypeChanges || savingTypes} size="sm">
            {savingTypes && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {savingTypes ? 'Guardando...' : 'Guardar orden de tipos'}
          </Button>
        )}
      </div>

      {!selectedProvider && (
        <p className="text-sm text-muted-foreground">
          Seleccioná un proveedor: primero ordenás sus tipos de juego y, expandiendo cada tipo, los juegos uno por uno.
        </p>
      )}

      {loadingTypes && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </div>
      )}

      {!loadingTypes && selectedProvider && types.length === 0 && (
        <p className="text-sm text-muted-foreground">Este proveedor no tiene juegos con tipo asignado.</p>
      )}

      {!loadingTypes && types.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Arrastrá los tipos para definir el orden de los grupos en el lobby. Tocá un tipo para ordenar sus juegos.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTypeDragEnd}>
            <SortableContext items={types.map(t => t.gameType)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {types.map(item => (
                  <TypeRow
                    key={item.gameType}
                    item={item}
                    expanded={expandedType === item.gameType}
                    onToggle={() => setExpandedType(prev => prev === item.gameType ? null : item.gameType)}
                  >
                    {expandedType === item.gameType && (
                      <TypeGamesList providerName={selectedProvider} gameType={item.gameType} />
                    )}
                  </TypeRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
