"use client"
import { useState, useEffect } from 'react';
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
import type { LobbySlot, LobbySlotKind } from 'helper';

const CATEGORY_OPTIONS: Record<string, string> = {
  videoSlots: 'Casino',
  LiveGames: 'Casino en Vivo',
  CrashGame: 'Crash',
  Roulette: 'Ruletas',
  Blackjack: 'Blackjack',
  Baccarat: 'Baccarat',
  Bingo: 'Bingo',
  Plinko: 'Plinko',
};

const MAX_SLOTS = 10;

function newSlotId() {
  return Math.random().toString(36).slice(2, 10);
}

interface LobbySlotRowProps {
  slot: LobbySlot;
  onChange: (updated: LobbySlot) => void;
  onRemove: () => void;
}

function LobbySlotRow({ slot, onChange, onRemove }: LobbySlotRowProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
      <Select
        value={slot.kind}
        onValueChange={v => onChange({ ...slot, kind: v as LobbySlotKind })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="category">Categoría</SelectItem>
          <SelectItem value="provider">Proveedor</SelectItem>
          <SelectItem value="both">Ambos</SelectItem>
        </SelectContent>
      </Select>

      {(slot.kind === 'category' || slot.kind === 'both') && (
        <Select
          value={slot.categoryType ?? ''}
          onValueChange={v => onChange({ ...slot, categoryType: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_OPTIONS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(slot.kind === 'provider' || slot.kind === 'both') && (
        <Input
          className="w-32"
          placeholder="Proveedor (slug)"
          value={slot.providerName ?? ''}
          onChange={e => onChange({ ...slot, providerName: e.target.value })}
        />
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
  useEffect(() => { setItems(slots); }, [slots]);

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
    if (items.length >= MAX_SLOTS) return;
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
            Máximo {MAX_SLOTS} slots. Arrastrá para reordenar.
          </p>
          <Badge variant="outline">{items.length} / {MAX_SLOTS}</Badge>
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
        disabled={items.length >= MAX_SLOTS}
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar slot
      </Button>
    </div>
  );
}
