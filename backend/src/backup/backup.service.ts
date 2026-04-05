import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BackupService {
  constructor(private readonly databaseService: DatabaseService) {}

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
