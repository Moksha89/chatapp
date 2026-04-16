import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface StoredMedia {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
}

// File size limits per media type (in bytes)
const FILE_SIZE_LIMITS: Record<string, number> = {
  'image': 16 * 1024 * 1024,    // 16 MB for images
  'video': 64 * 1024 * 1024,    // 64 MB for videos
  'audio': 16 * 1024 * 1024,    // 16 MB for audio/voice messages
  'document': 100 * 1024 * 1024, // 100 MB for documents
  'default': 32 * 1024 * 1024,   // 32 MB default
};

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/mp4',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed',
  'application/json', 'application/xml',
]);

@Injectable()
export class MediaService {
  private mediaStore: Map<string, StoredMedia> = new Map();
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private getMediaCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  private validateFile(file: { mimetype: string; size: number; originalname: string }): void {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Supported types: images, videos, audio, and common documents.`,
      );
    }

    // Check file size
    const category = this.getMediaCategory(file.mimetype);
    const maxSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS['default'];
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(
        `File too large. Maximum size for ${category} files is ${maxMB} MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      );
    }

    // Check filename for path traversal
    const basename = path.basename(file.originalname);
    if (basename !== file.originalname || file.originalname.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }
  }

  async uploadFile(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<StoredMedia> {
    this.validateFile(file);

    const id = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const media: StoredMedia = {
      id,
      userId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      createdAt: new Date(),
    };

    this.mediaStore.set(id, media);

    return media;
  }

  async getMedia(id: string): Promise<StoredMedia> {
    const media = this.mediaStore.get(id);
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  async getMediaFile(id: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const media = await this.getMedia(id);
    
    if (!fs.existsSync(media.path)) {
      throw new NotFoundException('Media file not found');
    }

    const buffer = fs.readFileSync(media.path);
    return {
      buffer,
      mimeType: media.mimeType,
      filename: media.filename,
    };
  }

  async deleteMedia(id: string, userId: string): Promise<void> {
    const media = await this.getMedia(id);
    
    if (media.userId !== userId) {
      throw new NotFoundException('Media not found');
    }

    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }

    this.mediaStore.delete(id);
  }

  getSignedUrl(id: string): string {
    return `/media/${id}`;
  }
}
