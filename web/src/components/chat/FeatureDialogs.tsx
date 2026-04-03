import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  X,
  Search,
  MapPin,
  FileDown,
  Download,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { EditMessageDialog } from '../MessageContextMenu';

interface Chat {
  id: string;
  name?: string;
  participants: Array<{ userId: string; user?: { id?: string; displayName?: string; phoneNumber?: string } }>;
  isLocked?: boolean;
  pinnedMessageId?: string | null;
}

interface FeatureDialogsProps {
  activeChat: Chat;
  userId: string;
  chats: Chat[];
  // Edit message
  editingMessage: { id: string; content: string } | null;
  onEditSave: (newContent: string) => Promise<void>;
  onEditCancel: () => void;
  // Forward
  showForwardDialog: string | null;
  onForward: (messageId: string, chatId: string) => Promise<void>;
  onCloseForward: () => void;
  // Disappearing
  showDisappearingDialog: boolean;
  onCloseDisappearing: () => void;
  // Wallpaper
  showWallpaperDialog: boolean;
  onCloseWallpaper: () => void;
  // Starred
  showStarredMessages: boolean;
  starredMessages: Array<{ id: string; content?: string; createdAt: string }>;
  onCloseStarred: () => void;
  // Poll
  showPollCreator: boolean;
  pollQuestion: string;
  pollOptions: string[];
  onSetPollQuestion: (q: string) => void;
  onSetPollOptions: (opts: string[]) => void;
  onClosePoll: () => void;
  onSendPoll: (data: string) => void;
  // Location
  showLocationPicker: boolean;
  onCloseLocation: () => void;
  onSendLocation: (data: string) => void;
  // Contact
  showContactPicker: boolean;
  onCloseContact: () => void;
  onSendContact: (data: string) => void;
  // GIF
  showGifPicker: boolean;
  gifSearchQuery: string;
  gifResults: Array<{ id: string; title?: string; media_formats?: Record<string, { url: string }> }>;
  isLoadingGifs: boolean;
  onSetGifSearchQuery: (q: string) => void;
  onSetGifResults: (r: Array<{ id: string; title?: string; media_formats?: Record<string, { url: string }> }>) => void;
  onSetIsLoadingGifs: (loading: boolean) => void;
  onCloseGif: () => void;
  // Backup
  showBackupDialog: boolean;
  onCloseBackup: () => void;
  // Chatbot
  showChatbotDialog: boolean;
  chatbotEnabled: boolean;
  chatbotRules: Array<{ trigger: string; response: string }>;
  onSetChatbotEnabled: (enabled: boolean) => void;
  onSetChatbotRules: (rules: Array<{ trigger: string; response: string }>) => void;
  onCloseChatbot: () => void;
  // Order
  showOrderDialog: boolean;
  orderItems: Array<{ productId: string; name: string; price: number; quantity: number }>;
  onSetOrderItems: (items: Array<{ productId: string; name: string; price: number; quantity: number }>) => void;
  onCloseOrder: () => void;
  // Search
  showSearchBar: boolean;
  chatSearchQuery: string;
  onSetChatSearchQuery: (q: string) => void;
  onCloseSearch: () => void;
}

export function FeatureDialogs(props: FeatureDialogsProps) {
  const { showError, showSuccess } = useToast();
  const {
    activeChat, userId, chats,
    editingMessage, onEditSave, onEditCancel,
    showForwardDialog, onForward, onCloseForward,
    showDisappearingDialog, onCloseDisappearing,
    showWallpaperDialog, onCloseWallpaper,
    showStarredMessages, starredMessages, onCloseStarred,
    showPollCreator, pollQuestion, pollOptions, onSetPollQuestion, onSetPollOptions, onClosePoll, onSendPoll,
    showLocationPicker, onCloseLocation, onSendLocation,
    showContactPicker, onCloseContact, onSendContact,
    showGifPicker, gifSearchQuery, gifResults, isLoadingGifs,
    onSetGifSearchQuery, onSetGifResults, onSetIsLoadingGifs, onCloseGif,
    showBackupDialog, onCloseBackup,
    showChatbotDialog, chatbotEnabled, chatbotRules, onSetChatbotEnabled, onSetChatbotRules, onCloseChatbot,
    showOrderDialog, orderItems, onSetOrderItems, onCloseOrder,
    showSearchBar, chatSearchQuery, onSetChatSearchQuery, onCloseSearch,
  } = props;

  return (
    <>
      {/* Search Bar */}
      {showSearchBar && (
        <div className="px-4 py-2 bg-white border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            className="flex-1 text-sm border-none outline-none bg-transparent"
            value={chatSearchQuery}
            onChange={(e) => onSetChatSearchQuery(e.target.value)}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onCloseSearch(); onSetChatSearchQuery(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Message Dialog */}
      <EditMessageDialog
        isOpen={!!editingMessage}
        content={editingMessage?.content || ''}
        onSave={onEditSave}
        onCancel={onEditCancel}
      />

      {/* Forward Dialog */}
      {showForwardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <h3 className="font-semibold mb-3">Forward to...</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {chats.filter(c => c.id !== activeChat?.id).map(chat => {
                const chatName = chat.name || chat.participants.find(p => p.userId !== userId)?.user?.displayName || 'Unknown';
                return (
                  <button
                    key={chat.id}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                    onClick={async () => {
                      if (showForwardDialog) {
                        try {
                          await onForward(showForwardDialog, chat.id);
                          showSuccess('Message forwarded');
                        } catch {
                          showError('Failed to forward message');
                        }
                        onCloseForward();
                      }
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-500 text-white text-xs">
                        {chatName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{chatName}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={onCloseForward}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Dialog */}
      {showDisappearingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Disappearing Messages</h3>
            <p className="text-sm text-gray-500 mb-4">Messages will disappear after the selected duration.</p>
            <div className="space-y-2">
              {[{label: 'Off', value: null}, {label: '24 hours', value: 86400}, {label: '7 days', value: 604800}, {label: '90 days', value: 7776000}].map(opt => (
                <button
                  key={opt.label}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                  onClick={async () => {
                    if (activeChat) {
                      try {
                        await api.setDisappearingMessages(activeChat.id, opt.value);
                        showSuccess('Disappearing messages updated');
                      } catch {
                        showError('Failed to update disappearing messages');
                      }
                    }
                    onCloseDisappearing();
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={onCloseDisappearing}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Dialog */}
      {showWallpaperDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Wallpaper</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['default', '#d9fdd3', '#fde4cf', '#cff4fc', '#f0d9ff', '#ffe4e1', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e0f7fa'].map(color => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-green-500"
                  style={{ backgroundColor: color === 'default' ? '#efeae2' : color }}
                  onClick={async () => {
                    if (activeChat) {
                      try {
                        await api.setChatWallpaper(activeChat.id, color === 'default' ? null : color);
                        showSuccess('Wallpaper updated');
                      } catch {
                        showError('Failed to update wallpaper');
                      }
                    }
                    onCloseWallpaper();
                  }}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCloseWallpaper}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Starred Messages Panel */}
      {showStarredMessages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Starred Messages</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCloseStarred}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {starredMessages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No starred messages</p>
              ) : starredMessages.map(msg => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Poll Creator Dialog */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Create Poll</h3>
            <input
              type="text"
              placeholder="Ask a question"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
              value={pollQuestion}
              onChange={(e) => onSetPollQuestion(e.target.value)}
            />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    onSetPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSetPollOptions(pollOptions.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 12 && (
              <button className="text-sm text-green-600 hover:text-green-700 mb-3" onClick={() => onSetPollOptions([...pollOptions, ''])}>
                + Add option
              </button>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { onClosePoll(); onSetPollQuestion(''); onSetPollOptions(['', '']); }}>Cancel</Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                onClick={() => {
                  const pollData = JSON.stringify({
                    question: pollQuestion,
                    options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0, voters: [] }))
                  });
                  onSendPoll(pollData);
                  onClosePoll();
                  onSetPollQuestion('');
                  onSetPollOptions(['', '']);
                }}
              >Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Dialog */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Share Location</h3>
            <p className="text-sm text-gray-500 mb-4">Share your current location or enter coordinates manually.</p>
            <Button
              className="w-full bg-green-500 hover:bg-green-600 mb-3"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const locData = JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        name: 'My Location'
                      });
                      onSendLocation(locData);
                      onCloseLocation();
                    },
                    () => {
                      showError('Location permission denied', 'Please enable location access in your browser settings');
                      onCloseLocation();
                    }
                  );
                } else {
                  showError('Geolocation not supported');
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2" /> Share Current Location
            </Button>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCloseLocation}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Dialog */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <h3 className="font-semibold mb-3">Share Contact</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {chats.map(chat => {
                const otherUser = chat.participants.find(p => p.userId !== userId)?.user;
                if (!otherUser) return null;
                return (
                  <button
                    key={otherUser.id}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                    onClick={() => {
                      const contactData = JSON.stringify({
                        name: otherUser.displayName,
                        phoneNumber: otherUser.phoneNumber
                      });
                      onSendContact(contactData);
                      onCloseContact();
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {otherUser.displayName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{otherUser.displayName}</p>
                      <p className="text-xs text-gray-500">{otherUser.phoneNumber}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={onCloseContact}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker Dialog */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Choose a GIF</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onCloseGif(); onSetGifSearchQuery(''); onSetGifResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search GIFs..."
                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/20"
                value={gifSearchQuery}
                onChange={(e) => {
                  onSetGifSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    onSetIsLoadingGifs(true);
                    api.searchGifs(e.target.value).then(r => { onSetGifResults(r); onSetIsLoadingGifs(false); }).catch(() => { onSetIsLoadingGifs(false); showError('Failed to search GIFs'); });
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-gray-500">Loading GIFs...</div>
                </div>
              ) : gifResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No GIFs found. Try a different search.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifResults.map(gif => (
                    <button
                      key={gif.id}
                      className="aspect-square overflow-hidden rounded-lg hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '';
                        if (activeChat && gifUrl) {
                          api.sendMediaMessage(activeChat.id, {
                            content: gif.title || 'GIF',
                            type: 'image',
                            mediaUrl: gifUrl,
                            mediaType: 'image/gif',
                            mediaName: `${gif.title || 'gif'}.gif`,
                            mediaSize: 0,
                            tempId: `temp-${Date.now()}`,
                          }).catch(() => { showError('Failed to send GIF'); });
                        }
                        onCloseGif();
                        onSetGifSearchQuery('');
                        onSetGifResults([]);
                      }}
                    >
                      <img
                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Powered by Tenor</p>
          </div>
        </div>
      )}

      {/* Chat Backup Dialog */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Backup</h3>
            <p className="text-sm text-gray-500 mb-4">Download a backup of this chat conversation.</p>
            <div className="space-y-2">
              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      const data = await api.backupChat(activeChat.id, 'text');
                      const blob = new Blob([data.content], { type: data.mimeType });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                      showSuccess('Chat backup downloaded');
                    } catch {
                      showError('Failed to create chat backup');
                    }
                  }
                  onCloseBackup();
                }}
              >
                <FileDown className="h-4 w-4 mr-2" /> Download as Text
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      const data = await api.backupChat(activeChat.id, 'json');
                      const blob = new Blob([data.content], { type: data.mimeType });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                      showSuccess('Chat backup downloaded');
                    } catch {
                      showError('Failed to create chat backup');
                    }
                  }
                  onCloseBackup();
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Download as JSON
              </Button>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={onCloseBackup}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Auto-Reply Dialog */}
      {showChatbotDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <h3 className="font-semibold mb-3">Chatbot Auto-Reply</h3>
            <p className="text-sm text-gray-500 mb-4">Set up automatic replies based on trigger keywords.</p>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium">Enable chatbot:</label>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${chatbotEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                onClick={() => onSetChatbotEnabled(!chatbotEnabled)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${chatbotEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {chatbotRules.map((rule, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <input
                    type="text"
                    placeholder="Trigger keyword (e.g. hello, help, price)"
                    className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                    value={rule.trigger}
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], trigger: e.target.value }; onSetChatbotRules(rules); }}
                  />
                  <input
                    type="text"
                    placeholder="Auto-reply message"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={rule.response}
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], response: e.target.value }; onSetChatbotRules(rules); }}
                  />
                  {chatbotRules.length > 1 && (
                    <button className="text-xs text-red-500 mt-1" onClick={() => onSetChatbotRules(chatbotRules.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-green-600 hover:text-green-700" onClick={() => onSetChatbotRules([...chatbotRules, { trigger: '', response: '' }])}>
                + Add rule
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={onCloseChatbot}>Cancel</Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={async () => {
                  if (activeChat) {
                    const validRules = chatbotRules.filter(r => r.trigger.trim() && r.response.trim());
                    try {
                      await api.configureChatbot(activeChat.id, { enabled: chatbotEnabled, rules: validRules });
                      showSuccess('Chatbot configuration saved');
                    } catch {
                      showError('Failed to save chatbot configuration');
                    }
                  }
                  onCloseChatbot();
                }}
              >Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Dialog */}
      {showOrderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <h3 className="font-semibold mb-3">Create Order</h3>
            <p className="text-sm text-gray-500 mb-4">Add items to create an order in this chat.</p>
            <div className="flex-1 overflow-y-auto space-y-3">
              {orderItems.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Product name"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={item.name}
                    onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], name: e.target.value, productId: `prod-${i}` }; onSetOrderItems(items); }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Price"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      value={item.price || ''}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], price: parseFloat(e.target.value) || 0 }; onSetOrderItems(items); }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      className="w-20 px-3 py-2 border rounded-lg text-sm"
                      value={item.quantity}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], quantity: parseInt(e.target.value) || 1 }; onSetOrderItems(items); }}
                    />
                  </div>
                  {orderItems.length > 1 && (
                    <button className="text-xs text-red-500" onClick={() => onSetOrderItems(orderItems.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-green-600 hover:text-green-700" onClick={() => onSetOrderItems([...orderItems, { productId: '', name: '', price: 0, quantity: 1 }])}>
                + Add item
              </button>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">Total: ${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { onCloseOrder(); onSetOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]); }}>Cancel</Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                disabled={!orderItems.some(item => item.name.trim() && item.price > 0)}
                onClick={async () => {
                  if (activeChat) {
                    const validItems = orderItems.filter(item => item.name.trim() && item.price > 0).map((item, i) => ({ ...item, productId: `prod-${i}` }));
                    try {
                      await api.createOrder(activeChat.id, validItems);
                      showSuccess('Order created');
                    } catch {
                      showError('Failed to create order');
                    }
                  }
                  onCloseOrder();
                  onSetOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]);
                }}
              >Create Order</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
