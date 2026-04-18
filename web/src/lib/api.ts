const API_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.token}`;
        const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
        if (!retryRes.ok) throw new Error(`HTTP ${retryRes.status}`);
        return retryRes.json();
      }
      this.clearToken();
      if (typeof window !== 'undefined') window.location.href = '/';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setToken(data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  sendOtp(phone: string) {
    return this.request<{ message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  verifyOtp(phone: string, otp: string) {
    return this.request<{
      token: string;
      refreshToken: string;
      user: { id: string; phone: string; displayName: string | null; isNewUser: boolean };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  register(phone: string, otp: string, displayName: string) {
    return this.request<{ token: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, displayName }),
    });
  }

  // Users
  getMe() {
    return this.request<any>('/users/me');
  }

  updateProfile(data: { displayName?: string; about?: string; profilePhoto?: string }) {
    return this.request<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) });
  }

  searchUsers(query: string) {
    return this.request<any[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  getAllUsers() {
    return this.request<any[]>('/users/all');
  }

  getUserById(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  // Chats
  getChats() {
    return this.request<any[]>('/chats');
  }

  getChatById(id: string) {
    return this.request<any>(`/chats/${id}`);
  }

  createDirectChat(otherUserId: string) {
    return this.request<any>('/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
  }

  createGroupChat(title: string, memberIds: string[]) {
    return this.request<any>('/chats/group', {
      method: 'POST',
      body: JSON.stringify({ title, memberIds }),
    });
  }

  getMessages(chatId: string, limit = 50, before?: string) {
    let url = `/chats/${chatId}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    return this.request<any[]>(url);
  }

  markRead(chatId: string) {
    return this.request<any>(`/chats/${chatId}/read`, { method: 'POST' });
  }

  // Calls
  getCallHistory(limit = 20) {
    return this.request<any[]>(`/calls/history?limit=${limit}`);
  }

  getLiveKitToken(roomName: string) {
    return this.request<string>('/calls/livekit-token', {
      method: 'POST',
      body: JSON.stringify({ roomName }),
    });
  }

  // Uploads
  async uploadFile(file: File, messageId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (messageId) formData.append('messageId', messageId);

    const token = this.getToken();
    const res = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }

  // Notifications
  registerDevice(fcmToken: string, platform: string) {
    return this.request<any>('/notifications/register-device', {
      method: 'POST',
      body: JSON.stringify({ fcmToken, platform }),
    });
  }
}

export const api = new ApiClient();
export default api;
