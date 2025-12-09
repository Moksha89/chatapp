interface QueuedAction {
  id: string;
  type: 'message' | 'read_receipt' | 'typing';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'chatapp_offline_queue';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 60000; // 1 minute

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private processingQueue: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  onStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const queuedAction: QueuedAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.queue.push(queuedAction);
    this.saveToStorage();
    
    if (this.isOnline) {
      this.processQueue();
    }
    
    return id;
  }

  queueMessage(chatId: string, content: string, type: 'text' | 'image' | 'file' = 'text'): string {
    return this.addToQueue({
      type: 'message',
      payload: { chatId, content, messageType: type },
    });
  }

  removeFromQueue(id: string) {
    this.queue = this.queue.filter(action => action.id !== id);
    this.saveToStorage();
  }

  getQueuedMessages(): QueuedAction[] {
    return this.queue.filter(action => action.type === 'message');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.processingQueue || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.queue.length > 0 && this.isOnline) {
      const action = this.queue[0];
      
      try {
        await this.processAction(action);
        this.queue.shift();
        this.saveToStorage();
      } catch (err) {
        console.error('Failed to process action:', action.id, err);
        action.retryCount++;
        
        if (action.retryCount >= MAX_RETRIES) {
          console.error('Max retries reached for action:', action.id);
          this.queue.shift();
          this.saveToStorage();
        } else {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 60s
          const delay = Math.min(
            BASE_RETRY_DELAY_MS * Math.pow(2, action.retryCount - 1),
            MAX_RETRY_DELAY_MS
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.processingQueue = false;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'message':
        if (this.messageProcessor) {
          await this.messageProcessor(action.payload);
        } else {
          throw new Error('No message processor set');
        }
        break;
      case 'read_receipt':
        if (this.readReceiptProcessor) {
          await this.readReceiptProcessor(action.payload);
        }
        break;
      case 'typing':
        break;
    }
  }

  setMessageProcessor(processor: (payload: unknown) => Promise<void>) {
    this.messageProcessor = processor;
  }

  setReadReceiptProcessor(processor: (payload: unknown) => Promise<void>) {
    this.readReceiptProcessor = processor;
  }

  private messageProcessor?: (payload: unknown) => Promise<void>;
  private readReceiptProcessor?: (payload: unknown) => Promise<void>;
}

export const offlineQueue = new OfflineQueue();
