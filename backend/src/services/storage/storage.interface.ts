import { Readable } from 'stream';

export interface StorageProvider {
  uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
