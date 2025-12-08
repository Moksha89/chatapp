export interface OtpSendResult {
  success: boolean;
  message: string;
  otp?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
}

export interface OtpProvider {
  sendOtp(phoneNumber: string): Promise<OtpSendResult>;
  verifyOtp(phoneNumber: string, otp: string): Promise<OtpVerifyResult>;
}

export const OTP_PROVIDER = 'OTP_PROVIDER';
