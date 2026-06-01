"use client"
import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { FooterLink } from 'helper';

function newLinkId() {
  return Math.random().toString(36).slice(2, 10);
}

interface FooterLinkRowProps {
  link: FooterLink;
  onChange: (updated: FooterLink) => void;
  onRemove: () => void;
}

function FooterLinkRow({ link, onChange, onRemove }: FooterLinkRowProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
      <Input
        className="w-36"
        placeholder="Etiqueta"
        value={link.label}
        onChange={e => onChange({ ...link, label: e.target.value })}
      />
      <Input
        className="w-48"
        placeholder="URL (ej: /terminos)"
        value={link.href}
        onChange={e => onChange({ ...link, href: e.target.value })}
      />
      <Switch
        id={`visible-${link.id}`}
        checked={link.visible}
        onCheckedChange={v => onChange({ ...link, visible: v })}
        aria-label="Visible"
      />
      <label htmlFor={`visible-${link.id}`} className="text-xs text-muted-foreground cursor-pointer">
        Visible
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-700"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface FooterLinksEditorProps {
  links: FooterLink[];
  saving: boolean;
  onSave: (links: FooterLink[]) => void;
}

export function FooterLinksEditor({ links, saving, onSave }: FooterLinksEditorProps) {
  const [items, setItems] = useState<FooterLink[]>(links);

  useEffect(() => {
    setItems(links);
  }, [links]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(l => l.id === active.id);
        const newIdx = prev.findIndex(l => l.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arrastrá para reordenar. Usá el toggle para mostrar u ocultar un enlace.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(link => (
              <DraggableItem key={link.id} id={link.id}>
                <FooterLinkRow
                  link={link}
                  onChange={updated => setItems(prev => prev.map(l => l.id === link.id ? updated : l))}
                  onRemove={() => setItems(prev => prev.filter(l => l.id !== link.id))}
                />
              </DraggableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems(prev => [...prev, { id: newLinkId(), label: '', href: '/', visible: true }])}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar enlace
        </Button>
        <Button type="button" onClick={() => onSave(items)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {saving ? 'Guardando...' : 'Guardar footer'}
        </Button>
      </div>
    </div>
  );
}
