export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  OFFLINE_ERROR: 'OFFLINE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export function parseApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    if (!navigator.onLine) {
      return new AppError(
        'You are offline. Please check your internet connection.',
        ErrorCodes.OFFLINE_ERROR,
        0,
        true
      );
    }
    return new AppError(
      'Unable to connect to server. Please try again.',
      ErrorCodes.NETWORK_ERROR,
      0,
      true
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new AppError(
        'Request timed out. Please try again.',
        ErrorCodes.TIMEOUT_ERROR,
        408,
        true
      );
    }
    return new AppError(error.message, ErrorCodes.UNKNOWN_ERROR);
  }

  return new AppError('An unexpected error occurred', ErrorCodes.UNKNOWN_ERROR);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
