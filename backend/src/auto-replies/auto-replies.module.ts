import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoReplyEntity } from '../database/entities/auto-reply.entity';
import { AutoRepliesService } from './auto-replies.service';
import { AutoRepliesController } from './auto-replies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutoReplyEntity])],
  controllers: [AutoRepliesController],
  providers: [AutoRepliesService],
  exports: [AutoRepliesService],
})
export class AutoRepliesModule {}
