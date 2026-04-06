import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import {
  UserPlus, UserCheck, UserX, Users, X, Search, Clock, Ban, Trash2,
  RefreshCw, Phone, ArrowUpDown
} from 'lucide-react';

interface FriendUser {
  id: string;
  displayName: string;
  phoneNumber: string;
}

interface FriendRecord {
  id: string;
  requesterId: string;
  recipientId: string;
  status: string;
  createdAt: string;
  user: FriendUser;
}

interface FriendWithUser {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: string;
  user?: FriendUser;
}

type Tab = 'friends' | 'requests' | 'suggestions';
type SortBy = 'name' | 'recent';

export function FriendsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [requests, setRequests] = useState<FriendRecord[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRecord[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [addPhoneNumber, setAddPhoneNumber] = useState('');
  const [addingByPhone, setAddingByPhone] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFriends();
      setFriends(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, sent] = await Promise.all([
        api.getFriendRequests(),
        api.getSentFriendRequests(),
      ]);
      setRequests(pending);
      setSentRequests(sent);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFriendSuggestions();
      setSuggestions(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === 'friends') loadFriends();
    else if (tab === 'requests') loadRequests();
    else if (tab === 'suggestions') loadSuggestions();
  }, [isOpen, tab, loadFriends, loadRequests, loadSuggestions]);

  const handleAccept = async (requestId: string) => {
    try {
      await api.acceptFriendRequest(requestId);
      loadRequests();
    } catch { /* ignore */ }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.declineFriendRequest(requestId);
      loadRequests();
    } catch { /* ignore */ }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await api.sendFriendRequest(userId);
      setSuggestions(prev => prev.filter(s => s.id !== userId));
    } catch { /* ignore */ }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await api.removeFriend(friendshipId);
      loadFriends();
    } catch { /* ignore */ }
  };

  const handleBlock = async (userId: string) => {
    if (!confirm('Block this user? They won\'t be able to contact you.')) return;
    try {
      await api.blockFriend(userId);
      loadFriends();
    } catch { /* ignore */ }
  };

  const handleSyncContacts = async () => {
    setSyncing(true);
    setSyncMessage('Syncing contacts...');
    try {
      // Simulate contact sync with progress
      await new Promise(r => setTimeout(r, 800));
      setSyncMessage('Finding friends on Abhi Chat...');
      await new Promise(r => setTimeout(r, 600));
      await loadSuggestions();
      setSyncMessage(`Sync complete! Found ${suggestions.length} contacts on Abhi Chat`);
      setTimeout(() => setSyncMessage(''), 3000);
    } catch {
      setSyncMessage('Sync failed. Please try again.');
    }
    setSyncing(false);
  };

  const handleAddByPhone = async () => {
    if (!addPhoneNumber.trim()) return;
    setAddingByPhone(true);
    try {
      const results = await api.searchUsers(addPhoneNumber);
      if (results.length > 0) {
        await api.sendFriendRequest(results[0].id);
        setAddPhoneNumber('');
        setSyncMessage('Friend request sent!');
        setTimeout(() => setSyncMessage(''), 2000);
      } else {
        setSyncMessage('User not found. Invite them to join!');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch { setSyncMessage('Failed to add. Try again.'); }
    setAddingByPhone(false);
  };

  if (!isOpen) return null;

  const filteredFriends = friends.filter(f => {
    const name = (f as unknown as { user?: FriendUser }).user?.displayName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort friends
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aUser = (a as unknown as { user?: FriendUser }).user;
    const bUser = (b as unknown as { user?: FriendUser }).user;
    if (sortBy === 'name') {
      return (aUser?.displayName || '').localeCompare(bUser?.displayName || '');
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" />, count: friends.length },
    { key: 'requests', label: 'Requests', icon: <Clock className="w-4 h-4" />, count: requests.length },
    { key: 'suggestions', label: 'Discover', icon: <UserPlus className="w-4 h-4" />, count: suggestions.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#246BFD]" />
            Friends
            <span className="text-xs bg-[#246BFD]/10 text-[#246BFD] px-2 py-0.5 rounded-full font-medium">{friends.length}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={handleSyncContacts} disabled={syncing} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Sync contacts">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#246BFD]' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync message */}
        {syncMessage && (
          <div className={`px-4 py-2 text-xs font-medium ${syncMessage.includes('complete') || syncMessage.includes('sent') ? 'bg-green-50 text-green-700' : syncMessage.includes('failed') ? 'bg-red-50 text-red-600' : 'bg-[#246BFD]/5 text-[#246BFD]'}`}>
            {syncMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition ${
                tab === t.key
                  ? 'border-[#246BFD] text-[#246BFD]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                  tab === t.key ? 'bg-[#246BFD]/10 text-[#246BFD]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + filters (friends tab) */}
        {tab === 'friends' && (
          <div className="p-3 border-b border-gray-50 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search friends..."
                className="w-full pl-9 pr-3 py-2 bg-[#F7F8FC] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{sortedFriends.length} friends</span>
              <button
                onClick={() => setSortBy(sortBy === 'name' ? 'recent' : 'name')}
                className="text-[10px] text-[#246BFD] font-medium flex items-center gap-1 hover:underline"
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortBy === 'name' ? 'A-Z' : 'Recent'}
              </button>
            </div>
          </div>
        )}

        {/* Add by phone (suggestions tab) */}
        {tab === 'suggestions' && (
          <div className="p-3 border-b border-gray-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Add by Phone Number
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+1 234 567 8900"
                className="flex-1 px-3 py-2 bg-[#F7F8FC] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                value={addPhoneNumber}
                onChange={e => setAddPhoneNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddByPhone()}
              />
              <button
                onClick={handleAddByPhone}
                disabled={addingByPhone || !addPhoneNumber.trim()}
                className="px-3 py-2 bg-[#246BFD] text-white rounded-xl text-xs font-medium hover:bg-[#1A56DB] disabled:opacity-50 transition"
              >
                {addingByPhone ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-[#246BFD] border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading...</p>
            </div>
          ) : tab === 'friends' ? (
            sortedFriends.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{searchQuery ? 'No friends found' : 'No friends yet'}</p>
                <p className="text-xs text-gray-400 mt-1">Add friends from the Discover tab</p>
                {!searchQuery && (
                  <button onClick={() => setTab('suggestions')} className="mt-2 text-xs text-[#246BFD] font-medium hover:underline">
                    Find Friends
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sortedFriends.map(f => {
                  const friendUser = (f as unknown as { user?: FriendUser }).user;
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition group">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white font-medium text-sm">
                          {friendUser?.displayName?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{friendUser?.displayName || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{friendUser?.phoneNumber || ''}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleBlock(friendUser?.id || '')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-orange-500 transition" title="Block">
                          <Ban className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRemoveFriend(f.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : tab === 'requests' ? (
            <div>
              {requests.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#246BFD] rounded-full animate-pulse" />
                    Incoming Requests ({requests.length})
                  </p>
                  <div className="divide-y divide-gray-50">
                    {requests.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white font-medium text-sm">
                            {r.user?.displayName?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{r.user?.displayName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{r.user?.phoneNumber || ''}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleAccept(r.id)} className="p-1.5 rounded-lg bg-[#246BFD]/10 text-[#246BFD] hover:bg-[#246BFD]/20 transition" title="Accept">
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDecline(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Decline">
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sentRequests.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Sent Requests ({sentRequests.length})</p>
                  <div className="divide-y divide-gray-50">
                    {sentRequests.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white font-medium text-sm">
                            {r.user?.displayName?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{r.user?.displayName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">Pending...</p>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {requests.length === 0 && sentRequests.length === 0 && (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending requests</p>
                  <p className="text-xs text-gray-400 mt-1">Friend requests you send or receive will appear here</p>
                </div>
              )}
            </div>
          ) : (
            /* Suggestions/Discover */
            <div>
              {/* Sync contacts banner */}
              <div className="m-3 p-3 bg-gradient-to-r from-[#246BFD]/5 to-[#6C5CE7]/5 rounded-xl border border-[#246BFD]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className={`h-5 w-5 text-[#246BFD] ${syncing ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">Sync Your Contacts</p>
                    <p className="text-[10px] text-gray-500">Find friends who are already on Abhi Chat</p>
                  </div>
                  <button
                    onClick={handleSyncContacts}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-[#246BFD] text-white text-xs font-medium rounded-lg hover:bg-[#1A56DB] disabled:opacity-50 transition"
                  >
                    {syncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <div className="p-8 text-center">
                  <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No suggestions available</p>
                  <p className="text-xs text-gray-400 mt-1">Sync your contacts or invite friends to join!</p>
                  <button
                    onClick={handleSyncContacts}
                    disabled={syncing}
                    className="mt-3 px-4 py-2 bg-[#246BFD] text-white text-xs font-medium rounded-xl hover:bg-[#1A56DB] transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 inline mr-1 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Contacts
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    People You May Know ({suggestions.length})
                  </p>
                  {suggestions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] text-white font-medium text-sm">
                          {s.displayName?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{s.displayName}</p>
                        <p className="text-xs text-gray-400">{s.phoneNumber}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#246BFD] text-white text-xs font-medium rounded-xl hover:bg-[#1A56DB] transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
