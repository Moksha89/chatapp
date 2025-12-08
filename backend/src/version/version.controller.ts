import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  @Get('check')
  @ApiOperation({ summary: 'Check for app updates' })
  @ApiResponse({ status: 200, description: 'Version information returned' })
  checkVersion(): AppVersion {
    const baseUrl = process.env.APP_BASE_URL || 'http://173.208.132.8:3000';
    
    return {
      android: {
        versionCode: 3,
        versionName: '1.2.0',
        downloadUrl: `${baseUrl}/version/download/android`,
        releaseNotes: 'New features: Message search, starring, forwarding, chat export, disappearing messages, privacy settings, block/report users, multi-language support',
        forceUpdate: false,
        minVersionCode: 1,
      },
    };
  }

  @Get('download/android')
  @ApiOperation({ summary: 'Download Android APK' })
  @ApiResponse({ status: 302, description: 'Redirects to APK download' })
  downloadAndroid(): { message: string; instructions: string } {
    return {
      message: 'APK download endpoint',
      instructions: 'The APK file should be hosted on a file server. Configure APP_APK_URL environment variable to point to the actual APK file.',
    };
  }
}
