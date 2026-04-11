import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OTP_PROVIDER } from './otp-provider.interface';
import { MockOtpProvider } from './mock-otp.provider';
import { TwilioOtpProvider } from './twilio-otp.provider';
import { RedisService } from '../redis/redis.service';

@Module({})
export class OtpModule {
  static forRoot(): DynamicModule {
    return {
      module: OtpModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: OTP_PROVIDER,
          useFactory: (configService: ConfigService, redisService: RedisService) => {
            const provider = configService.get<string>('OTP_PROVIDER') || 'mock';
            
            if (provider === 'twilio') {
              return new TwilioOtpProvider(configService, redisService);
            }
            
            return new MockOtpProvider(configService);
          },
          inject: [ConfigService, RedisService],
        },
      ],
      exports: [OTP_PROVIDER],
    };
  }
}
