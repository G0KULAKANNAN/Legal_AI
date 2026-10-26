import { StorageProvider } from './storage.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../config/logger';

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor(url: string, key: string, bucket: string) {
    if (!url || !key) {
      throw new Error('Supabase URL and Service Key must be configured for SupabaseStorageProvider');
    }
    this.client = createClient(url, key);
    this.bucket = bucket;
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      logger.error(`[SupabaseStorageProvider] Upload error: ${error.message}`);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return data.path;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);

    if (error || !data) {
      logger.error(`[SupabaseStorageProvider] Download error: ${error?.message}`);
      throw new Error(`Supabase download failed: ${error?.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      logger.error(`[SupabaseStorageProvider] Delete error: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Failed to create Supabase signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }
}
