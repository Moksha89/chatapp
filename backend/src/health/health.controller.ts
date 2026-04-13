import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'unknown',
    };

    try {
      // Simple database check - try to get users count
      const users = await this.databaseService.getAllUsers();
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    try {
      await this.databaseService.getAllUsers();
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'not_ready', timestamp: new Date().toISOString(), error: 'Database not available' };
    }
  }
}

@Controller()
export class ManifestController {
  @Get('manifest.json')
  @ApiExcludeEndpoint()
  getManifest(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
      name: 'Abhi Chat',
      short_name: 'Abhi Chat',
      description: 'Modern messaging app with end-to-end encryption, voice & video calls, and business features',
      start_url: '/',
      display: 'standalone',
      background_color: '#F7F8FC',
      theme_color: '#246BFD',
      orientation: 'portrait-primary',
      categories: ['social', 'communication'],
      icons: [
        {
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23246BFD'/%3E%3Cpath d='M30 35h40c2.5 0 4.5 2 4.5 4.5v21c0 2.5-2 4.5-4.5 4.5H55l-10 10v-10H30c-2.5 0-4.5-2-4.5-4.5v-21c0-2.5 2-4.5 4.5-4.5z' fill='white'/%3E%3C/svg%3E",
          sizes: 'any',
          type: 'image/svg+xml',
        },
      ],
    });
  }
}
