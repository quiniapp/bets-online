import { supabaseStorage } from '../../src/services/supabase-storage.service';

describe('SupabaseStorageService.pathFromPublicUrl', () => {
  it('extracts the storage path after the bucket segment', () => {
    const url =
      'https://proj.supabase.co/storage/v1/object/public/banner-images/banners/b1/123-a.png';
    expect(supabaseStorage.pathFromPublicUrl('banner-images', url)).toBe(
      'banners/b1/123-a.png'
    );
  });

  it('returns null when the bucket is not in the url', () => {
    expect(
      supabaseStorage.pathFromPublicUrl('banner-images', 'https://x/other/a.png')
    ).toBeNull();
  });
});
