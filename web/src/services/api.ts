const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async sendOtp(phoneNumber: string) {
    return this.request<{ message: string; otp?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async register(data: {
    phoneNumber: string;
    otp: string;
    displayName: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
    isBusiness?: boolean;
  }) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; phoneNumber: string; displayName: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: {
    phoneNumber: string;
    otp: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
  }) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; phoneNumber: string; displayName: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request<{
      id: string;
      phoneNumber: string;
      displayName: string;
      profilePhoto?: string;
      status?: string;
      isBusiness: boolean;
    }>('/users/me');
  }

  async updateProfile(data: { displayName?: string; profilePhoto?: string; status?: string }) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getChats() {
    return this.request<Array<{
      id: string;
      type: string;
      name?: string;
      participants: Array<{
        id: string;
        userId: string;
        user?: { id: string; displayName: string; phoneNumber: string };
      }>;
      lastMessage?: {
        id: string;
        content?: string;
        createdAt: string;
        senderId: string;
      };
      unreadCount: number;
    }>>('/chats');
  }

  async createChat(data: { type: 'direct' | 'group'; participantId?: string; name?: string }) {
    return this.request<{ id: string; type: string }>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessages(chatId: string, limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    return this.request<Array<{
      id: string;
      chatId: string;
      senderId: string;
      content?: string;
      type: string;
      status: string;
      createdAt: string;
    }>>(`/chats/${chatId}/messages?${params}`);
  }

  async sendMessage(chatId: string, data: { content: string; type?: string; tempId?: string }) {
    return this.request<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      type: string;
      status: string;
      createdAt: string;
    }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessagesRead(chatId: string, messageIds: string[]) {
    return this.request(`/chats/${chatId}/messages/read`, {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    });
  }

  async searchUsers(phoneNumber: string) {
    return this.request<Array<{ id: string; phoneNumber: string; displayName: string }>>('/users/search', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async getLabels() {
    return this.request<Array<{ id: string; name: string; color: string }>>('/labels');
  }

  async createLabel(data: { name: string; color?: string }) {
    return this.request<{ id: string; name: string; color: string }>('/labels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQuickReplies() {
    return this.request<Array<{ id: string; shortcode: string; message: string }>>('/quick-replies');
  }

  async createQuickReply(data: { shortcode: string; message: string }) {
    return this.request<{ id: string; shortcode: string; message: string }>('/quick-replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadKeys(deviceId: string, data: {
    identityKey: string;
    signedPrekey: { keyId: number; publicKey: string; signature: string };
    oneTimePrekeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    return this.request<{ success: boolean }>(`/crypto/keys/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getKeyBundle(userId: string, deviceId?: string) {
    const params = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request<{
      identityKey: string;
      signedPrekey: { keyId: number; publicKey: string; signature: string };
      oneTimePrekey?: { keyId: number; publicKey: string };
    } | null>(`/crypto/keys/${userId}/bundle${params}`);
  }

  async getPrekeyCount(deviceId: string) {
    return this.request<{ count: number }>(`/crypto/keys/${deviceId}/prekey-count`);
  }

  async getUserDevices(userId: string) {
    return this.request<{ devices: Array<{ deviceId: string; identityKey: string | null }> }>(
      `/crypto/keys/${userId}`
    );
  }

  async updateLabel(id: string, data: { name?: string; color?: string }) {
    return this.request<{ id: string; name: string; color: string }>(`/labels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLabel(id: string) {
    return this.request<{ message: string }>(`/labels/${id}`, {
      method: 'DELETE',
    });
  }

  async assignLabelsToChat(chatId: string, labelIds: string[]) {
    return this.request<Array<{ chatId: string; labelId: string }>>(`/labels/chats/${chatId}`, {
      method: 'POST',
      body: JSON.stringify({ labelIds }),
    });
  }

  async removeLabelFromChat(chatId: string, labelId: string) {
    return this.request<{ message: string }>(`/labels/chats/${chatId}/${labelId}`, {
      method: 'DELETE',
    });
  }

  async getChatsByLabel(labelId: string) {
    return this.request<string[]>(`/labels/${labelId}/chats`);
  }

  async updateQuickReply(id: string, data: { shortcode?: string; message?: string }) {
    return this.request<{ id: string; shortcode: string; message: string }>(`/quick-replies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteQuickReply(id: string) {
    return this.request<{ message: string }>(`/quick-replies/${id}`, {
      method: 'DELETE',
    });
  }

  async searchQuickReplies(prefix: string) {
    return this.request<Array<{ id: string; shortcode: string; message: string }>>(
      `/quick-replies?search=${encodeURIComponent(prefix)}`
    );
  }

  async getBusinessProfile() {
    return this.request<{
      id: string;
      businessName: string;
      description?: string;
      category?: string;
      address?: string;
      businessHours?: string;
      email?: string;
      website?: string;
    } | null>('/business/profile');
  }

  async updateBusinessProfile(data: {
    businessName?: string;
    description?: string;
    category?: string;
    address?: string;
    businessHours?: string;
    email?: string;
    website?: string;
  }) {
    return this.request<{
      id: string;
      businessName: string;
      description?: string;
      category?: string;
      address?: string;
      businessHours?: string;
      email?: string;
      website?: string;
    }>('/business/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getContacts() {
    return this.request<Array<{
      id: string;
      name: string;
      phoneNumber: string;
      email?: string;
      notes?: string;
      lastContactDate?: string;
    }>>('/contacts');
  }

  async createContact(data: { name: string; phoneNumber: string; email?: string; notes?: string }) {
    return this.request<{
      id: string;
      name: string;
      phoneNumber: string;
      email?: string;
      notes?: string;
    }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: { name?: string; email?: string; notes?: string; lastContactDate?: string }) {
    return this.request<{
      id: string;
      name: string;
      phoneNumber: string;
      email?: string;
      notes?: string;
      lastContactDate?: string;
    }>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string) {
    return this.request<{ message: string }>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
