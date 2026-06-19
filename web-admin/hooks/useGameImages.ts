"use client"
import { useState, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { GameImage } from 'helper';

interface GameImagesData {
  images: GameImage[];
  activeImageUrl: string | null;
}

export function useGameImages(gameId: string) {
  const [data, setData] = useState<GameImagesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get<GameImagesData>(`/admin/games/${gameId}/images`);
      if (res.success && res.data) setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const uploadImage = async (file: File): Promise<boolean> => {
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      // postForm adjunta x-csrf-token (el backend exige CSRF en toda mutación).
      // El fetch crudo previo no enviaba el header y devolvía 403 CSRF_INVALID.
      const res = await apiService.postForm<GameImage>(`/admin/games/${gameId}/images`, formData);
      if (res.success) { await load(); return true; }
      return false;
    } finally {
      setUploading(false);
    }
  };

  const selectImage = async (imageId: string): Promise<boolean> => {
    const res = await apiService.post(`/admin/games/${gameId}/images/${imageId}/select`);
    if (res.success) { await load(); return true; }
    return false;
  };

  const resetToDefault = async (): Promise<boolean> => {
    const res = await apiService.post(`/admin/games/${gameId}/images/reset`);
    if (res.success) { await load(); return true; }
    return false;
  };

  const deleteImage = async (imageId: string): Promise<boolean> => {
    const res = await apiService.delete(`/admin/games/${gameId}/images/${imageId}`);
    if (res.success) { await load(); return true; }
    return false;
  };

  return { data, loading, uploading, load, uploadImage, selectImage, resetToDefault, deleteImage };
}
