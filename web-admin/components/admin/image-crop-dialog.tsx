'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedBlob, type CropArea } from '@/lib/crop-image';

interface ImageCropDialogProps {
  // Archivo elegido por el usuario; se libera el object URL al cerrar.
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob) => Promise<void> | void;
}

export function ImageCropDialog({ file, open, onOpenChange, onCropped }: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);

  // Crear/limpiar el object URL cuando cambia el archivo.
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: CropArea, areaPx: CropArea) => {
    setAreaPixels(areaPx);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels);
      await onCropped(blob);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recortar imagen</DialogTitle>
        </DialogHeader>

        {/* Área de recorte 1:1 — mismo formato que la card del juego */}
        <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Control de zoom */}
        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !areaPixels}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {saving ? 'Subiendo...' : 'Recortar y subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
