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
import { Checkbox } from './ui/checkbox';
import { Users } from 'lucide-react';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createGroupChat, selectChat } = useChat();
  const { user: currentUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadAllUsers();
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
    }
  }, [open]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      const results = await api.getAllUsers();
      const filteredUsers = results.filter((u: User) => u.id !== currentUser?.id);
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    
    setIsCreating(true);
    try {
      const newChat = await createGroupChat(groupName, selectedUsers, groupDescription);
      selectChat(newChat);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Create a new group chat with multiple participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name</label>
            <Input
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              placeholder="Enter group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Participants ({selectedUsers.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {isLoading && (
                <p className="text-center text-gray-500 py-4">Loading users...</p>
              )}
              {!isLoading && allUsers.length === 0 && (
                <p className="text-center text-gray-500 py-4">No other users available</p>
              )}
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    selectedUsers.includes(user.id) ? 'bg-green-50' : ''
                  }`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-500 text-white text-sm">
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.phoneNumber}</p>
                    </div>
                  </div>
                  <Checkbox checked={selectedUsers.includes(user.id)} />
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
          >
            {isCreating ? (
              'Creating...'
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Create Group ({selectedUsers.length} members)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
