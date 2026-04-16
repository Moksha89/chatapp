import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Device } from '../entities/device.entity';
import { QrSession } from '../entities/qr-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Device, QrSession])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
