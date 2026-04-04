import { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Smile, 
  Edit2, 
  Trash2, 
  Copy, 
  Reply,
  Star,
  Forward,
  Pin
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
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
}: MessageContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  // Check if message is within edit window (15 minutes)
  const messageAge = Date.now() - new Date(createdAt).getTime();
  const canEdit = isOwn && messageAge < 15 * 60 * 1000 && !isDeleted;
  
  // Check if message is within delete-for-everyone window (1 hour)
  const canDeleteForEveryone = isOwn && messageAge < 60 * 60 * 1000 && !isDeleted;

  const handleReactionClick = (emoji: string) => {
    const hasReacted = reactions?.[emoji]?.includes(userId);
    if (hasReacted) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
    setShowReactions(false);
  };

  const handleDeleteClick = (deleteForEveryone: boolean) => {
    onDelete(deleteForEveryone);
    setShowDeleteOptions(false);
    setShowMenu(false);
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className="relative">
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
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowMenu(false);
              setShowReactions(false);
              setShowDeleteOptions(false);
            }}
          />
          <div className={`absolute z-50 bg-white rounded-lg shadow-lg py-1 min-w-[160px] ${
            isOwn ? 'right-0' : 'left-0'
          } top-full mt-1`}>
            {/* Reactions */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Smile className="h-4 w-4" />
              React
            </button>

            {showReactions && (
              <div className="px-2 py-1 flex gap-1 border-b">
                {QUICK_REACTIONS.map((emoji) => {
                  const hasReacted = reactions?.[emoji]?.includes(userId);
                  return (
                    <button
                      key={emoji}
                      className={`text-lg hover:scale-125 transition-transform p-1 rounded ${
                        hasReacted ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => handleReactionClick(emoji)}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Reply */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                onReply?.();
                setShowMenu(false);
              }}
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>

            {/* Copy */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                onCopy();
                setShowMenu(false);
              }}
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>

            {/* Star */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                onStar?.();
                setShowMenu(false);
              }}
            >
              <Star className="h-4 w-4" />
              Star
            </button>

            {/* Forward */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                onForward?.();
                setShowMenu(false);
              }}
            >
              <Forward className="h-4 w-4" />
              Forward
            </button>

            {/* Pin */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                onPin?.();
                setShowMenu(false);
              }}
            >
              <Pin className="h-4 w-4" />
              {isPinned ? 'Unpin' : 'Pin'}
            </button>

            {/* Edit (only for own messages within 15 min) */}
            {canEdit && (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}

            {/* Delete */}
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
              onClick={() => setShowDeleteOptions(!showDeleteOptions)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>

            {showDeleteOptions && (
              <div className="px-2 py-1 border-t">
                <button
                  className="w-full px-2 py-1 text-left text-xs hover:bg-gray-100 rounded"
                  onClick={() => handleDeleteClick(false)}
                >
                  Delete for me
                </button>
                {canDeleteForEveryone && (
                  <button
                    className="w-full px-2 py-1 text-left text-xs hover:bg-gray-100 rounded text-red-600"
                    onClick={() => handleDeleteClick(true)}
                  >
                    Delete for everyone
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

// Component to display reactions under a message
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
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  
  if (reactionEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactionEntries.map(([emoji, users]) => {
        const hasReacted = users.includes(userId);
        return (
          <button
            key={emoji}
            className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
              hasReacted 
                ? 'bg-blue-100 border border-blue-300' 
                : 'bg-gray-100 border border-gray-200'
            }`}
            onClick={() => hasReacted ? onRemoveReaction(emoji) : onAddReaction(emoji)}
          >
            <span>{emoji}</span>
            <span className="text-gray-600">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

// Edit message dialog
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

  // Fix Bug #6: Sync editedContent when content prop changes (different message selected)
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-md">
        <h3 className="font-semibold mb-3">Edit Message</h3>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 border rounded-lg resize-none"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(editedContent)}
            disabled={!editedContent.trim() || editedContent === content}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
