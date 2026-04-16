import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Search, UserPlus, Users, Phone, Share2, Copy, CheckCircle2,
  MessageSquare, Clock, Filter, X, QrCode, Link2
} from 'lucide-react';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { createChat, selectChat, chats } = useChat();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [tab, setTab] = useState<'contacts' | 'invite'>('contacts');
  const [recentContacts, setRecentContacts] = useState<User[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);

  useEffect(() => {
    if (open) {
      loadAllUsers();
      // Generate invite link
      setInviteLink(`https://abhi.so/invite/${currentUser?.id?.slice(0, 8) || 'app'}`);
      // Load recent contacts from localStorage
      try {
        const recent = JSON.parse(localStorage.getItem('recentContacts') || '[]');
        setRecentContacts(recent);
      } catch { /* ignore */ }
    }
  }, [open, currentUser?.id]);

  const loadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const results = await api.getAllUsers();
      const filteredUsers = results.filter((u: User) => u.id !== currentUser?.id);
      setAllUsers(filteredUsers);
      if (!searchQuery) {
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchUsers(searchQuery);
      const filteredResults = results.filter((u: User) => u.id !== currentUser?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Fuzzy search - filter locally as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = allUsers.filter(u =>
      u.displayName.toLowerCase().includes(q) ||
      u.phoneNumber.includes(q)
    );
    setSearchResults(filtered);
  }, [searchQuery, allUsers]);

  const handleStartChat = async (userId: string) => {
    setIsCreating(true);
    try {
      const existingChat = chats.find(
        (chat) =>
          chat.type === 'direct' &&
          chat.participants.some((p) => p.userId === userId)
      );

      if (existingChat) {
        selectChat(existingChat);
      } else {
        const newChat = await createChat(userId);
        selectChat(newChat);
      }
      // Save to recent contacts
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        const recent = JSON.parse(localStorage.getItem('recentContacts') || '[]');
        const updated = [user, ...recent.filter((r: User) => r.id !== userId)].slice(0, 5);
        localStorage.setItem('recentContacts', JSON.stringify(updated));
      }
      onOpenChange(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Abhi Chat!',
          text: 'Download Abhi Chat and connect with me securely.',
          url: inviteLink,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopyInvite();
    }
  };

  const displayResults = filterOnline ? searchResults : searchResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
        <div className="p-5 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-[#246BFD]" />
              </div>
              New Conversation
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Find contacts or invite friends to join
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {[
            { key: 'contacts' as const, label: 'Contacts', icon: <Users className="h-3.5 w-3.5" /> },
            { key: 'invite' as const, label: 'Invite Friends', icon: <Share2 className="h-3.5 w-3.5" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition ${
                tab === t.key
                  ? 'border-[#246BFD] text-[#246BFD]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          <div className="px-5 pb-5">
            {/* Search with filters */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone number..."
                  className="pl-10 bg-[#F7F8FC] border-0 rounded-xl text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setFilterOnline(!filterOnline)}
                className={`p-2.5 rounded-xl border transition ${filterOnline ? 'bg-[#246BFD]/10 border-[#246BFD]/30 text-[#246BFD]' : 'border-gray-200 text-gray-400'}`}
                title="Filter"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>

            {/* Recent contacts */}
            {!searchQuery && recentContacts.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Recent
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recentContacts.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleStartChat(u.id)}
                      className="flex flex-col items-center gap-1 min-w-[56px] group"
                    >
                      <Avatar className="h-11 w-11 group-hover:ring-2 ring-[#246BFD]/30 transition">
                        <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white text-sm font-medium">
                          {u.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-gray-500 truncate max-w-[56px]">{u.displayName.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results count */}
            {!isLoadingUsers && searchResults.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-3 mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            )}

            <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
              {isLoadingUsers && (
                <div className="py-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-[#246BFD] border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Loading contacts...</p>
                </div>
              )}
              {!isLoadingUsers && displayResults.length === 0 && (
                <div className="py-8 text-center">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {searchQuery ? 'No contacts found' : 'No contacts available'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchQuery ? 'Try a different search or invite them' : 'Invite friends to get started!'}
                  </p>
                  {searchQuery && (
                    <button onClick={() => setTab('invite')} className="mt-2 text-xs text-[#246BFD] font-medium hover:underline">
                      Invite to Abhi Chat
                    </button>
                  )}
                </div>
              )}

              {displayResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F8FC] transition group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white text-sm font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{user.displayName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phoneNumber}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartChat(user.id)}
                    disabled={isCreating}
                    className="bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl text-xs px-3 shadow-sm shadow-blue-500/20"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Invite Friends tab */
          <div className="px-5 pb-5 pt-3">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-8 w-8 text-[#246BFD]" />
              </div>
              <h3 className="font-bold text-gray-900">Invite Friends</h3>
              <p className="text-xs text-gray-400 mt-1">Share your invite link via SMS, email, or social media</p>
            </div>

            {/* Invite link */}
            <div className="bg-[#F7F8FC] rounded-xl p-3 mb-3">
              <p className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Your Invite Link
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-white px-3 py-2 rounded-lg text-xs border border-gray-200 text-gray-600"
                />
                <button
                  onClick={handleCopyInvite}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                    copied ? 'bg-green-500 text-white' : 'bg-[#246BFD] text-white hover:bg-[#1A56DB]'
                  }`}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* QR Code placeholder */}
            <div className="bg-[#F7F8FC] rounded-xl p-4 mb-3 text-center">
              <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Share your QR code for quick add</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareInvite}
                className="flex items-center justify-center gap-2 p-3 bg-[#246BFD] text-white rounded-xl text-xs font-medium hover:bg-[#1A56DB] transition"
              >
                <Share2 className="h-4 w-4" /> Share Link
              </button>
              <button
                onClick={handleCopyInvite}
                className="flex items-center justify-center gap-2 p-3 bg-[#F7F8FC] text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
              >
                <Copy className="h-4 w-4" /> Copy Link
              </button>
            </div>

            {/* SMS invite */}
            <div className="mt-3 p-3 border border-dashed border-gray-200 rounded-xl">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[#246BFD]" /> Invite by Phone Number
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter phone number"
                  className="flex-1 bg-white rounded-lg text-xs"
                />
                <Button size="sm" className="bg-[#246BFD] hover:bg-[#1A56DB] rounded-lg text-xs">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Send
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              Invitations include a download link for Abhi Chat
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
