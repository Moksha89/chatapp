import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

interface AppVersion {
  android: {
    versionCode: number;
    versionName: string;
    downloadUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
    minVersionCode: number;
  };
}

@ApiTags('version')
@Controller('version')
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Get current app version' })
  @ApiResponse({ status: 200, description: 'Current version returned' })
  getVersion() {
    return {
      version: '1.9.0',
      versionCode: 10,
      name: 'Abhi',
      buildDate: '2026-04-05',
    };
  }

  @Get('check')
  @ApiOperation({ summary: 'Check for app updates' })
  @ApiResponse({ status: 200, description: 'Version information returned' })
  checkVersion(): AppVersion {
    const baseUrl = process.env.APP_BASE_URL || '';
    
    return {
      android: {
        versionCode: 10,
        versionName: '1.9.0',
        downloadUrl: `${baseUrl}/version/download/android`,
        releaseNotes: 'v1.9.0: Added offline message queueing with retry logic, swipe-to-reply gesture, improved message reliability',
        forceUpdate: false,
        minVersionCode: 1,
      },
    };
  }

  @Get('download/android')
  @ApiOperation({ summary: 'Download Android APK' })
  @ApiResponse({ status: 200, description: 'Returns the APK file' })
  @ApiResponse({ status: 404, description: 'APK file not found' })
  downloadAndroid(@Res({ passthrough: true }) res: Response): StreamableFile | { error: string } {
    const apkPath = process.env.APK_FILE_PATH || join(process.cwd(), 'uploads', 'chatapp-release.apk');
    
    if (!existsSync(apkPath)) {
      res.status(404);
      return { error: 'APK file not found. Please contact administrator.' };
    }
    
    const file = createReadStream(apkPath);
    res.set({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="chatapp.apk"',
    });
    
    return new StreamableFile(file);
  }
}
