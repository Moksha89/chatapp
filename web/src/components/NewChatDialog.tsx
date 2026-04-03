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
import { Search, UserPlus, Users } from 'lucide-react';

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
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load all users when dialog opens
  useEffect(() => {
    if (open) {
      loadAllUsers();
    }
  }, [open]);

  const loadAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Use the /users/all endpoint to get all registered users
      const results = await api.getAllUsers();
      // Filter out current user
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
      // Filter out current user
      const filteredResults = results.filter((u: User) => u.id !== currentUser?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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
      onOpenChange(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Select a user to start a conversation or search by phone number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter phone number"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoadingUsers && (
              <p className="text-center text-gray-500 py-4">Loading users...</p>
            )}
            {!isLoadingUsers && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                {searchQuery ? 'No users found' : 'No other users registered yet'}
              </p>
            )}
            {!isLoadingUsers && searchResults.length > 0 && (
              <p className="text-xs text-gray-500 mb-2">
                <Users className="inline h-3 w-3 mr-1" />
                {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} available
              </p>
            )}

            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-green-500 text-white">
                      {user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleStartChat(user.id)}
                  disabled={isCreating}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
