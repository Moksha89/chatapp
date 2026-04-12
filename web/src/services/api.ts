const API_URL = import.meta.env.VITE_API_URL || '';

class ApiService {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async tryRefreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.accessToken) {
        this.accessToken = data.accessToken;
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.tryRefreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
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

    if (response.status === 401 && this.accessToken && !endpoint.startsWith('/auth/')) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.message || 'Request failed');
        }

        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async sendOtp(phoneNumber: string) {
    return this.request<{ message: string }>('/auth/send-otp', {
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

  async getAllUsers() {
    return this.request<Array<{ id: string; phoneNumber: string; displayName: string; profilePhoto: string | null; isBusiness: boolean }>>('/users/all');
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

    async getDevices(userId: string) {
      const result = await this.getUserDevices(userId);
      return result.devices || [];
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

  async createQrPairingSession(webDeviceId: string, webPublicKey?: string) {
    return this.request<{ pairingCode: string; expiresAt: string }>('/auth/qr/create', {
      method: 'POST',
      body: JSON.stringify({ webDeviceId, webPublicKey }),
    });
  }

  async getQrPairingStatus(pairingCode: string) {
    return this.request<{
      status: string;
      tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
      user?: { id: string; phoneNumber: string; displayName: string };
    }>(`/auth/qr/status/${pairingCode}`);
  }

  async confirmQrPairing(pairingCode: string) {
    return this.request<{ success: boolean; message: string }>('/auth/qr/confirm', {
      method: 'POST',
      body: JSON.stringify({ pairingCode }),
    });
  }

  async getLinkedDevices() {
    return this.request<Array<{
      id: string;
      deviceId: string;
      deviceName: string;
      deviceType: string;
      lastSeen: string;
      isActive: boolean;
      isPrimary: boolean;
    }>>('/devices');
  }

  async unlinkDevice(deviceId: string) {
    return this.request<{ message: string }>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Status/Stories APIs
  async getMyStatuses() {
    return this.request<Array<{
      id: string;
      userId: string;
      content: string;
      type: string;
      backgroundColor: string;
      textColor: string;
      expiresAt: string;
      viewedBy: string[];
      createdAt: string;
    }>>('/status/my');
  }

  async getContactStatuses() {
    return this.request<Array<{
      id: string;
      userId: string;
      content: string;
      type: string;
      backgroundColor: string;
      textColor: string;
      expiresAt: string;
      viewedBy: string[];
      createdAt: string;
      user?: { displayName: string };
    }>>('/status/contacts');
  }

  async createStatus(data: {
    content: string;
    type: string;
    backgroundColor?: string;
    textColor?: string;
    mediaUrl?: string;
  }) {
    return this.request<{ id: string }>('/status', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async viewStatus(statusId: string) {
    return this.request<{ success: boolean }>(`/status/${statusId}/view`, {
      method: 'POST',
    });
  }

  async deleteStatus(statusId: string) {
    return this.request<{ message: string }>(`/status/${statusId}`, {
      method: 'DELETE',
    });
  }

  // Broadcast APIs
  async getBroadcasts() {
    return this.request<Array<{
      id: string;
      name: string;
      recipientIds: string[];
      createdAt: string;
      updatedAt: string;
    }>>('/broadcasts');
  }

  async createBroadcast(data: { name: string; recipientIds: string[] }) {
    return this.request<{ id: string; name: string; recipientIds: string[] }>('/broadcasts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBroadcast(id: string, data: { name?: string; recipientIds?: string[] }) {
    return this.request<{ id: string; name: string; recipientIds: string[] }>(`/broadcasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBroadcast(id: string) {
    return this.request<{ message: string }>(`/broadcasts/${id}`, {
      method: 'DELETE',
    });
  }

  // Product Catalog APIs
  async getProducts() {
    return this.request<Array<{
      id: string;
      userId: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      imageUrls: string[];
      category: string;
      isAvailable: boolean;
      link: string | null;
      createdAt: string;
      updatedAt: string;
    }>>('/products');
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    category?: string;
    link?: string | null;
    imageUrls?: string[];
  }) {
    return this.request<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    link?: string | null;
    imageUrls?: string[];
  }) {
    return this.request<{ id: string }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleProductAvailability(id: string) {
    return this.request<{ id: string; isAvailable: boolean }>(`/products/${id}/toggle-availability`, {
      method: 'POST',
    });
  }

  // Auto-Reply APIs
  async getAutoReplies() {
    return this.request<Array<{
      id: string;
      userId: string;
      type: 'greeting' | 'away' | 'quick_reply';
      message: string;
      isEnabled: boolean;
      schedule: string | null;
      createdAt: string;
      updatedAt: string;
    }>>('/auto-replies');
  }

  async createAutoReply(data: {
    type: 'greeting' | 'away' | 'quick_reply';
    message: string;
    schedule?: string | null;
  }) {
    return this.request<{ id: string }>('/auto-replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAutoReply(id: string, data: {
    type?: 'greeting' | 'away' | 'quick_reply';
    message?: string;
    schedule?: string | null;
  }) {
    return this.request<{ id: string }>(`/auto-replies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAutoReply(id: string) {
    return this.request<{ message: string }>(`/auto-replies/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleAutoReply(id: string) {
    return this.request<{ id: string; isEnabled: boolean }>(`/auto-replies/${id}/toggle`, {
      method: 'POST',
    });
  }

  // Group Chat APIs
  async updateGroupInfo(chatId: string, data: { name?: string; description?: string; iconUrl?: string }) {
    return this.request<{ id: string }>(`/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addParticipant(chatId: string, userId: string) {
    return this.request<{ id: string }>(`/chats/${chatId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async removeParticipant(chatId: string, participantId: string) {
    return this.request<{ message: string }>(`/chats/${chatId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  async makeAdmin(chatId: string, participantId: string) {
    return this.request<{ id: string }>(`/chats/${chatId}/participants/${participantId}/admin`, {
      method: 'POST',
    });
  }

  async leaveGroup(chatId: string) {
    return this.request<{ message: string }>(`/chats/${chatId}/leave`, {
      method: 'POST',
    });
  }
  async removeAdmin(chatId: string, participantId: string) {
    return this.request<{ id: string }>(`/chats/${chatId}/participants/${participantId}/admin`, {
      method: 'DELETE',
    });
  }

  async getGroupInviteLink(chatId: string) {
    return this.request<{ inviteLink: string; expiresAt?: string }>(`/chats/${chatId}/invite-link`);
  }

  async revokeGroupInviteLink(chatId: string) {
    return this.request<{ inviteLink: string }>(`/chats/${chatId}/invite-link/revoke`, {
      method: 'POST',
    });
  }

  async updateGroupPermissions(chatId: string, permissions: {
    sendMessages?: boolean;
    sendMedia?: boolean;
    addMembers?: boolean;
    pinMessages?: boolean;
    editGroupInfo?: boolean;
  }) {
    return this.request<{ id: string }>(`/chats/${chatId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(permissions),
    });
  }

  async getGroupPermissions(chatId: string) {
    return this.request<{
      sendMessages: boolean;
      sendMedia: boolean;
      addMembers: boolean;
      pinMessages: boolean;
      editGroupInfo: boolean;
    }>(`/chats/${chatId}/permissions`);
  }



  // Upload media with optional progress callback
  async uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  }> {
    const doUpload = (token: string | null): Promise<Response> => {
      if (onProgress) {
        // Use XHR for real progress tracking
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/media/upload`);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(e.loaded / e.total);
          };
          xhr.onload = () => {
            resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          const fd = new FormData();
          fd.append('file', file);
          xhr.send(fd);
        });
      }
      const formData = new FormData();
      formData.append('file', file);
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return fetch(`${API_URL}/media/upload`, { method: 'POST', headers, body: formData });
    };

    let response = await doUpload(this.accessToken);

    // Retry on 401 with refreshed token
    if (response.status === 401 && this.accessToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        response = await doUpload(newToken);
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async sendMediaMessage(chatId: string, data: {
    content: string;
    type: 'image' | 'video' | 'audio' | 'video-note' | 'file';
    mediaUrl: string;
    mediaType: string;
    mediaName: string;
    mediaSize: number;
    mediaDuration?: number;
    tempId?: string;
  }) {
    return this.request<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      type: string;
      status: string;
      mediaUrl: string;
      mediaType: string;
      mediaName: string;
      mediaSize: number;
      mediaDuration?: number;
      createdAt: string;
    }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Message Search
  async searchMessages(query: string, limit = 50) {
    return this.request<Array<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      type: string;
      createdAt: string;
      isStarred: boolean;
    }>>(`/chats/search/messages?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Starred Messages
  async getStarredMessages() {
    return this.request<Array<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      type: string;
      createdAt: string;
      isStarred: boolean;
    }>>('/chats/starred/messages');
  }

  async toggleMessageStar(chatId: string, messageId: string) {
    return this.request<{
      id: string;
      isStarred: boolean;
    }>(`/chats/${chatId}/messages/${messageId}/star`, {
      method: 'POST',
    });
  }

  // Forward Message
  async forwardMessage(sourceChatId: string, messageId: string, targetChatId: string) {
    return this.request<{
      id: string;
      chatId: string;
      content: string;
      forwardedFrom: string;
    }>(`/chats/${sourceChatId}/messages/${messageId}/forward`, {
      method: 'POST',
      body: JSON.stringify({ targetChatId }),
    });
  }

  // Chat Export
  async exportChat(chatId: string) {
    return this.request<{
      chatId: string;
      exportedAt: string;
      messageCount: number;
      messages: Array<{
        id: string;
        senderId: string;
        content: string;
        type: string;
        createdAt: string;
      }>;
    }>(`/chats/${chatId}/export`);
  }

  // Disappearing Messages
  async setDisappearingMessages(chatId: string, duration: number | null) {
    return this.request<{
      id: string;
      disappearingMessagesDuration: number | null;
    }>(`/chats/${chatId}/disappearing`, {
      method: 'PUT',
      body: JSON.stringify({ duration }),
    });
  }

  // Privacy Settings
  async getPrivacySettings() {
    return this.request<{
      readReceiptsEnabled: boolean;
      language: string;
    }>('/users/me/privacy');
  }

  async updatePrivacySettings(settings: { readReceiptsEnabled?: boolean; language?: string }) {
    return this.request<{
      readReceiptsEnabled: boolean;
      language: string;
    }>('/users/me/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Block/Unblock Users
  async getBlockedUsers() {
    return this.request<string[]>('/users/me/blocked');
  }

  async blockUser(userId: string) {
    return this.request<{ blocked: string[] }>(`/users/${userId}/block`, {
      method: 'POST',
    });
  }

  async unblockUser(userId: string) {
    return this.request<{ blocked: string[] }>(`/users/${userId}/unblock`, {
      method: 'POST',
    });
  }

  // Report User
  async reportUser(userId: string, reason: string, details?: string) {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }

  // Message Reactions
  async addReaction(chatId: string, messageId: string, emoji: string) {
    return this.request<{
      id: string;
      reactions: { [emoji: string]: string[] };
    }>(`/chats/${chatId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(chatId: string, messageId: string, emoji: string) {
    return this.request<{
      id: string;
      reactions: { [emoji: string]: string[] };
    }>(`/chats/${chatId}/messages/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji }),
    });
  }

  // Edit Message
  async editMessage(chatId: string, messageId: string, content: string) {
    return this.request<{
      id: string;
      content: string;
      isEdited: boolean;
      editedAt: string;
    }>(`/chats/${chatId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  // Delete Message
  async deleteMessage(chatId: string, messageId: string, deleteForEveryone: boolean) {
    return this.request<{
      id: string;
      isDeleted: boolean;
    }>(`/chats/${chatId}/messages/${messageId}?deleteForEveryone=${deleteForEveryone}`, {
      method: 'DELETE',
    });
  }

  // Get single message (for reply preview)
  async getMessage(chatId: string, messageId: string) {
    return this.request<{
      id: string;
      chatId: string;
      senderId: string;
      content: string;
      type: string;
      createdAt: string;
    }>(`/chats/${chatId}/messages/${messageId}`);
  }

  // Pin/Unpin message
  async pinMessage(chatId: string, messageId: string | null) {
    return this.request<{ id: string; pinnedMessageId: string | null }>(`/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  }

  // Set chat wallpaper
  async setChatWallpaper(chatId: string, wallpaper: string | null) {
    return this.request<{ id: string; wallpaper: string | null }>(`/chats/${chatId}/wallpaper`, {
      method: 'PUT',
      body: JSON.stringify({ wallpaper }),
    });
  }

  // Toggle chat lock
  async toggleChatLock(chatId: string) {
    return this.request<{ id: string; isLocked: boolean }>(`/chats/${chatId}/lock`, {
      method: 'POST',
    });
  }

  // Create channel
  async createChannel(name: string, description?: string) {
    return this.request<{ id: string; type: string; name: string }>('/chats/channels', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // Create community
  async createCommunity(name: string, description?: string) {
    return this.request<{ id: string; type: string; name: string }>('/chats/communities', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // Vote on poll
  async votePoll(chatId: string, messageId: string, optionIndex: number) {
    return this.request<{ id: string; content: string }>(`/chats/${chatId}/messages/${messageId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndex }),
    });
  }

  // Mark view-once message as viewed
  async markViewOnceViewed(chatId: string, messageId: string) {
    return this.request<{ id: string; isViewed: boolean }>(`/chats/${chatId}/messages/${messageId}/view-once`, {
      method: 'POST',
    });
  }

  // Chat backup
  async backupChat(chatId: string, format: 'text' | 'json' = 'text') {
    return this.request<{ filename: string; content: string; mimeType: string }>(`/chats/${chatId}/backup?format=${format}`);
  }

  // Chatbot configuration
  async configureChatbot(chatId: string, config: { enabled: boolean; rules: Array<{ trigger: string; response: string }> }) {
    return this.request<{ chatId: string; enabled: boolean; rules: Array<{ trigger: string; response: string }> }>(`/chats/${chatId}/chatbot`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getChatbot(chatId: string) {
    return this.request<{ chatId: string; enabled: boolean; rules: Array<{ trigger: string; response: string }> }>(`/chats/${chatId}/chatbot`);
  }

  // WhatsApp Flows
  async submitFlowResponse(chatId: string, messageId: string, formData: Record<string, string | number | boolean>) {
    return this.request<{ id: string }>(`/chats/${chatId}/messages/${messageId}/flow`, {
      method: 'POST',
      body: JSON.stringify({ formData }),
    });
  }

  // Order management
  async createOrder(chatId: string, items: Array<{ productId: string; name: string; price: number; quantity: number }>) {
    return this.request<{ id: string; total: number; status: string }>(`/chats/${chatId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async getOrders(chatId: string) {
    return this.request<Array<{ id: string; items: Array<{ productId: string; name: string; price: number; quantity: number }>; total: number; status: string; createdAt: string }>>(`/chats/${chatId}/orders`);
  }

  async updateOrderStatus(chatId: string, orderId: string, status: string) {
    return this.request<{ id: string; status: string }>(`/chats/${chatId}/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // GIF search via Tenor API
  async searchGifs(query: string) {
    const tenorApiKey = import.meta.env.VITE_TENOR_API_KEY || '';
    if (!tenorApiKey) throw new Error('Tenor API key not configured');
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorApiKey}&limit=20&media_filter=gif`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('GIF search failed');
    const data = await response.json();
    return data.results as Array<{ id: string; title: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>;
  }

  async getTrendingGifs() {
    const tenorApiKey = import.meta.env.VITE_TENOR_API_KEY || '';
    if (!tenorApiKey) throw new Error('Tenor API key not configured');
    const url = `https://tenor.googleapis.com/v2/featured?key=${tenorApiKey}&limit=20&media_filter=gif`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('GIF fetch failed');
    const data = await response.json();
    return data.results as Array<{ id: string; title: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>;
  }

  // ========== CHAT UX (ChitChat features) ==========
  async pinConversation(chatId: string, isPinned: boolean) {
    return this.request<{ id: string; isPinned: boolean }>(`/chats/${chatId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ isPinned }),
    });
  }

  async muteConversation(chatId: string, muted: boolean, duration?: '1h' | '8h' | '1w' | 'forever') {
    return this.request<{ id: string; isMuted: boolean; mutedUntil: string | null }>(`/chats/${chatId}/mute`, {
      method: 'PUT',
      body: JSON.stringify({ muted, duration }),
    });
  }

  async archiveConversation(chatId: string, isArchived: boolean) {
    return this.request<{ id: string; isArchived: boolean }>(`/chats/${chatId}/archive`, {
      method: 'PUT',
      body: JSON.stringify({ isArchived }),
    });
  }

  async favoriteConversation(chatId: string, isFavorite: boolean) {
    return this.request<{ id: string; isFavorite: boolean }>(`/chats/${chatId}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite }),
    });
  }

  async clearChatHistory(chatId: string) {
    return this.request<{ id: string; clearChatBefore: string }>(`/chats/${chatId}/clear`, {
      method: 'POST',
    });
  }

  async reportContact(chatId: string, reason: string, details?: string) {
    return this.request<{ message: string }>(`/chats/${chatId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }
  // Enhanced Privacy - Two-step verification
  async enableTwoStepVerification(pin: string, email?: string) {
    return this.request<{ enabled: boolean }>('/users/me/two-step', {
      method: 'POST',
      body: JSON.stringify({ pin, email }),
    });
  }

  async disableTwoStepVerification() {
    return this.request<{ enabled: boolean }>('/users/me/two-step', {
      method: 'DELETE',
    });
  }

  async verifyTwoStepPin(pin: string) {
    return this.request<{ verified: boolean }>('/users/me/two-step/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  // Enhanced Privacy - Last seen & online controls
  async updateLastSeenPrivacy(level: 'everyone' | 'contacts' | 'nobody') {
    return this.request<{ lastSeenPrivacy: string }>('/users/me/privacy/last-seen', {
      method: 'PUT',
      body: JSON.stringify({ level }),
    });
  }

  // Enhanced Privacy - Safety number verification
  async getSafetyNumber(chatId: string) {
    return this.request<{ safetyNumber: string; qrCode: string }>(`/chats/${chatId}/safety-number`);
  }

  async verifySafetyNumber(chatId: string, safetyNumber: string) {
    return this.request<{ verified: boolean }>(`/chats/${chatId}/safety-number/verify`, {
      method: 'POST',
      body: JSON.stringify({ safetyNumber }),
    });
  }

  // Enhanced Privacy - View-once messages
  async sendViewOnceMessage(chatId: string, mediaUrl: string, type: 'image' | 'video') {
    return this.request<{ id: string }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ mediaUrl, type, viewOnce: true }),
    });
  }

  // Enhanced Privacy - IP protection for calls
  async updateCallPrivacy(settings: { ipProtection?: boolean; callPrivacy?: string }) {
    return this.request<{ ipProtection: boolean; callPrivacy: string }>('/users/me/privacy/calls', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }



  // Enhanced Business - Message Templates
  async getMessageTemplates() {
    return this.request<Array<{ id: string; name: string; content: string; category: string; variables: string[] }>>('/business/templates');
  }

  async createMessageTemplate(data: { name: string; content: string; category: string }) {
    return this.request<{ id: string }>('/business/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Enhanced Business - Payment Integration
  async createPaymentLink(amount: number, currency: string, description: string) {
    return this.request<{ paymentUrl: string; id: string }>('/business/payments/link', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, description }),
    });
  }

  async getPaymentHistory() {
    return this.request<Array<{ id: string; amount: number; currency: string; status: string; createdAt: string }>>('/business/payments/history');
  }

  // Enhanced Business - Catalog Sharing
  async getCatalogShareLink() {
    return this.request<{ shareUrl: string; qrCode: string }>('/business/catalog/share');
  }

  // Enhanced Business - WhatsApp Flows
  async getFlows() {
    return this.request<Array<{ id: string; name: string; status: string; steps: number }>>('/business/flows');
  }

  async createFlow(data: { name: string; steps: Array<{ type: string; content: string; options?: string[] }> }) {
    return this.request<{ id: string }>('/business/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Enhanced Business - Broadcast Analytics
  async getBroadcastAnalytics(broadcastId: string) {
    return this.request<{ sent: number; delivered: number; read: number; replied: number }>(`/broadcasts/${broadcastId}/analytics`);
  }

  // Enhanced Business - Scheduled Messages
  async scheduleMessage(chatId: string, content: string, scheduledAt: string) {
    return this.request<{ id: string; scheduledAt: string }>(`/chats/${chatId}/messages/schedule`, {
      method: 'POST',
      body: JSON.stringify({ content, scheduledAt }),
    });
  }

  async getScheduledMessages() {
    return this.request<Array<{ id: string; chatId: string; content: string; scheduledAt: string; status: string }>>('/messages/scheduled');
  }

  // ========== CONTACTS & SETTINGS (Enhanced features) ==========
  async syncContacts(phoneNumbers: string[]) {
    return this.request<Array<{ phoneNumber: string; userId: string; displayName: string }>>('/contacts/sync', {
      method: 'POST',
      body: JSON.stringify({ phoneNumbers }),
    });
  }

  async inviteByPhone(phoneNumber: string) {
    return this.request<{ sent: boolean }>('/contacts/invite', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async getInviteLink() {
    return this.request<{ inviteUrl: string; qrCode: string }>('/users/invite-link');
  }

  async getNotificationSettings() {
    return this.request<{ messagePreview: boolean; sound: boolean; vibrate: boolean; groupNotifications: boolean; channelNotifications: boolean; callRingtone: string }>('/settings/notifications');
  }

  async updateNotificationSettings(settings: Record<string, boolean | string>) {
    return this.request<{ success: boolean }>('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getStorageUsage() {
    return this.request<{ total: number; messages: number; media: number; documents: number; perChat: Array<{ chatId: string; chatName: string; size: number }> }>('/settings/storage');
  }

  async clearChatStorage(chatId: string) {
    return this.request<{ freed: number }>(`/settings/storage/${chatId}`, { method: 'DELETE' });
  }

  async getThemeSettings() {
    return this.request<{ theme: string; wallpaper: string; chatBubbleColor: string; fontSize: string }>('/settings/theme');
  }

  async updateThemeSettings(settings: Record<string, string>) {
    return this.request<{ success: boolean }>('/settings/theme', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAppVersion() {
    return this.request<{ current: string; latest: string; changelog: string; updateUrl: string }>('/version');
  }

  async createChatBackup(includeMedia: boolean = false) {
    return this.request<{ backupId: string; size: number; createdAt: string }>('/settings/backup', {
      method: 'POST',
      body: JSON.stringify({ includeMedia }),
    });
  }

  async getBackupHistory() {
    return this.request<Array<{ id: string; size: number; createdAt: string; includeMedia: boolean }>>('/settings/backup/history');
  }

  // ========== FRIENDS (ChitChat features) ==========
  async getFriends() {
    return this.request<Array<{ id: string; userId: string; friendId: string; status: string; createdAt: string }>>('/friends');
  }

  async getFriendRequests() {
    return this.request<Array<{ id: string; requesterId: string; recipientId: string; status: string; createdAt: string; user: { id: string; displayName: string; phoneNumber: string } }>>('/friends/requests/pending');
  }

  async getSentFriendRequests() {
    return this.request<Array<{ id: string; requesterId: string; recipientId: string; status: string; createdAt: string; user: { id: string; displayName: string; phoneNumber: string } }>>('/friends/requests/sent');
  }

  async getFriendSuggestions() {
    return this.request<Array<{ id: string; displayName: string; phoneNumber: string }>>('/friends/suggestions');
  }

  async sendFriendRequest(userId: string) {
    return this.request<{ id: string; status: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async acceptFriendRequest(requestId: string) {
    return this.request<{ id: string; status: string }>(`/friends/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async declineFriendRequest(requestId: string) {
    return this.request<{ id: string; status: string }>(`/friends/${requestId}/decline`, {
      method: 'POST',
    });
  }

  async removeFriend(friendshipId: string) {
    return this.request<{ message: string }>(`/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  async blockFriend(userId: string) {
    return this.request<{ id: string; status: string }>('/friends/block', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async unblockFriend(userId: string) {
    return this.request<{ message: string }>('/friends/unblock', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // ========== CALLS (ChitChat features) ==========
  async getCallHistory() {
    return this.request<Array<{
      id: string;
      initiatorId: string;
      receiverId: string;
      chatId: string;
      type: string;
      mode: string;
      status: string;
      startedAt: string;
      endedAt: string | null;
      duration: number | null;
    }>>('/calls/history');
  }

  async initiateCall(receiverId: string, chatId: string, type: 'audio' | 'video') {
    return this.request<{ id: string; status: string }>('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ receiverId, chatId, type }),
    });
  }

  async answerCallApi(callId: string) {
    return this.request<{ id: string; status: string }>(`/calls/${callId}/answer`, {
      method: 'POST',
    });
  }

  async declineCallApi(callId: string) {
    return this.request<{ id: string; status: string }>(`/calls/${callId}/decline`, {
      method: 'POST',
    });
  }

  async endCallApi(callId: string) {
    return this.request<{ id: string; status: string; duration: number }>(`/calls/${callId}/end`, {
      method: 'POST',
    });
  }

  // ========== STICKERS (ChitChat features) ==========
  async getStickers() {
    return this.request<Array<{
      id: string;
      packName: string;
      imageUrl: string;
      emoji: string | null;
      isActive: boolean;
    }>>('/admin/stickers');
  }

  // ========== BACKUP (ChitChat features) ==========
  async exportChatBackup(chatId: string, format: 'json' | 'text' = 'text', includeMedia = false) {
    return this.request<{ filename: string; content: string; mimeType: string }>(
      `/backup/chats/${chatId}/export?format=${format}&includeMedia=${includeMedia}`
    );
  }

  async getGoogleDriveAuthUrl() {
    return this.request<{ authUrl?: string; error?: string }>('/backup/google/auth');
  }

  // ========== CHATIFY FEATURES: Admin Extras ==========
  async getCountryStats() {
    return this.request<Array<{ country: string; count: number; percentage: number }>>('/admin/dashboard/country-stats');
  }

  async getPendingApprovals(page = 1) {
    return this.request<{ users: Array<{ id: string; phoneNumber: string; displayName: string; createdAt: string }>; total: number }>(`/admin/approvals/pending?page=${page}`);
  }

  async approveUser(userId: string) {
    return this.request<{ id: string }>(`/admin/users/${userId}/approve`, { method: 'POST' });
  }

  async rejectUser(userId: string) {
    return this.request<boolean>(`/admin/users/${userId}/reject`, { method: 'POST' });
  }

  async adminCreateUser(data: { phoneNumber: string; displayName: string; isBusiness?: boolean; country?: string }) {
    return this.request<{ id: string; phoneNumber: string; displayName: string }>('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async postGlobalStatus(content: string, type: 'text' | 'image' = 'text', mediaUrl?: string, backgroundColor?: string) {
    return this.request<{ id: string }>('/admin/status/global', {
      method: 'POST',
      body: JSON.stringify({ content, type, mediaUrl, backgroundColor }),
    });
  }

  async getConfigurableLimits() {
    return this.request<Record<string, string>>('/admin/limits');
  }

  // ========== CHATIFY FEATURES: Shared Media ==========
  async getChatSharedMedia(chatId: string) {
    return this.request<Array<{ id: string; type: string; mediaUrl: string; mediaName: string; mediaSize: number; createdAt: string }>>(
      `/chats/${chatId}/messages?type=media`
    );
  }

  // ========== CHATIFY FEATURES: Group Seen-By ==========
  async getMessageSeenBy(chatId: string, messageId: string) {
    return this.request<Array<{ userId: string; displayName: string; seenAt: string }>>(
      `/chats/${chatId}/messages/${messageId}/seen-by`
    );
  }
}

export const api = new ApiService();
