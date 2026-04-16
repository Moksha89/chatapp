const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || res.statusText);
  }
  return res.json();
}

export const api = {
  sendOtp: (phone: string) =>
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, otp: string, deviceId: string) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, deviceId, platform: 'web' }),
    }),

  generateQr: () => request('/auth/qr/generate'),

  checkQrStatus: (token: string) => request(`/auth/qr/status?token=${token}`),

  getProfile: () => request('/users/me'),

  updateProfile: (data: { displayName?: string; about?: string }) =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  searchUsers: (phone: string) => request(`/users/search?phone=${phone}`),

  getChats: () => request('/chats'),

  createChat: (otherUserId: string) =>
    request('/chats', { method: 'POST', body: JSON.stringify({ otherUserId }) }),

  getMessages: (chatId: string, limit = 50, before?: string) =>
    request(`/chats/${chatId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),

  markRead: (chatId: string) =>
    request(`/chats/${chatId}/read`, { method: 'POST' }),
};
