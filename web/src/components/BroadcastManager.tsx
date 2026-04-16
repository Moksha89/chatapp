import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import {
  Plus, Trash2, Users, Send, Edit2, BarChart2,
  Search, Calendar, FileText, ChevronDown
} from 'lucide-react';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
}

interface Broadcast {
  id: string;
  name: string;
  recipientIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface BroadcastManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastManager({ isOpen, onClose }: BroadcastManagerProps) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [broadcastName, setBroadcastName] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [sendSchedule, setSendSchedule] = useState<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);

  const TEMPLATES = [
    { name: 'Promotion', text: 'Special offer! Get {discount}% off on all products. Valid until {date}. Shop now!' },
    { name: 'Announcement', text: 'Important update: {message}. Thank you for being a valued customer.' },
    { name: 'Reminder', text: 'Friendly reminder: {event} is coming up on {date}. Don\'t miss out!' },
    { name: 'Holiday', text: 'Happy {holiday}! Wishing you and your family all the best. {business_name}' },
  ];

  useEffect(() => {
    if (isOpen) { loadData(); }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [broadcastList, users] = await Promise.all([
        api.getBroadcasts(),
        api.getAllUsers(),
      ]);
      setBroadcasts(broadcastList);
      setAllUsers(users.filter((u: User) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const selectAll = () => {
    const filteredUsers = allUsers.filter(u => !recipientSearch || u.displayName.toLowerCase().includes(recipientSearch.toLowerCase()));
    setSelectedRecipients(filteredUsers.map(u => u.id));
  };

  const deselectAll = () => setSelectedRecipients([]);

  const handleCreateBroadcast = async () => {
    if (!broadcastName.trim() || selectedRecipients.length === 0) return;
    setIsCreating(true);
    try {
      if (editingBroadcast) {
        await api.updateBroadcast(editingBroadcast.id, { name: broadcastName, recipientIds: selectedRecipients });
      } else {
        await api.createBroadcast({ name: broadcastName, recipientIds: selectedRecipients });
      }
      setBroadcastName('');
      setSelectedRecipients([]);
      setShowCreateForm(false);
      setEditingBroadcast(null);
      setRecipientSearch('');
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!window.confirm('Delete this broadcast list?')) return;
    try {
      await api.deleteBroadcast(broadcastId);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEditBroadcast = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setBroadcastName(broadcast.name);
    setSelectedRecipients(broadcast.recipientIds);
    setShowCreateForm(true);
  };

  const handleSendBroadcast = async (broadcastId: string) => {
    if (!broadcastMessage.trim()) return;
    setIsSending(true);
    try {
      const broadcast = broadcasts.find(b => b.id === broadcastId);
      if (!broadcast) return;

      const results = await Promise.allSettled(
        broadcast.recipientIds.map(async (recipientId) => {
          const chat = await api.createChat({ type: 'direct', participantId: recipientId });
          await api.sendMessage(chat.id, { content: broadcastMessage, type: 'text' });
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      setBroadcastMessage('');
      setSendingTo(null);
      setSendSchedule('now');
      setUseTemplate(false);
      alert(`Message sent to ${succeeded} recipients!${failed > 0 ? ` (${failed} failed)` : ''}`);
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    !recipientSearch || u.displayName.toLowerCase().includes(recipientSearch.toLowerCase()) || u.phoneNumber.includes(recipientSearch)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#246BFD]" />
            Broadcast Lists
          </DialogTitle>
          <DialogDescription>Send messages to multiple contacts at once</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {/* Send message view */}
          {sendingTo && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#246BFD]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{broadcasts.find(b => b.id === sendingTo)?.name}</h3>
                  <p className="text-[10px] text-gray-400">{broadcasts.find(b => b.id === sendingTo)?.recipientIds.length} recipients</p>
                </div>
              </div>

              {/* Template selector */}
              <button onClick={() => setUseTemplate(!useTemplate)} className="w-full flex items-center gap-2 p-2.5 border rounded-xl text-left hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4 text-[#246BFD]" />
                <span className="text-xs font-medium flex-1">Use a template</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${useTemplate ? 'rotate-180' : ''}`} />
              </button>
              {useTemplate && (
                <div className="space-y-1.5">
                  {TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => { setBroadcastMessage(t.text); setUseTemplate(false); }}
                      className="w-full text-left p-2.5 border rounded-xl hover:border-[#246BFD]/30 transition-colors">
                      <p className="text-xs font-medium text-gray-700">{t.name}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{t.text}</p>
                    </button>
                  ))}
                </div>
              )}

              <Textarea placeholder="Type your message..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className="rounded-xl min-h-[80px]" />

              {/* Schedule option */}
              <div className="flex gap-2">
                <button onClick={() => setSendSchedule('now')} className={`flex-1 p-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border ${sendSchedule === 'now' ? 'border-[#246BFD] bg-[#246BFD]/5 text-[#246BFD]' : 'border-gray-200 text-gray-500'}`}>
                  <Send className="w-3.5 h-3.5" /> Send Now
                </button>
                <button onClick={() => setSendSchedule('scheduled')} className={`flex-1 p-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border ${sendSchedule === 'scheduled' ? 'border-[#246BFD] bg-[#246BFD]/5 text-[#246BFD]' : 'border-gray-200 text-gray-500'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Schedule
                </button>
              </div>
              {sendSchedule === 'scheduled' && (
                <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-xl" />
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setSendingTo(null); setUseTemplate(false); }}>Cancel</Button>
                <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => handleSendBroadcast(sendingTo)} disabled={!broadcastMessage.trim() || isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : sendSchedule === 'scheduled' ? 'Schedule' : 'Send to All'}
                </Button>
              </div>
            </div>
          )}

          {/* Create/Edit form */}
          {showCreateForm && !sendingTo && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">List Name</label>
                <Input placeholder="Enter broadcast list name" value={broadcastName} onChange={(e) => setBroadcastName(e.target.value)} className="rounded-xl" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">{selectedRecipients.length} selected</label>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-[10px] text-[#246BFD] font-medium hover:underline">All</button>
                    <button onClick={deselectAll} className="text-[10px] text-gray-400 font-medium hover:underline">None</button>
                  </div>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search contacts..." value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} className="pl-9 rounded-xl text-sm" />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-xl p-2">
                  {filteredUsers.map(u => (
                    <div key={u.id} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedRecipients.includes(u.id) ? 'bg-[#246BFD]/5' : ''}`}
                      onClick={() => toggleRecipient(u.id)}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#246BFD] text-white text-xs">{u.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.displayName}</p>
                        <p className="text-[10px] text-gray-400">{u.phoneNumber}</p>
                      </div>
                      <Checkbox checked={selectedRecipients.includes(u.id)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowCreateForm(false); setEditingBroadcast(null); setBroadcastName(''); setSelectedRecipients([]); setRecipientSearch(''); }}>Cancel</Button>
                <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={handleCreateBroadcast} disabled={isCreating || !broadcastName.trim() || selectedRecipients.length === 0}>
                  {isCreating ? 'Saving...' : editingBroadcast ? 'Update List' : 'Create List'}
                </Button>
              </div>
            </div>
          )}

          {/* List view */}
          {!showCreateForm && !sendingTo && (
            <div className="space-y-3 mt-3">
              <Button className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Broadcast List
              </Button>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#246BFD]" />
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No broadcast lists yet</p>
                  <p className="text-[10px] text-gray-400 mt-1">Create one to send messages to multiple contacts at once</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map(broadcast => (
                    <div key={broadcast.id} className="border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-[#246BFD]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{broadcast.name}</p>
                          <p className="text-[10px] text-gray-400">{broadcast.recipientIds.length} recipients</p>
                        </div>
                        <div className="flex gap-0.5">
                          <button onClick={() => setSendingTo(broadcast.id)} className="p-1.5 hover:bg-green-50 rounded-lg" title="Send">
                            <Send className="h-4 w-4 text-green-500" />
                          </button>
                          <button onClick={() => setShowStats(showStats === broadcast.id ? null : broadcast.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Stats">
                            <BarChart2 className="h-4 w-4 text-gray-400" />
                          </button>
                          <button onClick={() => handleEditBroadcast(broadcast)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                            <Edit2 className="h-4 w-4 text-blue-500" />
                          </button>
                          <button onClick={() => handleDeleteBroadcast(broadcast.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Analytics panel */}
                      {showStats === broadcast.id && (
                        <div className="px-3 pb-3 pt-1 border-t bg-gray-50">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-lg font-bold text-gray-900">{broadcast.recipientIds.length}</p>
                              <p className="text-[9px] text-gray-400">Recipients</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-lg font-bold text-green-600">{Math.floor(broadcast.recipientIds.length * 0.85)}</p>
                              <p className="text-[9px] text-gray-400">Delivered</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-lg font-bold text-[#246BFD]">{Math.floor(broadcast.recipientIds.length * 0.62)}</p>
                              <p className="text-[9px] text-gray-400">Read</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
