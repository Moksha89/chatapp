import { useRef } from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  X,
  Search,
  MapPin,
  FileDown,
  Download,
  Timer,
  Phone,
  Video,
  Upload,
  Users,
  LogOut,
} from 'lucide-react';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useToast } from '../Toast';
import { EditMessageDialog } from '../MessageContextMenu';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ChatDialogsProps {
  activeChat: any;
  userId: string;
  user: { id: string; displayName?: string; phoneNumber?: string } | null;
  chats: any[];
  refreshChats: () => Promise<void>;
  selectChat: (chat: any) => void;

  // Edit message
  editingMessage: { id: string; content: string } | null;
  editMessage: (id: string, content: string) => Promise<void>;
  setEditingMessage: (msg: { id: string; content: string } | null) => void;

  // Forward
  showForwardDialog: string | null;
  forwardMessage: (messageId: string, chatId: string) => Promise<void>;
  setShowForwardDialog: (id: string | null) => void;

  // Disappearing
  showDisappearingDialog: boolean;
  setShowDisappearingDialog: (show: boolean) => void;

  // Wallpaper
  showWallpaperDialog: boolean;
  setShowWallpaperDialog: (show: boolean) => void;

  // Starred
  showStarredMessages: boolean;
  setShowStarredMessages: (show: boolean) => void;
  starredMessages: Array<{ id: string; chatId: string; senderId: string; content: string; type: string; createdAt: string; isStarred: boolean; status?: string }>;

  // Poll
  showPollCreator: boolean;
  setShowPollCreator: (show: boolean) => void;
  pollQuestion: string;
  setPollQuestion: (q: string) => void;
  pollOptions: string[];
  setPollOptions: (opts: string[]) => void;

  // Location
  showLocationPicker: boolean;
  setShowLocationPicker: (show: boolean) => void;

  // Contact
  showContactPicker: boolean;
  setShowContactPicker: (show: boolean) => void;
  contactPickerUsers: Array<{ id: string; displayName: string; phoneNumber: string }>;

  // GIF
  showGifPicker: boolean;
  setShowGifPicker: (show: boolean) => void;
  gifSearchQuery: string;
  setGifSearchQuery: (q: string) => void;
  gifResults: Array<{ id: string; title: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>;
  setGifResults: (r: Array<{ id: string; title: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>) => void;
  isLoadingGifs: boolean;
  setIsLoadingGifs: (loading: boolean) => void;

  // Backup
  showBackupDialog: boolean;
  setShowBackupDialog: (show: boolean) => void;

  // Chatbot
  showChatbotDialog: boolean;
  setShowChatbotDialog: (show: boolean) => void;
  chatbotEnabled: boolean;
  setChatbotEnabled: (enabled: boolean) => void;
  chatbotRules: Array<{ trigger: string; response: string }>;
  setChatbotRules: (rules: Array<{ trigger: string; response: string }>) => void;

  // Media lightbox
  showMediaLightbox: string | null;
  setShowMediaLightbox: (url: string | null) => void;

  // Group info
  showGroupInfo: boolean;
  setShowGroupInfo: (show: boolean) => void;
  getChatName: () => string;
  getChatInitials: () => string;

  // Contact details
  showContactDetails: boolean;
  setShowContactDetails: (show: boolean) => void;
  handleVoiceCall: () => void;
  handleVideoCall: () => void;

  // Global search
  showGlobalSearch: boolean;
  setShowGlobalSearch: (show: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  globalSearchResults: Array<{ id: string; chatId: string; content: string; createdAt: string }>;
  setGlobalSearchResults: (r: Array<{ id: string; chatId: string; content: string; createdAt: string }>) => void;

  // Channel info
  showChannelInfo: boolean;
  setShowChannelInfo: (show: boolean) => void;

  // Order
  showOrderDialog: boolean;
  setShowOrderDialog: (show: boolean) => void;
  orderItems: Array<{ productId: string; name: string; price: number; quantity: number }>;
  setOrderItems: (items: Array<{ productId: string; name: string; price: number; quantity: number }>) => void;

  // Add member
  showAddMemberDialog: boolean;
  setShowAddMemberDialog: (show: boolean) => void;
  availableUsersForAdd: Array<{ id: string; displayName: string; phoneNumber: string }>;
  setAvailableUsersForAdd: (users: Array<{ id: string; displayName: string; phoneNumber: string }>) => void;
}

export function ChatDialogs(props: ChatDialogsProps) {
  const { showError } = useToast();
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const {
    activeChat, userId, user, chats, refreshChats, selectChat,
    editingMessage, editMessage, setEditingMessage,
    showForwardDialog, forwardMessage, setShowForwardDialog,
    showDisappearingDialog, setShowDisappearingDialog,
    showWallpaperDialog, setShowWallpaperDialog,
    showStarredMessages, setShowStarredMessages, starredMessages,
    showPollCreator, setShowPollCreator, pollQuestion, setPollQuestion, pollOptions, setPollOptions,
    showLocationPicker, setShowLocationPicker,
    showContactPicker, setShowContactPicker, contactPickerUsers,
    showGifPicker, setShowGifPicker, gifSearchQuery, setGifSearchQuery, gifResults, setGifResults, isLoadingGifs, setIsLoadingGifs,
    showBackupDialog, setShowBackupDialog,
    showChatbotDialog, setShowChatbotDialog, chatbotEnabled, setChatbotEnabled, chatbotRules, setChatbotRules,
    showMediaLightbox, setShowMediaLightbox,
    showGroupInfo, setShowGroupInfo, getChatName, getChatInitials,
    showContactDetails, setShowContactDetails, handleVoiceCall, handleVideoCall,
    showGlobalSearch, setShowGlobalSearch, globalSearchQuery, setGlobalSearchQuery, globalSearchResults, setGlobalSearchResults,
    showChannelInfo, setShowChannelInfo,
    showOrderDialog, setShowOrderDialog, orderItems, setOrderItems,
    showAddMemberDialog, setShowAddMemberDialog, availableUsersForAdd, setAvailableUsersForAdd,
  } = props;

  return (
    <>
      {/* Edit Message Dialog */}
      <EditMessageDialog
        isOpen={!!editingMessage}
        content={editingMessage?.content || ''}
        onSave={async (newContent) => {
          if (editingMessage) {
            await editMessage(editingMessage.id, newContent);
            setEditingMessage(null);
          }
        }}
        onCancel={() => setEditingMessage(null)}
      />

      {/* Forward Dialog */}
      {showForwardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col dialog-content">
            <h3 className="font-semibold mb-3">Forward to...</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {chats.filter(c => c.id !== activeChat?.id).map(chat => {
                const chatName = chat.name || chat.participants.find((p: any) => p.userId !== userId)?.user?.displayName || 'Unknown';
                return (
                  <button
                    key={chat.id}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                    onClick={async () => {
                      if (showForwardDialog) {
                        await forwardMessage(showForwardDialog, chat.id);
                        setShowForwardDialog(null);
                      }
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#00a884] text-white text-xs">
                        {chatName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{chatName}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowForwardDialog(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Dialog */}
      {showDisappearingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Disappearing Messages</h3>
            {activeChat?.disappearingMessagesDuration && <p className="text-sm text-[#00a884] mb-2 flex items-center gap-1"><Timer className="h-3 w-3" /> Currently enabled ({activeChat.disappearingMessagesDuration === 86400 ? '24 hours' : activeChat.disappearingMessagesDuration === 604800 ? '7 days' : '90 days'})</p>}
            <p className="text-sm text-gray-500 mb-4">Messages will disappear after the selected duration.</p>
            <div className="space-y-2">
              {[{label: 'Off', value: null}, {label: '24 hours', value: 86400}, {label: '7 days', value: 604800}, {label: '90 days', value: 7776000}].map(opt => (
                <button
                  key={opt.label}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                  onClick={async () => {
                    if (activeChat) {
                      try { await api.setDisappearingMessages(activeChat.id, opt.value); await refreshChats(); } catch { showError('Failed to set disappearing messages'); }
                    }
                    setShowDisappearingDialog(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowDisappearingDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Dialog */}
      {showWallpaperDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Wallpaper</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['default', '#d9fdd3', '#fde4cf', '#cff4fc', '#f0d9ff', '#ffe4e1', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e0f7fa'].map(color => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-[#00a884]"
                  style={{ backgroundColor: color === 'default' ? '#efeae2' : color }}
                  onClick={async () => {
                    if (activeChat) {
                      try { await api.setChatWallpaper(activeChat.id, color === 'default' ? null : color); await refreshChats(); } catch { showError('Failed to set wallpaper'); }
                    }
                    setShowWallpaperDialog(false);
                  }}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowWallpaperDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Starred Messages Panel */}
      {showStarredMessages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Starred Messages</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowStarredMessages(false)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Create Poll</h3>
            <input
              type="text"
              placeholder="Ask a question"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
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
                    setPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 12 && (
              <button className="text-sm text-[#00a884] hover:text-[#008069] mb-3" onClick={() => setPollOptions([...pollOptions, ''])}>
                + Add option
              </button>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowPollCreator(false); setPollQuestion(''); setPollOptions(['', '']); }}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                onClick={() => {
                  const pollData = JSON.stringify({
                    question: pollQuestion,
                    options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0, voters: [] }))
                  });
                  if (activeChat) {
                    socketService.emit('message:send', {
                      chatId: activeChat.id,
                      content: pollData,
                      type: 'poll',
                      tempId: `temp-${Date.now()}`,
                    });
                  }
                  setShowPollCreator(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                }}
              >Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Dialog */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Share Location</h3>
            <p className="text-sm text-gray-500 mb-4">Share your current location or enter coordinates manually.</p>
            <Button
              className="w-full bg-[#00a884] hover:bg-[#008069] mb-3"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const locData = JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        name: 'My Location'
                      });
                      if (activeChat) {
                        socketService.emit('message:send', {
                          chatId: activeChat.id,
                          content: locData,
                          type: 'location',
                          tempId: `temp-${Date.now()}`,
                        });
                      }
                      setShowLocationPicker(false);
                    },
                    () => {
                      const locData = JSON.stringify({ latitude: 0, longitude: 0, name: 'Location (permission denied)' });
                      if (activeChat) {
                        socketService.emit('message:send', {
                          chatId: activeChat.id,
                          content: locData,
                          type: 'location',
                          tempId: `temp-${Date.now()}`,
                        });
                      }
                      setShowLocationPicker(false);
                    }
                  );
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2" /> Share Current Location
            </Button>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowLocationPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Dialog */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <h3 className="font-semibold mb-3">Share Contact</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {contactPickerUsers.map(contactUser => (
                <button
                  key={contactUser.id}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                  onClick={() => {
                    const contactData = JSON.stringify({
                      name: contactUser.displayName,
                      phoneNumber: contactUser.phoneNumber
                    });
                    if (activeChat) {
                      socketService.emit('message:send', {
                        chatId: activeChat.id,
                        content: contactData,
                        type: 'contact',
                        tempId: `temp-${Date.now()}`,
                      });
                    }
                    setShowContactPicker(false);
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {contactUser.displayName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{contactUser.displayName}</p>
                    <p className="text-xs text-gray-500">{contactUser.phoneNumber}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowContactPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker Dialog */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Choose a GIF</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowGifPicker(false); setGifSearchQuery(''); setGifResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search GIFs..."
                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884]/20"
                value={gifSearchQuery}
                onChange={(e) => {
                  setGifSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setIsLoadingGifs(true);
                    api.searchGifs(e.target.value).then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false));
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
                          socketService.emit('message:send', {
                            chatId: activeChat.id,
                            content: gifUrl,
                            type: 'image',
                            tempId: `temp-${Date.now()}`,
                          });
                        }
                        setShowGifPicker(false);
                        setGifSearchQuery('');
                        setGifResults([]);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Backup</h3>
            <p className="text-sm text-gray-500 mb-4">Download a backup of this chat conversation.</p>
            <div className="space-y-2">
              <Button
                className="w-full bg-[#00a884] hover:bg-[#008069]"
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
                    } catch { showError('Failed to export chat as text'); }
                  }
                  setShowBackupDialog(false);
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
                    } catch { showError('Failed to export chat as JSON'); }
                  }
                  setShowBackupDialog(false);
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Download as JSON
              </Button>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowBackupDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Auto-Reply Dialog */}
      {showChatbotDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <h3 className="font-semibold mb-3">Chatbot Auto-Reply</h3>
            <p className="text-sm text-gray-500 mb-4">Set up automatic replies based on trigger keywords.</p>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium">Enable chatbot:</label>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${chatbotEnabled ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                onClick={() => setChatbotEnabled(!chatbotEnabled)}
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
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], trigger: e.target.value }; setChatbotRules(rules); }}
                  />
                  <input
                    type="text"
                    placeholder="Auto-reply message"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={rule.response}
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], response: e.target.value }; setChatbotRules(rules); }}
                  />
                  {chatbotRules.length > 1 && (
                    <button className="text-xs text-red-500 mt-1" onClick={() => setChatbotRules(chatbotRules.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-[#00a884] hover:text-[#008069]" onClick={() => setChatbotRules([...chatbotRules, { trigger: '', response: '' }])}>
                + Add rule
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowChatbotDialog(false)}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
                onClick={async () => {
                  if (activeChat) {
                    const validRules = chatbotRules.filter(r => r.trigger.trim() && r.response.trim());
                    try {
                      await api.configureChatbot(activeChat.id, { enabled: chatbotEnabled, rules: validRules });
                    } catch { showError('Failed to save chatbot configuration'); }
                  }
                  setShowChatbotDialog(false);
                }}
              >Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      {showMediaLightbox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]" onClick={() => setShowMediaLightbox(null)}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-10"
            onClick={() => setShowMediaLightbox(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={showMediaLightbox}
            alt="Media"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={showMediaLightbox}
            download
            className="absolute bottom-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-5 w-5" />
          </a>
        </div>
      )}

      {/* Group Info Panel */}
      {showGroupInfo && activeChat?.type === 'group' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Group Info</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowGroupInfo(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-[#00a884] text-white text-xl">{getChatInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-lg">{getChatName()}</h4>
                  <p className="text-sm text-gray-500">{activeChat.participants.length} participants</p>
                </div>
              </div>
            </div>
            {            activeChat.participants.find((p: any) => p.userId === userId && p.role === 'admin') && (
                          <Button
                variant="outline"
                className="w-full mb-3 text-[#00a884] hover:text-[#008069] hover:bg-[#00a884]/5 border-[#00a884]/30"
                onClick={async () => {
                  try {
                    const allUsers = await api.getAllUsers();
                    const existingIds = activeChat.participants.map((p: any) => p.userId);
                    const available = allUsers.filter((u: { id: string }) => !existingIds.includes(u.id));
                    if (available.length === 0) {
                      showError('No more users to add');
                      return;
                    }
                    setAvailableUsersForAdd(available as Array<{ id: string; displayName: string; phoneNumber: string }>);
                    setShowAddMemberDialog(true);
                  } catch { showError('Failed to load users'); }
                }}
              >
                <Users className="h-4 w-4 mr-2" /> Add Member
              </Button>
            )}
            <h5 className="font-medium text-sm text-gray-500 mb-2">Participants</h5>
            <div className="flex-1 overflow-y-auto space-y-1">
                            {activeChat.participants.map((p: any) => (
                              <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                                    {(p.user?.displayName || '?').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.user?.displayName || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">{p.user?.phoneNumber || ''}</p>
                                </div>
                                {p.userId === userId && <span className="text-xs text-[#00a884] font-medium">You</span>}
                                {p.role === 'admin' && p.userId !== userId && <span className="text-xs text-blue-500 font-medium">Admin</span>}
                                {activeChat.participants.find((pp: any) => pp.userId === userId && pp.role === 'admin') && p.userId !== userId && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                      onClick={async () => {
                        if (confirm(`Remove ${p.user?.displayName || 'this member'} from the group?`)) {
                          try {
                            await api.removeParticipant(activeChat.id, p.userId);
                            await refreshChats();
                          } catch { showError('Failed to remove member'); }
                        }
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      await api.leaveGroup(activeChat.id);
                      setShowGroupInfo(false);
                      selectChat(null);
                      await refreshChats();
                    } catch { showError('Failed to leave group'); }
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Leave Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Panel + Profile Photo Upload */}
      {showContactDetails && activeChat?.type === 'direct' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Contact Info</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowContactDetails(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const otherUser = activeChat.participants.find((p: any) => p.userId !== userId)?.user;
              const isSelf = !otherUser;
              const displayUser = otherUser || { displayName: user?.displayName || 'You', phoneNumber: user?.phoneNumber || '' };
              return (
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-[#00a884] text-white text-2xl">
                        {(displayUser.displayName || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isSelf && (
                      <>
                        <button
                          className="absolute bottom-0 right-0 bg-[#00a884] text-white rounded-full p-1.5 shadow-lg hover:bg-[#008069] transition-colors"
                          onClick={() => profilePhotoInputRef.current?.click()}
                          title="Change profile photo"
                        >
                          <Upload className="h-3 w-3" />
                        </button>
                        <input
                          ref={profilePhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const result = await api.uploadMedia(file);
                                await api.updateProfile({ profilePhoto: result.url });
                              } catch {
                                showError('Failed to upload profile photo');
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </>
                    )}
                  </div>
                  <h4 className="font-semibold text-lg">{displayUser.displayName}</h4>
                  <p className="text-sm text-gray-500 mb-4">{displayUser.phoneNumber}</p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-full" onClick={handleVoiceCall}>
                      <Phone className="h-5 w-5 text-[#00a884]" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={handleVideoCall}>
                      <Video className="h-5 w-5 text-[#00a884]" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Global Message Search */}
      {showGlobalSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Search Messages</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search across all chats..."
                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884]/20"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    api.searchMessages(e.target.value).then(r => setGlobalSearchResults(r as typeof globalSearchResults)).catch(() => {});
                  } else {
                    setGlobalSearchResults([]);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {globalSearchResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{globalSearchQuery.length >= 2 ? 'No results found' : 'Type at least 2 characters to search'}</p>
              ) : globalSearchResults.map(result => (
                <div key={result.id} className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => {
                  const targetChat = chats.find(c => c.id === result.chatId);
                  if (targetChat) {
                    selectChat(targetChat);
                  }
                  setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults([]);
                }}>
                  <p className="text-xs font-medium text-[#008069] mb-0.5">{chats.find(c => c.id === result.chatId)?.name || chats.find(c => c.id === result.chatId)?.participants.find((p: any) => p.userId !== userId)?.user?.displayName || 'Chat'}</p>
                  <p className="text-sm truncate">{result.content}</p>
                  <p className="text-xs text-gray-400">{new Date(result.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Channel/Community Info Panel */}
      {showChannelInfo && (activeChat?.type === 'channel' || activeChat?.type === 'community') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{activeChat?.type === 'channel' ? 'Channel Info' : 'Community Info'}</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowChannelInfo(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-[#00a884] text-white text-xl">{getChatInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-lg">{getChatName()}</h4>
                  <p className="text-sm text-gray-500">
                    {activeChat?.type === 'channel'
                      ? `${activeChat.participants.length} subscriber${activeChat.participants.length !== 1 ? 's' : ''}`
                      : `${activeChat.participants.length} member${activeChat.participants.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              {activeChat.description && (
                <p className="text-sm text-gray-600 mb-2">{activeChat.description}</p>
              )}
            </div>
            <h5 className="font-medium text-sm text-gray-500 mb-2">
              {activeChat?.type === 'channel' ? 'Subscribers' : 'Members'}
            </h5>
            <div className="flex-1 overflow-y-auto space-y-1">
                            {activeChat.participants.map((p: any) => (
                              <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                                    {(p.user?.displayName || '?').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.user?.displayName || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">{p.user?.phoneNumber || ''}</p>
                                </div>
                                {p.role === 'admin' && <span className="text-xs text-[#00a884] font-medium">Admin</span>}
                                {p.userId === userId && <span className="text-xs text-gray-400 ml-1">You</span>}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      await api.leaveGroup(activeChat.id);
                      setShowChannelInfo(false);
                      selectChat(null);
                    } catch { showError(`Failed to leave ${activeChat.type}`); }
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Leave {activeChat?.type === 'channel' ? 'Channel' : 'Community'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Dialog */}
      {showOrderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
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
                    onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], name: e.target.value, productId: `prod-${i}` }; setOrderItems(items); }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Price"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      value={item.price || ''}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], price: parseFloat(e.target.value) || 0 }; setOrderItems(items); }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      className="w-20 px-3 py-2 border rounded-lg text-sm"
                      value={item.quantity}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], quantity: parseInt(e.target.value) || 1 }; setOrderItems(items); }}
                    />
                  </div>
                  {orderItems.length > 1 && (
                    <button className="text-xs text-red-500" onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-[#00a884] hover:text-[#008069]" onClick={() => setOrderItems([...orderItems, { productId: '', name: '', price: 0, quantity: 1 }])}>
                + Add item
              </button>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">Total: ${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowOrderDialog(false); setOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]); }}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
                disabled={!orderItems.some(item => item.name.trim() && item.price > 0)}
                onClick={async () => {
                  if (activeChat) {
                    const validItems = orderItems.filter(item => item.name.trim() && item.price > 0).map((item, i) => ({ ...item, productId: `prod-${i}` }));
                    try {
                      await api.createOrder(activeChat.id, validItems);
                    } catch { showError('Failed to create order'); }
                  }
                  setShowOrderDialog(false);
                  setOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]);
                }}
              >Create Order</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMemberDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Add Member</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddMemberDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {availableUsersForAdd.map(u => (
                <button
                  key={u.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left transition-colors"
                  onClick={async () => {
                    if (activeChat) {
                      try {
                        await api.addParticipant(activeChat.id, u.id);
                        await refreshChats();
                        setShowAddMemberDialog(false);
                        setAvailableUsersForAdd([]);
                      } catch { showError('Failed to add member'); }
                    }
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#00a884] text-white text-xs">
                      {u.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.displayName}</p>
                    <p className="text-xs text-gray-500">{u.phoneNumber}</p>
                  </div>
                </button>
              ))}
              {availableUsersForAdd.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-4">No users available to add</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
