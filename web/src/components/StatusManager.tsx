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
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Plus, Eye, Trash2, Clock } from 'lucide-react';

interface Status {
  id: string;
  userId: string;
  content: string;
  type: string;
  backgroundColor: string;
  textColor: string;
  expiresAt: string;
  viewedBy: string[];
  createdAt: string;
  user?: {
    displayName: string;
  };
}

interface StatusManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BACKGROUND_COLORS = [
  '#25D366', '#128C7E', '#075E54', '#34B7F1',
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#FF5722', '#795548', '#607D8B', '#000000',
];

export function StatusManager({ isOpen, onClose }: StatusManagerProps) {
  const { user } = useAuth();
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [contactStatuses, setContactStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');
  const [selectedColor, setSelectedColor] = useState(BACKGROUND_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatuses();
    }
  }, [isOpen]);

  const loadStatuses = async () => {
    setIsLoading(true);
    try {
      const [my, contacts] = await Promise.all([
        api.getMyStatuses(),
        api.getContactStatuses(),
      ]);
      setMyStatuses(my);
      setContactStatuses(contacts);
    } catch (error) {
      console.error('Failed to load statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusText.trim()) return;
    
    setIsCreating(true);
    try {
      await api.createStatus({
        content: newStatusText,
        type: 'text',
        backgroundColor: selectedColor,
        textColor: '#FFFFFF',
      });
      setNewStatusText('');
      setShowCreateForm(false);
      loadStatuses();
    } catch (error) {
      console.error('Failed to create status:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await api.deleteStatus(statusId);
      loadStatuses();
    } catch (error) {
      console.error('Failed to delete status:', error);
    }
  };

  const handleViewStatus = async (status: Status) => {
    setSelectedStatus(status);
    if (status.userId !== user?.id) {
      try {
        await api.viewStatus(status.id);
      } catch (error) {
        console.error('Failed to mark status as viewed:', error);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status Updates</DialogTitle>
          <DialogDescription>
            Share updates that disappear after 24 hours
          </DialogDescription>
        </DialogHeader>

        {selectedStatus ? (
          <div className="space-y-4">
            <div
              className="rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center"
              style={{
                backgroundColor: selectedStatus.backgroundColor || '#25D366',
                color: selectedStatus.textColor || '#FFFFFF',
              }}
            >
              <p className="text-xl font-medium">{selectedStatus.content}</p>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{formatTimeAgo(selectedStatus.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {selectedStatus.viewedBy?.length || 0} views
              </span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setSelectedStatus(null)}>
              Back to Status List
            </Button>
          </div>
        ) : showCreateForm ? (
          <div className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              className="min-h-[100px]"
              style={{
                backgroundColor: selectedColor,
                color: '#FFFFFF',
              }}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateStatus}
                disabled={isCreating || !newStatusText.trim()}
              >
                {isCreating ? 'Posting...' : 'Post Status'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Status Update
            </Button>

            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Loading statuses...</p>
            ) : (
              <>
                {myStatuses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">My Status</h3>
                    <div className="space-y-2">
                      {myStatuses.map((status) => (
                        <div
                          key={status.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() => handleViewStatus(status)}
                          >
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: status.backgroundColor || '#25D366' }}
                            >
                              {status.content.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {status.content}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(status.createdAt)}
                                <span className="mx-1">-</span>
                                <Eye className="h-3 w-3" />
                                {status.viewedBy?.length || 0}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contactStatuses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recent Updates</h3>
                    <div className="space-y-2">
                      {contactStatuses.map((status) => (
                        <div
                          key={status.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewStatus(status)}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: status.backgroundColor || '#25D366' }}
                          >
                            {status.content.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {status.user?.displayName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(status.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {myStatuses.length === 0 && contactStatuses.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No status updates yet. Be the first to share!
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
