"use client"
import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
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

const ALL_CATEGORIES: Record<string, string> = {
  videoSlots:   'Casino',
  LiveGames:    'Casino en Vivo',
  CrashGame:    'Crash',
  Roulette:     'Ruletas',
  Blackjack:    'Blackjack',
  Baccarat:     'Baccarat',
  Bingo:        'Bingo',
  Plinko:       'Plinko',
  ActionGames:  'Acción',
};

interface HeaderCategoriesEditorProps {
  categories: string[];
  saving: boolean;
  onSave: (categories: string[]) => void;
}

export function HeaderCategoriesEditor({ categories, saving, onSave }: HeaderCategoriesEditorProps) {
  const [items, setItems] = useState(categories);

  const sensors = useSensors(
    useSensor(PointerSensor),
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arrastrá para reordenar. Activá o desactivá categorías con los badges.
      </p>

      <div className="flex flex-wrap gap-2">
        {Object.entries(ALL_CATEGORIES).map(([type, label]) => (
          <Badge
            key={type}
            variant={items.includes(type) ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggle(type)}
          >
            {label}
          </Badge>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(type => (
              <DraggableItem key={type} id={type}>
                <span className="text-sm font-medium">{ALL_CATEGORIES[type] ?? type}</span>
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
