import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OTP_PROVIDER } from './otp-provider.interface';
import { MockOtpProvider } from './mock-otp.provider';
import { TwilioOtpProvider } from './twilio-otp.provider';

@Module({})
export class OtpModule {
  static forRoot(): DynamicModule {
    return {
      module: OtpModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: OTP_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('OTP_PROVIDER') || 'mock';
            
            if (provider === 'twilio') {
              return new TwilioOtpProvider(configService);
            }
            
            return new MockOtpProvider(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [OTP_PROVIDER],
    };
  }
}
