"use client"
import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Grid3x3, Loader2 } from 'lucide-react';
import { useGameTypes } from '@/hooks/useGameTypes';
import { MAX_BOTTOM_NAV_VISIBLE, type BottomNavItem } from 'helper';

interface BottomNavEditorProps {
  items: BottomNavItem[];
  headerCategories: string[];
  saving: boolean;
  onSave: (items: BottomNavItem[]) => void;
}

export function BottomNavEditor({ items: savedItems, headerCategories, saving, onSave }: BottomNavEditorProps) {
  const { gameTypes, loading: loadingTypes, label } = useGameTypes();
  const [items, setItems] = useState<BottomNavItem[]>([]);

  // Seed: saved config → fallback to header categories (current player behavior).
  // Any known type missing from the config is appended hidden so it can be enabled.
  useEffect(() => {
    if (loadingTypes) return;
    const base: BottomNavItem[] = savedItems.length > 0
      ? savedItems
      : headerCategories.slice(0, MAX_BOTTOM_NAV_VISIBLE).map(t => ({ categoryType: t, visible: true }));
    const known = new Set(base.map(i => i.categoryType));
    const missing = gameTypes
      .filter(t => !known.has(t.name))
      .map(t => ({ categoryType: t.name, visible: false }));
    setItems([...base, ...missing]);
  }, [savedItems, headerCategories, gameTypes, loadingTypes]);

  const visibleCount = useMemo(() => items.filter(i => i.visible).length, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.categoryType === active.id);
        const newIdx = prev.findIndex(i => i.categoryType === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const toggleVisible = (categoryType: string, visible: boolean) => {
    if (visible && visibleCount >= MAX_BOTTOM_NAV_VISIBLE) return;
    setItems(prev => prev.map(i => i.categoryType === categoryType ? { ...i, visible } : i));
  };

  if (loadingTypes) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando tipos de juegos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Arrastrá para reordenar. Lobby va siempre primero.
          </p>
          <Badge variant="outline">{visibleCount} / {MAX_BOTTOM_NAV_VISIBLE} visibles</Badge>
        </div>
        <Button onClick={() => onSave(items)} disabled={saving} size="sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {saving ? 'Guardando...' : 'Guardar navbar'}
        </Button>
      </div>

      {/* Lobby — fixed, always first */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <Grid3x3 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1">Lobby</span>
        <Badge variant="secondary">Fijo</Badge>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.categoryType)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(item => (
              <DraggableItem key={item.categoryType} id={item.categoryType}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{label(item.categoryType)}</span>
                  <Switch
                    checked={item.visible}
                    disabled={!item.visible && visibleCount >= MAX_BOTTOM_NAV_VISIBLE}
                    onCheckedChange={v => toggleVisible(item.categoryType, v)}
                    aria-label={`Mostrar ${label(item.categoryType)}`}
                  />
                </div>
              </DraggableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        Los ítems visibles aparecen en la barra inferior del celular, en este orden, después de Lobby.
      </p>
    </div>
  );
}
