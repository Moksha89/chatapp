import { useState, useEffect, useRef } from 'react';
import { 
  MoreVertical, 
  Smile, 
  Edit2, 
  Trash2, 
  Copy, 
  Reply,
  Star,
  Forward,
  Pin,
  Clock,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';

interface MessageContextMenuProps {
  messageId: string;
  content: string;
  isOwn: boolean;
  isDeleted?: boolean;
  reactions?: { [emoji: string]: string[] };
  userId: string;
  createdAt: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  onEdit: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
  onReply?: () => void;
  onCopy: () => void;
  onStar?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  isStarred?: boolean;
}

const QUICK_REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

export function MessageContextMenu({
  isOwn,
  isDeleted,
  reactions,
  userId,
  createdAt,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  onReply,
  onCopy,
  onStar,
  onForward,
  onPin,
  isPinned,
  isStarred,
}: MessageContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const messageAge = Date.now() - new Date(createdAt).getTime();
  const canEdit = isOwn && messageAge < 15 * 60 * 1000 && !isDeleted;
  const canDeleteForEveryone = isOwn && messageAge < 60 * 60 * 1000 && !isDeleted;
  const deleteMinutes = Math.floor(Math.max(0, 60 * 60 * 1000 - messageAge) / 60000);
  const editMinutes = Math.floor(Math.max(0, 15 * 60 * 1000 - messageAge) / 60000);

  const handleReactionClick = (emoji: string) => {
    const hasReacted = reactions?.[emoji]?.includes(userId);
    if (hasReacted) onRemoveReaction(emoji); else onAddReaction(emoji);
    setShowReactions(false);
    setShowMenu(false);
  };

  if (isDeleted) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Quick reactions bar on hover */}
      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-30">
        <div className={`flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-gray-100 px-1 py-0.5 ${isOwn ? 'right-0' : 'left-0'}`}>
          {QUICK_REACTIONS.map((emoji) => {
            const hasReacted = reactions?.[emoji]?.includes(userId);
            return (
              <button
                key={emoji}
                className={`text-base hover:scale-125 transition-transform p-1 rounded-full ${hasReacted ? 'bg-[#246BFD]/10' : 'hover:bg-gray-100'}`}
                onClick={() => handleReactionClick(emoji)}
                title={hasReacted ? 'Remove reaction' : 'React'}
              >
                {emoji}
              </button>
            );
          })}
          <button
            className="text-base hover:scale-110 transition-transform p-1 rounded-full hover:bg-gray-100 text-gray-400"
            onClick={() => { setShowMenu(true); setShowReactions(true); }}
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-black/10"
        onClick={() => setShowMenu(!showMenu)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowReactions(false); setShowDeleteConfirm(false); }} />
          <div className={`absolute z-50 bg-white rounded-xl shadow-xl py-1.5 min-w-[180px] border border-gray-100 ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 context-menu-enter`}>
            {/* Quick reactions row inside menu */}
            {showReactions && (
              <div className="px-2 py-1.5 flex gap-1 border-b border-gray-100">
                {QUICK_REACTIONS.map((emoji) => {
                  const hasReacted = reactions?.[emoji]?.includes(userId);
                  return (
                    <button
                      key={emoji}
                      className={`text-xl hover:scale-125 transition-transform p-1.5 rounded-full ${hasReacted ? 'bg-[#246BFD]/10 ring-1 ring-[#246BFD]/30' : 'hover:bg-gray-100'}`}
                      onClick={() => handleReactionClick(emoji)}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => setShowReactions(!showReactions)}>
              <Smile className="h-4 w-4 text-gray-500" /> <span>React</span>
              <ChevronRight className={`h-3 w-3 text-gray-400 ml-auto transition-transform ${showReactions ? 'rotate-90' : ''}`} />
            </button>

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onReply?.(); setShowMenu(false); }}>
              <Reply className="h-4 w-4 text-gray-500" /> <span>Reply</span>
            </button>

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onCopy(); setShowMenu(false); }}>
              <Copy className="h-4 w-4 text-gray-500" /> <span>Copy</span>
            </button>

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onStar?.(); setShowMenu(false); }}>
              <Star className={`h-4 w-4 ${isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} /> <span>{isStarred ? 'Unstar' : 'Star'}</span>
            </button>

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onForward?.(); setShowMenu(false); }}>
              <Forward className="h-4 w-4 text-gray-500" /> <span>Forward</span>
            </button>

            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onPin?.(); setShowMenu(false); }}>
              <Pin className={`h-4 w-4 ${isPinned ? 'text-[#246BFD]' : 'text-gray-500'}`} /> <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            {/* Edit with time remaining indicator */}
            {canEdit && (
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5" onClick={() => { onEdit(); setShowMenu(false); }}>
                <Edit2 className="h-4 w-4 text-gray-500" /> <span>Edit</span>
                <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-0.5"><Clock className="h-3 w-3" />{editMinutes}m left</span>
              </button>
            )}

            <div className="border-t border-gray-100 my-1" />

            {/* Delete with confirmation and countdown */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2.5 text-red-600" onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}>
              <Trash2 className="h-4 w-4" /> <span>Delete</span>
              <ChevronRight className={`h-3 w-3 ml-auto transition-transform ${showDeleteConfirm ? 'rotate-90' : ''}`} />
            </button>

            {showDeleteConfirm && (
              <div className="px-2 py-1.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[10px] text-gray-500 px-1 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> This action cannot be undone
                </p>
                <button
                  className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-100 rounded-md flex items-center gap-2"
                  onClick={() => { onDelete(false); setShowDeleteConfirm(false); setShowMenu(false); }}
                >
                  <Trash2 className="h-3 w-3 text-gray-500" /> Delete for me
                </button>
                {canDeleteForEveryone && (
                  <button
                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-red-50 rounded-md text-red-600 flex items-center gap-2"
                    onClick={() => { onDelete(true); setShowDeleteConfirm(false); setShowMenu(false); }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete for everyone
                    <span className="text-[10px] text-red-400 ml-auto flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{deleteMinutes}m</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Component to display reactions under a message with hover details
export function MessageReactions({
  reactions,
  userId,
  onAddReaction,
  onRemoveReaction,
}: {
  reactions: { [emoji: string]: string[] };
  userId: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}) {
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  
  if (reactionEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1 relative">
      {reactionEntries.map(([emoji, users]) => {
        const hasReacted = users.includes(userId);
        return (
          <div key={emoji} className="relative">
            <button
              className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 ${
                hasReacted 
                  ? 'bg-[#246BFD]/10 border border-[#246BFD]/30' 
                  : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
              }`}
              onClick={() => hasReacted ? onRemoveReaction(emoji) : onAddReaction(emoji)}
              onMouseEnter={() => setShowDetails(emoji)}
              onMouseLeave={() => setShowDetails(null)}
            >
              <span>{emoji}</span>
              <span className={`font-medium ${hasReacted ? 'text-[#246BFD]' : 'text-gray-600'}`}>{users.length}</span>
            </button>
            {showDetails === emoji && (
              <div className="absolute bottom-full mb-1 left-0 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                {users.slice(0, 5).map((uid, i) => <span key={uid}>{i > 0 ? ', ' : ''}{uid === userId ? 'You' : 'User'}</span>)}
                {users.length > 5 && <span> +{users.length - 5} more</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Edit message dialog - inline style with keyboard shortcuts
export function EditMessageDialog({
  isOpen,
  content,
  onSave,
  onCancel,
}: {
  isOpen: boolean;
  content: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}) {
  const [editedContent, setEditedContent] = useState(content);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (isOpen && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(editedContent.length, editedContent.length);
    }
  }, [isOpen, editedContent.length]);

  if (!isOpen) return null;

  return (
    <div className="px-4 py-2 bg-white border-t border-[#246BFD]/20 flex items-start gap-3">
      <div className="border-l-4 border-[#246BFD] pl-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Edit2 className="h-3 w-3 text-[#246BFD]" />
          <p className="text-xs font-medium text-[#246BFD]">Editing message</p>
        </div>
        <textarea
          ref={ref}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editedContent.trim() && editedContent !== content) onSave(editedContent); }
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full p-2 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
          rows={2}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">Enter to save, Esc to cancel</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs bg-[#246BFD] hover:bg-[#1A56DB]" onClick={() => onSave(editedContent)} disabled={!editedContent.trim() || editedContent === content}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
