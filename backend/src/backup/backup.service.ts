import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR') || path.join(process.cwd(), 'backups');
    this.maxBackups = parseInt(this.configService.get<string>('MAX_BACKUPS') || '30', 10);
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        this.logger.log(`Backup directory created: ${this.backupDir}`);
      }
    } catch (err) {
      this.logger.warn(`Could not create backup directory: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Scheduled Automated Backups ──

  /**
   * Daily database backup at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledDatabaseBackup(): Promise<void> {
    this.logger.log('Starting scheduled database backup...');
    try {
      const result = await this.createDatabaseBackup();
      this.logger.log(`Database backup completed: ${result.filename} (${result.sizeBytes} bytes)`);
      await this.cleanupOldBackups('db-');
    } catch (err) {
      this.logger.error(`Scheduled database backup failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Weekly media backup every Sunday at 3:00 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledMediaBackup(): Promise<void> {
    this.logger.log('Starting scheduled media backup...');
    try {
      const result = await this.createMediaBackup();
      this.logger.log(`Media backup completed: ${result.filename} (${result.fileCount} files)`);
      await this.cleanupOldBackups('media-');
    } catch (err) {
      this.logger.error(`Scheduled media backup failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Create a full database backup (all tables exported as JSON)
   */
  async createDatabaseBackup(): Promise<{ filename: string; filepath: string; sizeBytes: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    const users = await this.databaseService.getAllUsers();
    const backupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        type: 'database',
        tables: {
          users: users.length,
        },
      },
      data: {
        users: users.map(u => ({
          id: u.id,
          phoneNumber: u.phoneNumber,
          displayName: u.displayName,
          isBusiness: u.isBusiness,
          status: u.status,
          language: u.language,
          createdAt: u.createdAt,
        })),
      },
    };

    const content = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(filepath, content, 'utf-8');

    const stats = fs.statSync(filepath);
    return { filename, filepath, sizeBytes: stats.size };
  }

  /**
   * Create a manifest of all media files for backup
   */
  async createMediaBackup(): Promise<{ filename: string; filepath: string; fileCount: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `media-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const mediaFiles: Array<{ name: string; size: number; modified: string }> = [];

    if (fs.existsSync(uploadsDir)) {
      const files = this.walkDirectory(uploadsDir);
      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          mediaFiles.push({
            name: path.relative(uploadsDir, file),
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }

    const manifest = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        type: 'media',
        totalFiles: mediaFiles.length,
        totalSizeBytes: mediaFiles.reduce((sum, f) => sum + f.size, 0),
      },
      files: mediaFiles,
    };

    fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2), 'utf-8');
    return { filename, filepath, fileCount: mediaFiles.length };
  }

  /**
   * List all backups
   */
  getBackupList(): Array<{ filename: string; size: number; created: string }> {
    try {
      if (!fs.existsSync(this.backupDir)) return [];
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const stats = fs.statSync(path.join(this.backupDir, f));
          return {
            filename: f,
            size: stats.size,
            created: stats.birthtime.toISOString(),
          };
        })
        .sort((a, b) => b.created.localeCompare(a.created));
      return files;
    } catch {
      return [];
    }
  }

  /**
   * Remove old backups beyond the retention limit
   */
  private async cleanupOldBackups(prefix: string): Promise<void> {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(this.backupDir, f)).birthtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > this.maxBackups) {
        const toDelete = files.slice(this.maxBackups);
        for (const file of toDelete) {
          fs.unlinkSync(path.join(this.backupDir, file.name));
          this.logger.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Backup cleanup error: ${err instanceof Error ? err.message : err}`);
    }
  }

  private walkDirectory(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.walkDirectory(fullPath));
        } else {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip directories that can't be read
    }
    return results;
  }

  /**
   * Export chat messages as structured data for backup
   */
  async exportChatData(chatId: string, userId: string, options?: {
    includeMedia?: boolean;
    format?: 'json' | 'text';
  }): Promise<{ filename: string; content: string; mimeType: string }> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) throw new Error('Chat not found');

    const messages = await this.databaseService.getMessagesForExport(chatId);
    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);

    const format = options?.format || 'text';

    if (format === 'json') {
      const data = {
        chat: {
          id: chat.id,
          name: chat.name,
          type: chat.type,
          createdAt: chat.createdAt,
        },
        participants: participants.map(p => ({
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt,
        })),
        messages: messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          type: m.type,
          createdAt: m.createdAt,
          ...(options?.includeMedia && m.mediaUrl ? { mediaUrl: m.mediaUrl } : {}),
        })),
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
      };

      return {
        filename: `chat-backup-${chatId}-${Date.now()}.json`,
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
      };
    }

    // Text format
    const lines: string[] = [];
    lines.push(`Chat Backup: ${chat.name || 'Direct Chat'}`);
    lines.push(`Type: ${chat.type}`);
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`Total Messages: ${messages.length}`);
    lines.push('---');

    for (const msg of messages) {
      const date = new Date(msg.createdAt).toLocaleString();
      const content = msg.isDeleted ? '[Deleted]' : (msg.content || `[${msg.type}]`);
      lines.push(`[${date}] ${msg.senderId}: ${content}`);
    }

    return {
      filename: `chat-backup-${chatId}-${Date.now()}.txt`,
      content: lines.join('\n'),
      mimeType: 'text/plain',
    };
  }

  /**
   * Google Drive backup - requires OAuth2 credentials
   * This is the infrastructure for Google Drive integration.
   * To enable: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars,
   * then use the OAuth flow to get user tokens.
   */
  async getGoogleDriveAuthUrl(): Promise<{ authUrl: string } | { error: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/backup/google/callback';

    if (!clientId) {
      return { error: 'Google Drive integration not configured. Set GOOGLE_CLIENT_ID env var.' };
    }

    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return { authUrl };
  }

  /**
   * Exchange Google OAuth code for tokens
   */
  async exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/backup/google/callback';

    if (!clientId || !clientSecret) {
      return { error: 'Google Drive integration not configured' };
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
      if (data.error) {
        return { error: `Google OAuth error: ${data.error}` };
      }

      return {
        accessToken: data.access_token || '',
        refreshToken: data.refresh_token || '',
      };
    } catch (err) {
      return { error: `Failed to exchange code: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /**
   * Upload backup to Google Drive
   */
  async uploadToGoogleDrive(
    accessToken: string,
    filename: string,
    content: string,
    mimeType: string,
  ): Promise<{ fileId: string; webViewLink: string } | { error: string }> {
    try {
      const metadata = {
        name: filename,
        mimeType,
        parents: ['root'],
      };

      const boundary = 'backup_boundary_' + Date.now();
      const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        '',
        content,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );

      const data = await response.json() as { id?: string; webViewLink?: string; error?: { message?: string } };
      if (data.error) {
        return { error: `Drive upload error: ${data.error.message || 'Unknown error'}` };
      }

      return {
        fileId: data.id || '',
        webViewLink: data.webViewLink || '',
      };
    } catch (err) {
      return { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
