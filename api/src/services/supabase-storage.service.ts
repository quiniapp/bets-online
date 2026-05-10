import { createClient } from '@supabase/supabase-js';
import { envs } from '../config/envs';

class SupabaseStorageService {
  private getClient() {
    if (!envs.supabase.url || !envs.supabase.serviceKey) {
      throw new Error('Supabase not configured');
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
    const { error } = await client.storage.from(bucket).upload(filePath, buffer, {
      contentType: mimetype,
      upsert: true
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, filePath: string): Promise<void> {
    const client = this.getClient();
    const { error } = await client.storage.from(bucket).remove([filePath]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }
}

export const supabaseStorage = new SupabaseStorageService();
