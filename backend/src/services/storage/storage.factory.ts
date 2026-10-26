import { StorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local.storage';
import { SupabaseStorageProvider } from './supabase.storage';
import { config } from '../../config';
import { logger } from '../../config/logger';

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    if (config.storage.provider === 'supabase') {
      try {
        storageInstance = new SupabaseStorageProvider(
          config.storage.supabaseUrl,
          config.storage.supabaseKey,
          config.storage.supabaseBucket
        );
        logger.info('[StorageFactory] Initialized SupabaseStorageProvider');
      } catch (err: any) {
        logger.warn(`[StorageFactory] Failed to initialize Supabase, falling back to LocalStorageProvider: ${err.message}`);
        storageInstance = new LocalStorageProvider(config.storage.localPath);
      }
    } else {
      storageInstance = new LocalStorageProvider(config.storage.localPath);
      logger.info('[StorageFactory] Initialized LocalStorageProvider');
    }
  }
  return storageInstance;
}
