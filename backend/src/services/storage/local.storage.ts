import { StorageProvider } from './storage.interface';
import fs from 'fs';
import path from 'path';
import { logger } from '../../config/logger';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async uploadFile(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
    logger.info(`[LocalStorageProvider] Saved file: ${key}`);
    return key;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found: ${key}`);
    }
    return await fs.promises.readFile(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`[LocalStorageProvider] Deleted file: ${key}`);
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    return `/api/documents/file/${encodeURIComponent(key)}`;
  }
}
