"use client"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DraggableItem({ id, children, className }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-3 py-2',
        isDragging && 'opacity-50 shadow-lg z-10',
        className
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
        type="button"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
