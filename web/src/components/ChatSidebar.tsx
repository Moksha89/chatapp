import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Search, MessageSquarePlus, Settings, LogOut, User, Tag, MessageSquare, Building2, Smartphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NewChatDialog } from './NewChatDialog';
import { LabelsManager } from './LabelsManager';
import { QuickRepliesManager } from './QuickRepliesManager';
import { BusinessProfileSettings } from './BusinessProfileSettings';
import { LinkedDevicesManager } from './LinkedDevicesManager';

export function ChatSidebar() {
  const { user, logout } = useAuth();
  const { chats, activeChat, selectChat, isLoadingChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
    const [showLabels, setShowLabels] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [showBusinessProfile, setShowBusinessProfile] = useState(false);
    const [showLinkedDevices, setShowLinkedDevices] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const chatName = chat.name || chat.participants.find((p) => p.userId !== user?.id)?.user?.displayName || '';
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatName = (chat: typeof chats[0]) => {
    if (chat.name) return chat.name;
    const otherParticipant = chat.participants.find((p) => p.userId !== user?.id);
    return otherParticipant?.user?.displayName || 'Unknown';
  };

  const getChatInitials = (chat: typeof chats[0]) => {
    const name = getChatName(chat);
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-96 border-r bg-white flex flex-col h-full">
      <div className="p-3 bg-gray-100 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-500 text-white">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {user?.displayName}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowLabels(true)}>
                          <Tag className="mr-2 h-4 w-4" />
                          Labels
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowQuickReplies(true)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Quick Replies
                        </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setShowBusinessProfile(true)}>
                                                  <Building2 className="mr-2 h-4 w-4" />
                                                  Business Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setShowLinkedDevices(true)}>
                                                  <Smartphone className="mr-2 h-4 w-4" />
                                                  Linked Devices
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                  <Settings className="mr-2 h-4 w-4" />
                                                  Settings
                                                </DropdownMenuItem>
                        <DropdownMenuItem onClick={logout} className="text-red-600">
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewChat(true)}
            title="New Chat"
          >
            <MessageSquarePlus className="h-5 w-5 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Logout"
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search or start new chat"
            className="pl-10 bg-gray-100 border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingChats ? (
          <div className="p-4 text-center text-gray-500">Loading chats...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No chats found' : 'No chats yet. Start a new conversation!'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 ${
                activeChat?.id === chat.id ? 'bg-gray-200' : ''
              }`}
              onClick={() => selectChat(chat)}
            >
              <Avatar className="h-12 w-12 mr-3">
                <AvatarFallback className="bg-green-500 text-white">
                  {getChatInitials(chat)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium truncate">{getChatName(chat)}</span>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTime(chat.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
      <LabelsManager isOpen={showLabels} onClose={() => setShowLabels(false)} />
      <QuickRepliesManager isOpen={showQuickReplies} onClose={() => setShowQuickReplies(false)} />
      <BusinessProfileSettings isOpen={showBusinessProfile} onClose={() => setShowBusinessProfile(false)} />
      <LinkedDevicesManager isOpen={showLinkedDevices} onClose={() => setShowLinkedDevices(false)} />
    </div>
  );
}
