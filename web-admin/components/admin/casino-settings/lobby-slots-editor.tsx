"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { DraggableItem } from './draggable-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useProviders } from '@/hooks/useProviders';
import { useGameTypes } from '@/hooks/useGameTypes';
import { apiService } from '@/services/api.service';
import { typeLabel } from './type-labels';
import { MAX_LOBBY_SLOTS, type LobbySlot, type LobbySlotKind, type Provider, type ProviderTypeOrderItem } from 'helper';

function newSlotId() {
  return Math.random().toString(36).slice(2, 10);
}

interface CategoryOption {
  value: string;
  label: string;
}

interface LobbySlotRowProps {
  slot: LobbySlot;
  providers: Provider[];
  loadingProviders: boolean;
  categoryOptions: CategoryOption[];           // global types (kind=category)
  providerCategoryOptions: CategoryOption[] | null; // types of slot.providerName (kind=both); null = loading
  onChange: (updated: LobbySlot) => void;
  onRemove: () => void;
}

function LobbySlotRow({
  slot, providers, loadingProviders, categoryOptions, providerCategoryOptions, onChange, onRemove,
}: LobbySlotRowProps) {
  const needsProviderTypes = slot.kind === 'both';
  const options = needsProviderTypes ? providerCategoryOptions : categoryOptions;
  const categoryDisabled = needsProviderTypes && (!slot.providerName || providerCategoryOptions === null);

  const handleKindChange = (kind: LobbySlotKind) => {
    // Switching to "both" re-scopes categories to the provider → drop a
    // category that may not belong to it.
    onChange({ ...slot, kind, ...(kind === 'both' ? { categoryType: undefined } : {}) });
  };

  const handleProviderChange = (providerName: string) => {
    onChange({
      ...slot,
      providerName,
      // Provider changed → its category list changes too; reset to avoid a
      // category the provider doesn't have.
      ...(slot.kind === 'both' ? { categoryType: undefined } : {}),
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
      <Select value={slot.kind} onValueChange={v => handleKindChange(v as LobbySlotKind)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="category">Categoría</SelectItem>
          <SelectItem value="provider">Proveedor</SelectItem>
          <SelectItem value="both">Ambos</SelectItem>
        </SelectContent>
      </Select>

      {(slot.kind === 'provider' || slot.kind === 'both') && (
        <Select value={slot.providerName ?? ''} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            {loadingProviders ? (
              <SelectItem value="__loading" disabled>Cargando...</SelectItem>
            ) : (
              providers.map(p => (
                <SelectItem key={p.name} value={p.name}>{p.displayName ?? p.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {(slot.kind === 'category' || slot.kind === 'both') && (
        <Select
          value={slot.categoryType ?? ''}
          onValueChange={v => onChange({ ...slot, categoryType: v })}
          disabled={categoryDisabled}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={
              slot.kind === 'both' && !slot.providerName
                ? 'Elegí proveedor primero'
                : categoryDisabled ? 'Cargando categorías...' : 'Categoría'
            } />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Input
        className="w-36"
        placeholder="Etiqueta"
        value={slot.label}
        onChange={e => onChange({ ...slot, label: e.target.value })}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-700 flex-shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface LobbySlotEditorProps {
  slots: LobbySlot[];
  saving: boolean;
  onSave: (slots: LobbySlot[]) => void;
}

export function LobbySlotEditor({ slots, saving, onSave }: LobbySlotEditorProps) {
  const [items, setItems] = useState<LobbySlot[]>(slots);
  const { providers, loading: loadingProviders } = useProviders(true);
  const { gameTypes, label } = useGameTypes();
  // Per-provider category options, fetched lazily; undefined = not requested,
  // null = loading.
  const [providerTypes, setProviderTypes] = useState<Record<string, CategoryOption[] | null>>({});

  useEffect(() => { setItems(slots); }, [slots]);

  const activeProviders = providers.filter(p => p.isActive);

  const requestedProviders = useRef<Set<string>>(new Set());
  const ensureProviderTypes = useCallback((providerName: string) => {
    if (requestedProviders.current.has(providerName)) return;
    requestedProviders.current.add(providerName);
    setProviderTypes(p => ({ ...p, [providerName]: null }));
    apiService.get<{ items: ProviderTypeOrderItem[] }>(
      `/admin/providers/${encodeURIComponent(providerName)}/type-orders`
    ).then(res => {
      const opts = (res.success && res.data ? res.data.items : []).map(i => ({
        value: i.gameType,
        label: typeLabel(i.gameType, i.displayName),
      }));
      setProviderTypes(p => ({ ...p, [providerName]: opts }));
    }).catch(() => {
      setProviderTypes(p => ({ ...p, [providerName]: [] }));
    });
  }, []);

  // Pre-load category options for every "both" slot with a provider chosen.
  useEffect(() => {
    items.forEach(slot => {
      if (slot.kind === 'both' && slot.providerName) ensureProviderTypes(slot.providerName);
    });
  }, [items, ensureProviderTypes]);

  const categoryOptions: CategoryOption[] = gameTypes.map(t => ({
    value: t.name,
    label: label(t.name),
  }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(s => s.id === active.id);
        const newIdx = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const addSlot = () => {
    if (items.length >= MAX_LOBBY_SLOTS) return;
    setItems(prev => [
      ...prev,
      { id: newSlotId(), kind: 'category', categoryType: 'videoSlots', label: 'Casino' },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Máximo {MAX_LOBBY_SLOTS} slots. Arrastrá para reordenar.
          </p>
          <Badge variant="outline">{items.length} / {MAX_LOBBY_SLOTS}</Badge>
        </div>
        <Button onClick={() => onSave(items)} disabled={saving} size="sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {saving ? 'Guardando...' : 'Guardar slots'}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(slot => (
              <DraggableItem key={slot.id} id={slot.id}>
                <LobbySlotRow
                  slot={slot}
                  providers={activeProviders}
                  loadingProviders={loadingProviders}
                  categoryOptions={categoryOptions}
                  providerCategoryOptions={
                    slot.providerName ? (providerTypes[slot.providerName] ?? null) : null
                  }
                  onChange={updated => setItems(prev => prev.map(s => s.id === slot.id ? updated : s))}
                  onRemove={() => setItems(prev => prev.filter(s => s.id !== slot.id))}
                />
              </DraggableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSlot}
        disabled={items.length >= MAX_LOBBY_SLOTS}
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar slot
      </Button>
    </div>
  );
}
