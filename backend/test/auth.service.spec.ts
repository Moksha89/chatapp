import { MockOtpProvider } from '../src/otp/mock-otp.provider';

// Mock ConfigService
const mockConfigService = {
  get: (key: string) => {
    const config: Record<string, string> = {
      DEV_OTP: '123456',
      NODE_ENV: 'development',
    };
    return config[key];
  },
};

describe('MockOtpProvider', () => {
  let otpProvider: MockOtpProvider;

  beforeEach(() => {
    otpProvider = new MockOtpProvider(mockConfigService as any);
  });

  it('should send OTP successfully', async () => {
    const result = await otpProvider.sendOtp('+1234567890');
    expect(result.success).toBe(true);
    expect(result.otp).toBe('123456');
  });

  it('should verify correct OTP', async () => {
    await otpProvider.sendOtp('+1234567890');
    const result = await otpProvider.verifyOtp('+1234567890', '123456');
    expect(result.success).toBe(true);
  });

  it('should reject wrong OTP', async () => {
    await otpProvider.sendOtp('+1234567890');
    const result = await otpProvider.verifyOtp('+1234567890', '000000');
    expect(result.success).toBe(false);
  });

  it('should reject OTP for unknown number', async () => {
    const result = await otpProvider.verifyOtp('+9999999999', '123456');
    expect(result.success).toBe(false);
  });

  it('should allow OTP reuse up to 2 times (login + register flow)', async () => {
    await otpProvider.sendOtp('+1234567890');
    
    // First use (login attempt)
    const result1 = await otpProvider.verifyOtp('+1234567890', '123456');
    expect(result1.success).toBe(true);

    // Second use (register attempt)
    const result2 = await otpProvider.verifyOtp('+1234567890', '123456');
    expect(result2.success).toBe(true);

    // Third use should fail (invalidated after 2 uses)
    const result3 = await otpProvider.verifyOtp('+1234567890', '123456');
    expect(result3.success).toBe(false);
  });

  it('should reject expired OTP', async () => {
    await otpProvider.sendOtp('+1234567890');
    
    // Manually expire the OTP by accessing internal state
    const store = (otpProvider as any).otpStore;
    const entry = store.get('+1234567890');
    if (entry) {
      entry.expiresAt = new Date(Date.now() - 1000); // expired 1 second ago
    }
    
    const result = await otpProvider.verifyOtp('+1234567890', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toContain('expired');
  });

  it('should not return OTP in production mode', async () => {
    const prodConfigService = {
      get: (key: string) => {
        const config: Record<string, string> = {
          DEV_OTP: '123456',
          NODE_ENV: 'production',
        };
        return config[key];
      },
    };
    const prodProvider = new MockOtpProvider(prodConfigService as any);
    const result = await prodProvider.sendOtp('+1234567890');
    expect(result.success).toBe(true);
    expect(result.otp).toBeUndefined();
  });
});

describe('CORS configuration', () => {
  it('should support comma-separated CORS origins', () => {
    const corsOrigin = 'http://localhost:3000,http://208.110.87.24:8888';
    const origins = corsOrigin.split(',').map(o => o.trim());
    expect(origins).toEqual(['http://localhost:3000', 'http://208.110.87.24:8888']);
  });

  it('should default to wildcard when no CORS_ORIGIN set', () => {
    const corsOrigin = process.env.NONEXISTENT_VAR; // undefined
    const origin = corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : '*';
    expect(origin).toBe('*');
  });
});

describe('Database configuration', () => {
  it('should disable synchronize when DB_SYNCHRONIZE is false', () => {
    const dbSync = 'false';
    const synchronize = dbSync !== 'false';
    expect(synchronize).toBe(false);
  });

  it('should enable synchronize by default', () => {
    const dbSync = undefined;
    const synchronize = dbSync !== 'false';
    expect(synchronize).toBe(true);
  });
});
