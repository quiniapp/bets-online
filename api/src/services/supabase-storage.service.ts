import { createClient } from '@supabase/supabase-js';
import { ErrorCode } from 'helper';
import { envs } from '../config/envs';
import { AppError } from '../middleware/error.middleware';

class SupabaseStorageService {
  private getClient() {
    if (!envs.supabase.url || !envs.supabase.serviceKey) {
      throw new AppError(
        503,
        ErrorCode.INTERNAL_ERROR,
        'Supabase storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)'
      );
    }
    return createClient(envs.supabase.url, envs.supabase.serviceKey);
  }

  async uploadFile(
    bucket: string,
    filePath: string,
    buffer: Buffer,
    mimetype: string
  ): Promise<string> {
    const client = this.getClient();
    let { error } = await client.storage.from(bucket).upload(filePath, buffer, {
      contentType: mimetype,
      upsert: true
    });

    // A fresh environment may not have the bucket yet: create it (public) and
    // retry once, so uploads self-heal instead of failing with a 500.
    if (error && /bucket not found/i.test(error.message)) {
      const { error: bucketError } = await client.storage.createBucket(bucket, { public: true });
      if (!bucketError) {
        ({ error } = await client.storage.from(bucket).upload(filePath, buffer, {
          contentType: mimetype,
          upsert: true
        }));
      }
    }

    if (error) {
      throw new AppError(502, ErrorCode.INTERNAL_ERROR, `Upload failed: ${error.message}`);
    }
    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, filePath: string): Promise<void> {
    const client = this.getClient();
    const { error } = await client.storage.from(bucket).remove([filePath]);
    if (error) {
      throw new AppError(502, ErrorCode.INTERNAL_ERROR, `Delete failed: ${error.message}`);
    }
  }

  pathFromPublicUrl(bucket: string, url: string): string | null {
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }
}

export const supabaseStorage = new SupabaseStorageService();
