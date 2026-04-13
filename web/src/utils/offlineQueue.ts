interface QueuedAction {
  id: string;
  type: 'message' | 'read_receipt' | 'typing';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'chatapp_offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private processingQueue: boolean = false;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.openDB();
    this.setupEventListeners();
  }

  private openDB(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.loadFromDB().then(() => resolve());
        };

        request.onerror = () => {
          console.error('IndexedDB open failed, falling back to localStorage');
          this.loadFromLocalStorage();
          resolve();
        };
      } catch {
        console.error('IndexedDB not available, falling back to localStorage');
        this.loadFromLocalStorage();
        resolve();
      }
    });
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) {
      this.loadFromLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          this.queue = (request.result || []).sort(
            (a: QueuedAction, b: QueuedAction) => a.timestamp - b.timestamp
          );
          resolve();
        };

        request.onerror = () => {
          this.loadFromLocalStorage();
          resolve();
        };
      } catch {
        this.loadFromLocalStorage();
        resolve();
      }
    });
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('chatapp_offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        // Migrate localStorage data to IndexedDB if available
        if (this.db) {
          this.saveToDB();
          localStorage.removeItem('chatapp_offline_queue');
        }
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private async saveToDB(): Promise<void> {
    if (!this.db) {
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        store.clear();
        for (const item of this.queue) {
          store.put(item);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.saveToLocalStorage();
          resolve();
        };
      } catch {
        this.saveToLocalStorage();
        resolve();
      }
    });
  }

  private async addItemToDB(item: QueuedAction): Promise<void> {
    if (!this.db) {
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.saveToLocalStorage();
          resolve();
        };
      } catch {
        this.saveToLocalStorage();
        resolve();
      }
    });
  }

  private async removeItemFromDB(id: string): Promise<void> {
    if (!this.db) {
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('chatapp_offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
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
    this.addItemToDB(queuedAction);

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
    this.removeItemFromDB(id);
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

    await this.dbReady;
    this.processingQueue = true;

    while (this.queue.length > 0 && this.isOnline) {
      const action = this.queue[0];

      try {
        await this.processAction(action);
        this.queue.shift();
        await this.removeItemFromDB(action.id);
      } catch (err) {
        console.error('Failed to process action:', action.id, err);
        action.retryCount++;

        if (action.retryCount >= MAX_RETRIES) {
          console.error('Max retries reached for action:', action.id);
          this.queue.shift();
          await this.removeItemFromDB(action.id);
        } else {
          await this.addItemToDB(action);
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
