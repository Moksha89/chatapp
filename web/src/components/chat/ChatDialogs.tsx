import { useRef, useState } from 'react';
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share2,
  Navigation,
  Clock,
  CheckCircle2,
  Shield,
  Crown,
  AlertTriangle,
  ChevronDown,
  Hash,
  Globe,
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
  const gifDebounceRef = useRef<NodeJS.Timeout | null>(null);
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

      {/* Forward Dialog - Multi-select with batch forward */}
      {showForwardDialog && (() => {
        const ForwardDialogInner = () => {
          const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
          const [forwardSearch, setForwardSearch] = useState('');
          const [isSending, setIsSending] = useState(false);
          const availableChats = chats.filter(c => c.id !== activeChat?.id);
          const filteredForwardChats = forwardSearch
            ? availableChats.filter(c => {
                const name = c.name || c.participants.find((p: any) => p.userId !== userId)?.user?.displayName || '';
                return name.toLowerCase().includes(forwardSearch.toLowerCase());
              })
            : availableChats;
          const toggleChat = (chatId: string) => {
            setSelectedChats(prev => {
              const next = new Set(prev);
              if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
              return next;
            });
          };
          const handleForwardAll = async () => {
            if (!showForwardDialog || selectedChats.size === 0) return;
            setIsSending(true);
            try {
              for (const chatId of selectedChats) {
                await forwardMessage(showForwardDialog, chatId);
              }
            } catch { /* ignore */ }
            setIsSending(false);
            setShowForwardDialog(null);
          };
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
              <div className="bg-white rounded-2xl p-4 w-full max-w-md max-h-[70vh] flex flex-col dialog-content shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Forward to...</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForwardDialog(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                    value={forwardSearch}
                    onChange={(e) => setForwardSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {/* Selected chips */}
                {selectedChats.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3 px-1">
                    {Array.from(selectedChats).map(id => {
                      const chat = chats.find(c => c.id === id);
                      const name = chat?.name || chat?.participants.find((p: any) => p.userId !== userId)?.user?.displayName || 'Chat';
                      return (
                        <span key={id} className="bg-[#246BFD]/10 text-[#246BFD] text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                          {name.slice(0, 15)}{name.length > 15 ? '...' : ''}
                          <button onClick={() => toggleChat(id)} className="hover:bg-[#246BFD]/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Chat list */}
                <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                  {filteredForwardChats.map(chat => {
                    const chatName = chat.name || chat.participants.find((p: any) => p.userId !== userId)?.user?.displayName || 'Unknown';
                    const isSelected = selectedChats.has(chat.id);
                    return (
                      <button
                        key={chat.id}
                        className={`w-full px-3 py-2.5 text-left rounded-xl flex items-center gap-3 transition-colors ${isSelected ? 'bg-[#246BFD]/5 border border-[#246BFD]/20' : 'hover:bg-gray-50 border border-transparent'}`}
                        onClick={() => toggleChat(chat.id)}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-[#246BFD] bg-[#246BFD]' : 'border-gray-300'}`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-[#246BFD] text-white text-xs font-medium">
                            {chatName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{chatName}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{selectedChats.size} selected</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowForwardDialog(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      className="bg-[#246BFD] hover:bg-[#1A56DB]"
                      disabled={selectedChats.size === 0 || isSending}
                      onClick={handleForwardAll}
                    >
                      {isSending ? 'Sending...' : `Forward${selectedChats.size > 0 ? ` (${selectedChats.size})` : ''}`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        };
        return <ForwardDialogInner />;
      })()}

      {/* Disappearing Messages Dialog */}
      {showDisappearingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Disappearing Messages</h3>
            {activeChat?.disappearingMessagesDuration && <p className="text-sm text-[#246BFD] mb-2 flex items-center gap-1"><Timer className="h-3 w-3" /> Currently enabled ({activeChat.disappearingMessagesDuration === 86400 ? '24 hours' : activeChat.disappearingMessagesDuration === 604800 ? '7 days' : '90 days'})</p>}
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
            <p className="text-xs text-gray-500 mb-2">Solid Colors</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['default', '#d9fdd3', '#fde4cf', '#cff4fc', '#f0d9ff', '#ffe4e1', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e0f7fa'].map(color => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-[#246BFD]"
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
            <p className="text-xs text-gray-500 mb-2">Custom Image</p>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 mb-4">
              <Upload className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Upload wallpaper image</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !activeChat) return;
                try {
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const dataUrl = reader.result as string;
                    try { await api.setChatWallpaper(activeChat.id, dataUrl); await refreshChats(); } catch { showError('Failed to set wallpaper'); }
                    setShowWallpaperDialog(false);
                  };
                  reader.readAsDataURL(file);
                } catch { showError('Failed to read image'); }
              }} />
            </label>
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mb-3">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">No starred messages</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Tap and hold any message, then tap the star icon to save it here for quick access.</p>
                </div>
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
              <button className="text-sm text-[#246BFD] hover:text-[#1A56DB] mb-3" onClick={() => setPollOptions([...pollOptions, ''])}>
                + Add option
              </button>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowPollCreator(false); setPollQuestion(''); setPollOptions(['', '']); }}>Cancel</Button>
              <Button
                className="bg-[#246BFD] hover:bg-[#1A56DB]"
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

      {/* Location Picker Dialog — enhanced with live location */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Share Location</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLocationPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Map preview placeholder */}
            <div className="w-full h-40 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Cpath d=%27M0 0h40v40H0z%27 fill=%27none%27 stroke=%27%23999%27 stroke-width=%270.5%27/%3E%3C/svg%3E")' }} />
              <div className="text-center z-10">
                <MapPin className="h-8 w-8 text-[#246BFD] mx-auto mb-1" />
                <span className="text-xs text-gray-600">Your location</span>
              </div>
            </div>
            {/* Send current location */}
            <Button
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] mb-2 rounded-xl h-11"
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
                      showError('Location permission denied');
                    }
                  );
                }
              }}
            >
              <Navigation className="h-4 w-4 mr-2" /> Send Current Location
            </Button>
            {/* Live location sharing */}
            <div className="border rounded-xl p-3 mb-2">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Share Live Location
              </p>
              <div className="flex gap-2">
                {[{label: '15 min', mins: 15}, {label: '1 hour', mins: 60}, {label: '8 hours', mins: 480}].map(opt => (
                  <button
                    key={opt.mins}
                    className="flex-1 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:border-[#246BFD] hover:text-[#246BFD] hover:bg-[#246BFD]/5 transition-colors"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const locData = JSON.stringify({
                              latitude: pos.coords.latitude,
                              longitude: pos.coords.longitude,
                              name: 'Live Location',
                              isLive: true,
                              duration: opt.mins * 60,
                              expiresAt: new Date(Date.now() + opt.mins * 60 * 1000).toISOString()
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
                          () => { showError('Location permission denied'); }
                        );
                      }
                    }}
                  >
                    <Clock className="h-3 w-3 mx-auto mb-1" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Dialog — enhanced with multi-select and search */}
      {showContactPicker && (() => {
        const ContactPickerInner = () => {
          const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
          const [contactSearch, setContactSearch] = useState('');
          const filteredContacts = contactPickerUsers.filter(u =>
            u.displayName.toLowerCase().includes(contactSearch.toLowerCase()) ||
            u.phoneNumber.includes(contactSearch)
          );
          const toggleContact = (id: string) => {
            setSelectedContacts(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            });
          };
          const sendContacts = () => {
            const selected = contactPickerUsers.filter(u => selectedContacts.has(u.id));
            selected.forEach(contactUser => {
              const contactData = JSON.stringify({
                name: contactUser.displayName,
                phoneNumber: contactUser.phoneNumber
              });
              if (activeChat) {
                socketService.emit('message:send', {
                  chatId: activeChat.id,
                  content: contactData,
                  type: 'contact',
                  tempId: `temp-${Date.now()}-${contactUser.id}`,
                });
              }
            });
            setShowContactPicker(false);
          };
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
              <div className="bg-white rounded-2xl p-4 w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Share Contacts</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowContactPicker(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Search */}
                <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {/* Selected chips */}
                {selectedContacts.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {contactPickerUsers.filter(u => selectedContacts.has(u.id)).map(u => (
                      <span key={u.id} className="flex items-center gap-1 bg-[#246BFD]/10 text-[#246BFD] text-xs px-2 py-1 rounded-full">
                        {u.displayName}
                        <button onClick={() => toggleContact(u.id)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Contact list */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {filteredContacts.map(contactUser => (
                    <button
                      key={contactUser.id}
                      className={`w-full px-3 py-2.5 text-left rounded-xl flex items-center gap-3 transition-colors ${
                        selectedContacts.has(contactUser.id) ? 'bg-[#246BFD]/5 border border-[#246BFD]/20' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleContact(contactUser.id)}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#246BFD] text-white text-xs">
                          {contactUser.displayName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{contactUser.displayName}</p>
                        <p className="text-xs text-gray-500">{contactUser.phoneNumber}</p>
                      </div>
                      {selectedContacts.has(contactUser.id) && (
                        <CheckCircle2 className="h-5 w-5 text-[#246BFD]" />
                      )}
                    </button>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-6">No contacts found</p>
                  )}
                </div>
                {/* Send button */}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowContactPicker(false)}>Cancel</Button>
                  <Button
                    className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]"
                    disabled={selectedContacts.size === 0}
                    onClick={sendContacts}
                  >
                    Send {selectedContacts.size > 0 && `(${selectedContacts.size})`}
                  </Button>
                </div>
              </div>
            </div>
          );
        };
        return <ContactPickerInner />;
      })()}

      {/* GIF Picker Dialog — enhanced with trending/categories */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-2xl p-4 w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">GIFs</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowGifPicker(false); setGifSearchQuery(''); setGifResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Search bar */}
            <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Tenor..."
                className="flex-1 bg-transparent text-sm outline-none"
                value={gifSearchQuery}
                onChange={(e) => {
                  setGifSearchQuery(e.target.value);
                  if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current);
                  const query = e.target.value;
                  if (query.trim()) {
                    setIsLoadingGifs(true);
                    gifDebounceRef.current = setTimeout(() => {
                      api.searchGifs(query).then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false));
                    }, 400);
                  } else {
                    setIsLoadingGifs(true);
                    api.getTrendingGifs().then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false));
                  }
                }}
                autoFocus
              />
            </div>
            {/* Category chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {['Trending', 'Reactions', 'Love', 'Happy', 'Sad', 'Angry', 'Dance', 'Celebrate', 'Thumbs Up', 'Facepalm'].map(cat => (
                <button
                  key={cat}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-[#246BFD]/10 hover:text-[#246BFD] rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                  onClick={() => {
                    setGifSearchQuery(cat === 'Trending' ? '' : cat);
                    setIsLoadingGifs(true);
                    const searchFn = cat === 'Trending' ? api.getTrendingGifs() : api.searchGifs(cat);
                    searchFn.then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false));
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* GIF grid */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#246BFD] rounded-full animate-spin" />
                    Loading GIFs...
                  </div>
                </div>
              ) : gifResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No GIFs found</p>
                  <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifResults.map(gif => (
                    <button
                      key={gif.id}
                      className="aspect-square overflow-hidden rounded-xl hover:opacity-80 transition-opacity relative group"
                      onClick={() => {
                        const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '';
                        if (activeChat && gifUrl) {
                          socketService.emit('message:send', {
                            chatId: activeChat.id,
                            content: gifUrl,
                            type: 'gif',
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
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Powered by Tenor</p>
          </div>
        </div>
      )}

      {/* Chat Backup/Export Dialog - Enhanced */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <FileDown className="h-5 w-5 text-[#246BFD]" />
              <h3 className="font-bold text-gray-900">Export Chat</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Download your conversation in multiple formats</p>

            {/* Date range filter */}
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-medium text-gray-500 mb-2">Date Range (optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-gray-400">From</label>
                  <input type="date" className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400">To</label>
                  <input type="date" className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
                </div>
              </div>
            </div>

            {/* Include media toggle */}
            <label className="flex items-center gap-2 mb-4 p-2.5 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#246BFD]" />
              <div>
                <p className="text-xs font-medium text-gray-700">Include media files</p>
                <p className="text-[10px] text-gray-400">Photos, videos, and documents</p>
              </div>
            </label>

            <div className="space-y-2">
              <Button
                className="w-full bg-[#246BFD] hover:bg-[#1A56DB] rounded-xl"
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
                <FileDown className="h-4 w-4 mr-2" /> Export as Text (.txt)
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl"
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
                <Download className="h-4 w-4 mr-2" /> Export as JSON
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      const data = await api.backupChat(activeChat.id, 'text');
                      // Generate simple HTML/PDF-like export
                      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chat Export</title><style>body{font-family:system-ui;max-width:600px;margin:0 auto;padding:20px}h1{color:#246BFD}p{margin:4px 0;padding:8px 12px;background:#f3f4f6;border-radius:8px;font-size:14px}</style></head><body><h1>Chat Export</h1><pre>${data.content}</pre></body></html>`;
                      const blob = new Blob([htmlContent], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename.replace('.txt', '.html');
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch { showError('Failed to export chat as HTML'); }
                  }
                  setShowBackupDialog(false);
                }}
              >
                <FileDown className="h-4 w-4 mr-2" /> Export as HTML (printable)
              </Button>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowBackupDialog(false)} className="rounded-xl">Cancel</Button>
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
                className={`w-10 h-6 rounded-full transition-colors ${chatbotEnabled ? 'bg-[#246BFD]' : 'bg-gray-300'}`}
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
              <button className="text-sm text-[#246BFD] hover:text-[#1A56DB]" onClick={() => setChatbotRules([...chatbotRules, { trigger: '', response: '' }])}>
                + Add rule
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowChatbotDialog(false)}>Cancel</Button>
              <Button
                className="bg-[#246BFD] hover:bg-[#1A56DB]"
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

      {/* Media Lightbox — enhanced with zoom, rotate, share */}
      {showMediaLightbox && (() => {
        const LightboxInner = () => {
          const [zoom, setZoom] = useState(1);
          const [rotation, setRotation] = useState(0);
          return (
            <div className="fixed inset-0 bg-black/95 flex flex-col z-[60]" onClick={() => setShowMediaLightbox(null)}>
              {/* Top toolbar */}
              <div className="flex items-center justify-between p-4 z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" title="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-white text-xs font-mono min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" title="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button onClick={() => setRotation(r => r + 90)} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" title="Rotate">
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={showMediaLightbox}
                    download
                    className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                    onClick={e => e.stopPropagation()}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator.share({ url: showMediaLightbox || '' }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(showMediaLightbox || '').then(() => {}).catch(() => {});
                      }
                    }}
                    className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowMediaLightbox(null)} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors" title="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Image with zoom and rotation */}
              <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
                <img
                  src={showMediaLightbox}
                  alt="Media"
                  className="max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-200 cursor-grab"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  onDoubleClick={() => setZoom(z => z === 1 ? 2 : 1)}
                  draggable={false}
                />
              </div>
              {/* Bottom hint */}
              <div className="text-center pb-4" onClick={e => e.stopPropagation()}>
                <p className="text-white/40 text-xs">Double-click to zoom · Scroll to adjust</p>
              </div>
            </div>
          );
        };
        return <LightboxInner />;
      })()}

      {/* Enhanced Group Info Panel */}
      {showGroupInfo && activeChat?.type === 'group' && (() => {
        const GroupInfoPanel = () => {
          const [infoTab, setInfoTab] = useState<'members' | 'settings' | 'invite'>('members');
          const [memberSearchQuery, setMemberSearchQuery] = useState('');
          const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
          const [isEditingName, setIsEditingName] = useState(false);
          const [isEditingDesc, setIsEditingDesc] = useState(false);
          const [editName, setEditName] = useState(getChatName());
          const [editDesc, setEditDesc] = useState(activeChat.description || '');
          const [inviteLink, setInviteLink] = useState('');
          const [showPermissions, setShowPermissions] = useState(false);
          const [permissions, setPermissions] = useState({
            sendMessages: true,
            sendMedia: true,
            addMembers: true,
            pinMessages: false,
            editGroupInfo: false,
          });
          const isAdmin = activeChat.participants.find((p: any) => p.userId === userId && p.role === 'admin');

          const filteredParticipants = activeChat.participants.filter((p: any) => {
            const name = (p.user?.displayName || '').toLowerCase();
            const phone = (p.user?.phoneNumber || '').toLowerCase();
            const matchesSearch = !memberSearchQuery || name.includes(memberSearchQuery.toLowerCase()) || phone.includes(memberSearchQuery.toLowerCase());
            const matchesRole = memberRoleFilter === 'all' || (memberRoleFilter === 'admin' ? p.role === 'admin' : p.role !== 'admin');
            return matchesSearch && matchesRole;
          });

          const generateInviteLink = () => {
            const link = `https://abhi.so/join/${activeChat.id.slice(0, 8)}`;
            setInviteLink(link);
          };

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Group Info</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowGroupInfo(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Group Header */}
                <div className="px-4 py-4 border-b">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-[#246BFD] text-white text-xl font-semibold">{getChatInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {isEditingName && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="text-lg font-semibold border-b-2 border-[#246BFD] outline-none bg-transparent w-full"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={async () => {
                              if (editName.trim() && editName !== getChatName()) {
                                try { await api.updateGroupInfo(activeChat.id, { name: editName }); await refreshChats(); } catch { showError('Failed to update name'); }
                              }
                              setIsEditingName(false);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h4
                          className={`font-semibold text-lg truncate ${isAdmin ? 'cursor-pointer hover:text-[#246BFD]' : ''}`}
                          onClick={() => isAdmin && setIsEditingName(true)}
                          title={isAdmin ? 'Click to edit' : undefined}
                        >
                          {getChatName()}
                        </h4>
                      )}
                      <p className="text-sm text-gray-500">
                        {activeChat.participants.length} participant{activeChat.participants.length !== 1 ? 's' : ''}
                        {activeChat.participants.length >= 1024 && <span className="text-orange-500 ml-1">(limit reached)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-2">
                    {isEditingDesc && isAdmin ? (
                      <div>
                        <textarea
                          className="w-full px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 resize-none"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value.slice(0, 2048))}
                          rows={3}
                          onBlur={async () => {
                            try { await api.updateGroupInfo(activeChat.id, { description: editDesc }); await refreshChats(); } catch { showError('Failed to update description'); }
                            setIsEditingDesc(false);
                          }}
                          autoFocus
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">{editDesc.length}/2048</span>
                          <button className="text-[10px] text-[#246BFD]" onClick={() => setIsEditingDesc(false)}>Done</button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-sm text-gray-600 ${isAdmin ? 'cursor-pointer hover:text-gray-800' : ''} ${!activeChat.description ? 'italic text-gray-400' : ''}`}
                        onClick={() => isAdmin && setIsEditingDesc(true)}
                      >
                        {activeChat.description || (isAdmin ? 'Add group description...' : 'No description')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                  {(['members', 'settings', 'invite'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`flex-1 py-2.5 text-xs font-medium transition-colors ${infoTab === tab ? 'text-[#246BFD] border-b-2 border-[#246BFD]' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setInfoTab(tab)}
                    >
                      {tab === 'members' ? `Members (${activeChat.participants.length})` : tab === 'settings' ? 'Settings' : 'Invite Link'}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {infoTab === 'members' && (
                    <div className="p-3">
                      {/* Member search */}
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                        />
                      </div>
                      {/* Role filter */}
                      <div className="flex gap-1 mb-2">
                        {(['all', 'admin', 'member'] as const).map(role => (
                          <button
                            key={role}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${memberRoleFilter === role ? 'bg-[#246BFD] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            onClick={() => setMemberRoleFilter(role)}
                          >
                            {role === 'all' ? 'All' : role === 'admin' ? 'Admins' : 'Members'}
                          </button>
                        ))}
                      </div>
                      {/* Add member button */}
                      {isAdmin && (
                        <button
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg text-[#246BFD] mb-1"
                          onClick={async () => {
                            try {
                              const allUsers = await api.getAllUsers();
                              const existingIds = activeChat.participants.map((p: any) => p.userId);
                              const available = allUsers.filter((u: { id: string }) => !existingIds.includes(u.id));
                              if (available.length === 0) { showError('No more users to add'); return; }
                              setAvailableUsersForAdd(available as Array<{ id: string; displayName: string; phoneNumber: string }>);
                              setShowAddMemberDialog(true);
                            } catch { showError('Failed to load users'); }
                          }}
                        >
                          <div className="h-10 w-10 rounded-full bg-[#246BFD]/10 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">Add participant</span>
                        </button>
                      )}
                      {/* Participant list */}
                      <div className="space-y-0.5">
                        {filteredParticipants.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg group">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white text-xs">
                                {(p.user?.displayName || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{p.user?.displayName || 'Unknown'}</p>
                                {p.userId === userId && <span className="text-[10px] text-[#246BFD] bg-[#246BFD]/10 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                                {p.role === 'admin' && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Admin</span>}
                              </div>
                              <p className="text-xs text-gray-400">{p.user?.phoneNumber || ''}</p>
                            </div>
                            {isAdmin && p.userId !== userId && (
                              <div className="hidden group-hover:flex items-center gap-1">
                                {p.role !== 'admin' && (
                                  <button
                                    className="text-[10px] text-[#246BFD] hover:bg-[#246BFD]/10 px-2 py-1 rounded"
                                    onClick={async () => {
                                      try { await api.makeAdmin(activeChat.id, p.userId); await refreshChats(); }
                                      catch { showError('Failed to make admin'); }
                                    }}
                                  >
                                    Make admin
                                  </button>
                                )}
                                <button
                                  className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                                  onClick={async () => {
                                    if (confirm(`Remove ${p.user?.displayName || 'this member'}?`)) {
                                      try { await api.removeParticipant(activeChat.id, p.userId); await refreshChats(); }
                                      catch { showError('Failed to remove member'); }
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {infoTab === 'settings' && (
                    <div className="p-3 space-y-3">
                      {/* Group Permissions */}
                      <div>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors"
                          onClick={() => setShowPermissions(!showPermissions)}
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[#246BFD]" />
                            <span className="text-sm font-medium">Group Permissions</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPermissions ? 'rotate-180' : ''}`} />
                        </button>
                        {showPermissions && (
                          <div className="ml-8 space-y-2 mt-2">
                            {[
                              { key: 'sendMessages', label: 'Send messages', desc: 'Allow members to send messages' },
                              { key: 'sendMedia', label: 'Send media', desc: 'Allow members to send photos, videos, files' },
                              { key: 'addMembers', label: 'Add members', desc: 'Allow members to add new participants' },
                              { key: 'pinMessages', label: 'Pin messages', desc: 'Allow members to pin messages' },
                              { key: 'editGroupInfo', label: 'Edit group info', desc: 'Allow members to change name, icon, description' },
                            ].map(perm => (
                              <label key={perm.key} className="flex items-center justify-between py-1.5 cursor-pointer">
                                <div>
                                  <p className="text-xs font-medium">{perm.label}</p>
                                  <p className="text-[10px] text-gray-400">{perm.desc}</p>
                                </div>
                                <button
                                  className={`w-9 h-5 rounded-full transition-colors relative ${permissions[perm.key as keyof typeof permissions] ? 'bg-[#246BFD]' : 'bg-gray-300'}`}
                                  onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key as keyof typeof prev] }))}
                                  disabled={!isAdmin}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${permissions[perm.key as keyof typeof permissions] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Admin Transfer */}
                      {isAdmin && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 px-3 mb-1">Admin Actions</h5>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm"
                            onClick={() => {
                              const nonAdminMembers = activeChat.participants.filter((p: any) => p.userId !== userId && p.role !== 'admin');
                              if (nonAdminMembers.length === 0) { showError('No members to transfer admin to'); return; }
                              const target = nonAdminMembers[0];
                              if (confirm(`Transfer admin to ${target.user?.displayName || 'this member'}? You will remain a member.`)) {
                                api.makeAdmin(activeChat.id, target.userId).then(() => refreshChats()).catch(() => showError('Failed to transfer admin'));
                              }
                            }}
                          >
                            <Crown className="h-4 w-4 text-amber-500" />
                            <span>Transfer admin rights</span>
                          </button>
                        </div>
                      )}

                      {/* Anti-spam */}
                      <div className="px-3 py-2.5 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Anti-spam protection</span>
                          </div>
                          <button className="w-9 h-5 rounded-full bg-[#246BFD] relative">
                            <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow translate-x-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 ml-6">Automatically filter spam messages and restrict new members from sending links</p>
                      </div>

                      {/* Disappearing Messages shortcut */}
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm"
                        onClick={() => { setShowGroupInfo(false); setShowDisappearingDialog(true); }}
                      >
                        <Timer className="h-4 w-4 text-gray-500" />
                        <span>Disappearing messages</span>
                        <span className="ml-auto text-xs text-gray-400">{activeChat.disappearingMessagesDuration ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  )}

                  {infoTab === 'invite' && (
                    <div className="p-4 space-y-4">
                      <div className="text-center">
                        <div className="w-48 h-48 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                          {inviteLink ? (
                            <div className="text-center p-4">
                              <div className="grid grid-cols-8 gap-0.5 mb-2">
                                {Array.from({ length: 64 }, (_, i) => (
                                  <div key={i} className={`w-4 h-4 rounded-sm ${Math.random() > 0.5 ? 'bg-gray-800' : 'bg-white'}`} />
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-400">QR Code</p>
                            </div>
                          ) : (
                            <button
                              className="text-[#246BFD] text-sm font-medium hover:underline"
                              onClick={generateInviteLink}
                            >
                              Generate invite link
                            </button>
                          )}
                        </div>
                        {inviteLink && (
                          <>
                            <div className="bg-gray-100 rounded-xl p-3 mb-3">
                              <p className="text-sm font-mono text-gray-700 break-all">{inviteLink}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1 text-sm"
                                onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                              >
                                Copy link
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 text-sm"
                                onClick={() => { if (navigator.share) navigator.share({ title: getChatName(), url: inviteLink }); }}
                              >
                                Share
                              </Button>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
                              <button className="hover:text-red-500 transition-colors" onClick={() => { setInviteLink(''); generateInviteLink(); }}>
                                Revoke & regenerate
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 border-t space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
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
          );
        };
        return <GroupInfoPanel />;
      })()}

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
                      <AvatarFallback className="bg-[#246BFD] text-white text-2xl">
                        {(displayUser.displayName || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isSelf && (
                      <>
                        <button
                          className="absolute bottom-0 right-0 bg-[#246BFD] text-white rounded-full p-1.5 shadow-lg hover:bg-[#1A56DB] transition-colors"
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
                      <Phone className="h-5 w-5 text-[#246BFD]" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={handleVideoCall}>
                      <Video className="h-5 w-5 text-[#246BFD]" />
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
                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#246BFD]/20"
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
                  <p className="text-xs font-medium text-[#1A56DB] mb-0.5">{chats.find(c => c.id === result.chatId)?.name || chats.find(c => c.id === result.chatId)?.participants.find((p: any) => p.userId !== userId)?.user?.displayName || 'Chat'}</p>
                  <p className="text-sm truncate">{result.content}</p>
                  <p className="text-xs text-gray-400">{new Date(result.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Channel/Community Info Panel */}
      {showChannelInfo && (activeChat?.type === 'channel' || activeChat?.type === 'community') && (() => {
        const ChannelInfoPanel = () => {
          const [channelTab, setChannelTab] = useState<'info' | 'members'>('info');
          const [channelMemberSearch, setChannelMemberSearch] = useState('');
          const isChannelAdmin = activeChat.participants.find((p: any) => p.userId === userId && p.role === 'admin');
          const isChannel = activeChat?.type === 'channel';

          const filteredChannelMembers = activeChat.participants.filter((p: any) => {
            if (!channelMemberSearch) return true;
            const name = (p.user?.displayName || '').toLowerCase();
            return name.includes(channelMemberSearch.toLowerCase());
          });

          const adminCount = activeChat.participants.filter((p: any) => p.role === 'admin').length;
          const memberCount = activeChat.participants.length - adminCount;

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{isChannel ? 'Channel Info' : 'Community Info'}</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowChannelInfo(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Channel Header */}
                <div className="px-4 py-4 border-b">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className={`text-white text-xl font-semibold ${isChannel ? 'bg-gradient-to-br from-[#246BFD] to-[#6C5CE7]' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                        {getChatInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg truncate">{getChatName()}</h4>
                      <p className="text-sm text-gray-500">
                        {isChannel
                          ? `${activeChat.participants.length} subscriber${activeChat.participants.length !== 1 ? 's' : ''}`
                          : `${activeChat.participants.length} member${activeChat.participants.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  {activeChat.description && (
                    <p className="text-sm text-gray-600">{activeChat.description}</p>
                  )}

                  {/* Stats bar */}
                  <div className="flex gap-4 mt-3">
                    <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-bold text-[#246BFD]">{adminCount}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Admin{adminCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">{memberCount}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{isChannel ? 'Subscriber' : 'Member'}{memberCount !== 1 ? 's' : ''}</p>
                    </div>
                    {!isChannel && (
                      <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-green-500">1</p>
                        <p className="text-[10px] text-gray-400 font-medium">Linked Group</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                  {(['info', 'members'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`flex-1 py-2.5 text-xs font-medium transition-colors ${channelTab === tab ? 'text-[#246BFD] border-b-2 border-[#246BFD]' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setChannelTab(tab)}
                    >
                      {tab === 'info' ? (isChannel ? 'Channel Settings' : 'Community Settings') : `${isChannel ? 'Subscribers' : 'Members'} (${activeChat.participants.length})`}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {channelTab === 'info' && (
                    <div className="p-3 space-y-2">
                      {isChannel && (
                        <div className="px-3 py-2.5 bg-blue-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="h-4 w-4 text-[#246BFD]" />
                            <span className="text-sm font-medium text-gray-700">Broadcast channel</span>
                          </div>
                          <p className="text-[10px] text-gray-500 ml-6">Only admins can post messages. Subscribers receive all broadcasts.</p>
                        </div>
                      )}
                      {!isChannel && (
                        <>
                          <div className="px-3 py-2.5 bg-green-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Globe className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-700">Community</span>
                            </div>
                            <p className="text-[10px] text-gray-500 ml-6">Community with linked groups and announcement channel</p>
                          </div>
                          <div className="px-3 py-2">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Linked Groups</h5>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                              <div className="h-10 w-10 rounded-full bg-[#246BFD]/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-[#246BFD]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">General Discussion</p>
                                <p className="text-[10px] text-gray-400">{activeChat.participants.length} members</p>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-2">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Announcement Channel</h5>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                                <Hash className="h-4 w-4 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Announcements</p>
                                <p className="text-[10px] text-gray-400">Admin-only channel</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {isChannelAdmin && (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm"
                          onClick={async () => {
                            try {
                              const allUsers = await api.getAllUsers();
                              const existingIds = activeChat.participants.map((p: any) => p.userId);
                              const available = allUsers.filter((u: { id: string }) => !existingIds.includes(u.id));
                              setAvailableUsersForAdd(available as Array<{ id: string; displayName: string; phoneNumber: string }>);
                              setShowAddMemberDialog(true);
                            } catch { showError('Failed to load users'); }
                          }}
                        >
                          <Users className="h-4 w-4 text-[#246BFD]" />
                          <span className="text-[#246BFD]">Add {isChannel ? 'subscribers' : 'members'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {channelTab === 'members' && (
                    <div className="p-3">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search ${isChannel ? 'subscribers' : 'members'}...`}
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                          value={channelMemberSearch}
                          onChange={(e) => setChannelMemberSearch(e.target.value)}
                        />
                      </div>
                      <div className="space-y-0.5">
                        {filteredChannelMembers.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white text-xs">
                                {(p.user?.displayName || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{p.user?.displayName || 'Unknown'}</p>
                                {p.userId === userId && <span className="text-[10px] text-[#246BFD] bg-[#246BFD]/10 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                                {p.role === 'admin' && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Admin</span>}
                              </div>
                              <p className="text-xs text-gray-400">{p.user?.phoneNumber || ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    onClick={async () => {
                      if (activeChat) {
                        try {
                          await api.leaveGroup(activeChat.id);
                          setShowChannelInfo(false);
                          selectChat(null);
                          await refreshChats();
                        } catch { showError(`Failed to leave ${activeChat.type}`); }
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Leave {isChannel ? 'Channel' : 'Community'}
                  </Button>
                </div>
              </div>
            </div>
          );
        };
        return <ChannelInfoPanel />;
      })()}

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
              <button className="text-sm text-[#246BFD] hover:text-[#1A56DB]" onClick={() => setOrderItems([...orderItems, { productId: '', name: '', price: 0, quantity: 1 }])}>
                + Add item
              </button>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">Total: ${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowOrderDialog(false); setOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]); }}>Cancel</Button>
              <Button
                className="bg-[#246BFD] hover:bg-[#1A56DB]"
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
                    <AvatarFallback className="bg-[#246BFD] text-white text-xs">
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
