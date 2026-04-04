import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Phone,
  Video,
  Search,
  ArrowLeft,
  MoreVertical,
  Timer,
  Lock,
  Star,
  Image,
  Pin,
  FileDown,
  Bot,
  ShoppingCart,
} from 'lucide-react';

interface ChatHeaderProps {
  chatName: string;
  chatInitials: string;
  isTyping: boolean;
  callState: string;
  isLocked?: boolean;
  pinnedMessageId?: string | null;
  showSearchBar: boolean;
  showChatMenu: boolean;
  onBack: () => void;
  onToggleSearch: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleChatMenu: () => void;
  onShowDisappearing: () => void;
  onToggleLock: () => Promise<void>;
  onShowStarred: () => void;
  onShowWallpaper: () => void;
  onUnpinMessage: () => Promise<void>;
  onShowBackup: () => void;
  onShowChatbot: () => void;
  onShowOrder: () => void;
}

export function ChatHeader({
  chatName,
  chatInitials,
  isTyping,
  callState,
  isLocked,
  pinnedMessageId,
  showChatMenu,
  onBack,
  onToggleSearch,
  onVoiceCall,
  onVideoCall,
  onToggleChatMenu,
  onShowDisappearing,
  onToggleLock,
  onShowStarred,
  onShowWallpaper,
  onUnpinMessage,
  onShowBackup,
  onShowChatbot,
  onShowOrder,
}: ChatHeaderProps) {
  return (
    <div className="px-2 md:px-4 py-3 bg-[#008069] flex items-center border-b border-gray-200 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="md:hidden text-white/90 hover:text-white hover:bg-white/10 rounded-full mr-1"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Avatar className="h-10 w-10 mr-3 ring-2 ring-white/20">
        <AvatarFallback className="bg-[#00a884] text-white font-medium">
          {chatInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{chatName}</h3>
        {isTyping && (
          <p className="text-xs text-green-200 font-medium">typing...</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSearch}
          title="Search"
          className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoiceCall}
          disabled={callState !== 'idle'}
          title="Voice Call"
          className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVideoCall}
          disabled={callState !== 'idle'}
          title="Video Call"
          className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
        >
          <Video className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChatMenu}
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
          {showChatMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={onToggleChatMenu} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowDisappearing(); }}>
                  <Timer className="h-4 w-4" /> Disappearing messages
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { onToggleChatMenu(); try { await onToggleLock(); } catch { alert('Failed to toggle chat lock'); } }}>
                  <Lock className="h-4 w-4" /> {isLocked ? 'Unlock chat' : 'Lock chat'}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowStarred(); }}>
                  <Star className="h-4 w-4" /> Starred messages
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowWallpaper(); }}>
                  <Image className="h-4 w-4" /> Chat wallpaper
                </button>
                {pinnedMessageId ? (
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { onToggleChatMenu(); try { await onUnpinMessage(); } catch { alert('Failed to unpin message'); } }}>
                    <Pin className="h-4 w-4" /> Unpin message
                  </button>
                ) : null}
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowBackup(); }}>
                  <FileDown className="h-4 w-4" /> Chat backup
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowChatbot(); }}>
                  <Bot className="h-4 w-4" /> Chatbot auto-reply
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { onToggleChatMenu(); onShowOrder(); }}>
                  <ShoppingCart className="h-4 w-4" /> Create order
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
