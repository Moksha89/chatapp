import { Module } from '@nestjs/common';
import { HealthController, ManifestController } from './health.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, ManifestController],
})
export class HealthModule {}
