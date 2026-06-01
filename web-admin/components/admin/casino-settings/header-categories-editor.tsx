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
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { apiService } from '@/services/api.service';

const TYPE_LABELS: Record<string, string> = {
  videoSlots:   'Casino',
  LiveGames:    'Casino en Vivo',
  CrashGame:    'Crash',
  Roulette:     'Ruletas',
  Blackjack:    'Blackjack',
  Baccarat:     'Baccarat',
  Bingo:        'Bingo',
  Plinko:       'Plinko',
  ActionGames:  'Acción',
  InstantGames: 'Instantáneos',
  Dice:         'Dados',
  Scratch:      'Scratch',
  Lottery:      'Lotería',
};

interface HeaderCategoriesEditorProps {
  categories: string[];
  saving: boolean;
  onSave: (categories: string[]) => void;
}

export function HeaderCategoriesEditor({ categories, saving, onSave }: HeaderCategoriesEditorProps) {
  const [items, setItems] = useState(categories);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => { setItems(categories); }, [categories]);

  useEffect(() => {
    apiService.get<{ types: string[] }>('/games/types')
      .then(res => { if (res.success && res.data) setAvailableTypes(res.data.types); })
      .finally(() => setLoadingTypes(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const toggle = (type: string) => {
    setItems(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getLabel = (type: string) => TYPE_LABELS[type] ?? type;

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
      <p className="text-sm text-muted-foreground">
        Arrastrá para reordenar. Activá o desactivá categorías con los badges.
      </p>

      <div className="flex flex-wrap gap-2">
        {availableTypes.map(type => (
          <Badge
            key={type}
            variant={items.includes(type) ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggle(type)}
          >
            {getLabel(type)}
          </Badge>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.filter(t => availableTypes.includes(t)).map(type => (
              <DraggableItem key={type} id={type}>
                <span className="text-sm font-medium">{getLabel(type)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{type}</span>
              </DraggableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button onClick={() => onSave(items)} disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {saving ? 'Guardando...' : 'Guardar orden'}
      </Button>
    </div>
  );
}
