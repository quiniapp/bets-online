'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, RotateCcw, Trash2, Check, ImageIcon } from 'lucide-react';
import { useGameImages } from '@/hooks/useGameImages';
import { useToast } from '@/hooks/use-toast';

interface GameImageManagerProps {
  gameId: string;
  gameName: string;
  defaultLogo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GameImageManager({
  gameId,
  gameName,
  defaultLogo,
  open,
  onOpenChange,
}: GameImageManagerProps) {
  const { data, loading, uploading, load, uploadImage, selectImage, resetToDefault, deleteImage } =
    useGameImages(gameId);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetting, setResetting] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    const ok = await uploadImage(file);
    if (ok) {
      toast({ title: 'Imagen subida', description: 'La imagen fue cargada correctamente.' });
    } else {
      toast({ title: 'Error', description: 'No se pudo subir la imagen.', variant: 'destructive' });
    }
  };

  const handleResetToDefault = async () => {
    setResetting(true);
    try {
      const ok = await resetToDefault();
      if (ok) {
        toast({ title: 'Imagen del proveedor', description: 'Se restauró la imagen del proveedor.' });
      } else {
        toast({ title: 'Error', description: 'No se pudo restaurar la imagen.', variant: 'destructive' });
      }
    } finally {
      setResetting(false);
    }
  };

  const handleSelect = async (imageId: string) => {
    setSelectingId(imageId);
    try {
      const ok = await selectImage(imageId);
      if (!ok) {
        toast({ title: 'Error', description: 'No se pudo seleccionar la imagen.', variant: 'destructive' });
      }
    } finally {
      setSelectingId(null);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('¿Eliminar esta imagen? Esta acción no se puede deshacer.')) return;
    setDeletingId(imageId);
    try {
      const ok = await deleteImage(imageId);
      if (ok) {
        toast({ title: 'Imagen eliminada' });
      } else {
        toast({ title: 'Error', description: 'No se pudo eliminar la imagen.', variant: 'destructive' });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const activeUrl = data?.activeImageUrl ?? defaultLogo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imágenes de {gameName}</DialogTitle>
        </DialogHeader>

        {/* Active image preview */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Imagen activa</p>
          <div className="w-28 h-28 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
            {activeUrl ? (
              <img src={activeUrl} alt={gameName} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Sin imagen</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Subiendo...' : 'Subir imagen'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onClick={handleResetToDefault}
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            {resetting ? 'Restaurando...' : 'Usar imagen del proveedor'}
          </Button>
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Imágenes subidas</p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.images.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay imágenes subidas aún
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {data.images.map(image => {
                const isActive = image.url === data.activeImageUrl;
                const isDeleting = deletingId === image.id;
                const isSelecting = selectingId === image.id;

                return (
                  <div
                    key={image.id}
                    className={`relative rounded-lg border-2 overflow-hidden bg-muted transition-colors ${
                      isActive ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.label ?? 'Imagen del juego'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isActive && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex gap-1 p-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs px-1"
                        disabled={isActive || isSelecting || isDeleting}
                        onClick={() => handleSelect(image.id)}
                      >
                        {isSelecting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Usar esta'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isDeleting || isSelecting}
                        onClick={() => handleDelete(image.id)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
