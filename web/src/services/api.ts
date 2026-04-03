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

  async uploadMedia(file: File): Promise<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

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

  // Two-step verification
  async enableTwoStepVerification(pin: string) {
    return this.request<{ success: boolean }>('/users/me/two-step-verification', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async disableTwoStepVerification() {
    return this.request<{ success: boolean }>('/users/me/two-step-verification', {
      method: 'DELETE',
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
}

export const api = new ApiService();
