import { useState, useEffect } from 'react';
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
import { Checkbox } from './ui/checkbox';
import { Plus, Trash2, Users, Send, Edit2 } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [broadcastList, users] = await Promise.all([
        api.getBroadcasts(),
        api.searchUsers(''),
      ]);
      setBroadcasts(broadcastList);
      setAllUsers(users.filter((u: User) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateBroadcast = async () => {
    if (!broadcastName.trim() || selectedRecipients.length === 0) return;

    setIsCreating(true);
    try {
      if (editingBroadcast) {
        await api.updateBroadcast(editingBroadcast.id, {
          name: broadcastName,
          recipientIds: selectedRecipients,
        });
      } else {
        await api.createBroadcast({
          name: broadcastName,
          recipientIds: selectedRecipients,
        });
      }
      setBroadcastName('');
      setSelectedRecipients([]);
      setShowCreateForm(false);
      setEditingBroadcast(null);
      loadData();
    } catch (error) {
      console.error('Failed to save broadcast:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    try {
      await api.deleteBroadcast(broadcastId);
      loadData();
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
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

    try {
      // Send message to all recipients in the broadcast list
      const broadcast = broadcasts.find(b => b.id === broadcastId);
      if (!broadcast) return;

      for (const recipientId of broadcast.recipientIds) {
        // Create or get existing chat with each recipient
        const chat = await api.createChat({ type: 'direct', participantId: recipientId });
        // Send message
        await api.sendMessage(chat.id, { content: broadcastMessage, type: 'text' });
      }

      setBroadcastMessage('');
      setSendingTo(null);
      alert(`Message sent to ${broadcast.recipientIds.length} recipients!`);
    } catch (error) {
      console.error('Failed to send broadcast:', error);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Broadcast Lists</DialogTitle>
          <DialogDescription>
            Send messages to multiple contacts at once
          </DialogDescription>
        </DialogHeader>

        {sendingTo ? (
          <div className="space-y-4">
            <h3 className="font-medium">
              Send to: {broadcasts.find(b => b.id === sendingTo)?.name}
            </h3>
            <Input
              placeholder="Type your message..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSendingTo(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSendBroadcast(sendingTo)}
                disabled={!broadcastMessage.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to All
              </Button>
            </div>
          </div>
        ) : showCreateForm ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">List Name</label>
              <Input
                placeholder="Enter broadcast list name"
                value={broadcastName}
                onChange={(e) => setBroadcastName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Recipients ({selectedRecipients.length} selected)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {allUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
                      selectedRecipients.includes(u.id) ? 'bg-green-50' : ''
                    }`}
                    onClick={() => toggleRecipient(u.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-500 text-white text-sm">
                          {u.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{u.displayName}</span>
                    </div>
                    <Checkbox checked={selectedRecipients.includes(u.id)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingBroadcast(null);
                  setBroadcastName('');
                  setSelectedRecipients([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateBroadcast}
                disabled={isCreating || !broadcastName.trim() || selectedRecipients.length === 0}
              >
                {isCreating ? 'Saving...' : editingBroadcast ? 'Update List' : 'Create List'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button className="w-full" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Broadcast List
            </Button>

            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : broadcasts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No broadcast lists yet. Create one to send messages to multiple contacts.
              </p>
            ) : (
              <div className="space-y-2">
                {broadcasts.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{broadcast.name}</p>
                        <p className="text-xs text-gray-500">
                          {broadcast.recipientIds.length} recipients
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSendingTo(broadcast.id)}
                        title="Send message"
                      >
                        <Send className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditBroadcast(broadcast)}
                        title="Edit list"
                      >
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        title="Delete list"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
