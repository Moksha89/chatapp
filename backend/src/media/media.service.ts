import { Injectable, NotFoundException } from '@nestjs/common';
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

  async uploadFile(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<StoredMedia> {
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
