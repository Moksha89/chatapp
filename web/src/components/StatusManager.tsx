import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Plus, Eye, Trash2, Clock, Image, Video, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

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
  const [statusType, setStatusType] = useState<'text' | 'image' | 'video'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [viewerStatuses, setViewerStatuses] = useState<Status[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (statusType === 'text' && !newStatusText.trim()) return;
    if ((statusType === 'image' || statusType === 'video') && !mediaFile) return;
    
    setIsCreating(true);
    try {
      let mediaUrl: string | undefined;
      if (mediaFile) {
        const result = await api.uploadMedia(mediaFile);
        mediaUrl = result.url;
      }
      await api.createStatus({
        content: statusType === 'text' ? newStatusText : (newStatusText || (statusType === 'image' ? 'Photo' : 'Video')),
        type: statusType,
        backgroundColor: statusType === 'text' ? selectedColor : '#000000',
        textColor: '#FFFFFF',
        mediaUrl,
      });
      setNewStatusText('');
      setMediaFile(null);
      setMediaPreview(null);
      setStatusType('text');
      setShowCreateForm(false);
      loadStatuses();
    } catch (error) {
      console.error('Failed to create status:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setStatusType(type);
    setMediaPreview(URL.createObjectURL(file));
    setShowCreateForm(true);
  };

  // Story viewer with auto-advance
  const openStoryViewer = useCallback((statuses: Status[], startIndex: number) => {
    setViewerStatuses(statuses);
    setViewerIndex(startIndex);
    setIsAutoPlaying(true);
  }, []);

  const closeStoryViewer = useCallback(() => {
    setViewerStatuses([]);
    setViewerIndex(0);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
  }, []);

  // Auto-advance stories every 5 seconds
  useEffect(() => {
    if (viewerStatuses.length === 0 || !isAutoPlaying) return;
    autoPlayTimerRef.current = setTimeout(() => {
      if (viewerIndex < viewerStatuses.length - 1) {
        setViewerIndex(prev => prev + 1);
      } else {
        closeStoryViewer();
      }
    }, 5000);
    return () => { if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current); };
  }, [viewerIndex, viewerStatuses, isAutoPlaying, closeStoryViewer]);

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

  // Render story viewer overlay
  const renderStoryViewer = () => {
    if (viewerStatuses.length === 0) return null;
    const current = viewerStatuses[viewerIndex];
    if (!current) return null;

    // Mark as viewed
    if (current.userId !== user?.id) {
      api.viewStatus(current.id).catch(() => {});
    }

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
        {/* Progress bars */}
        <div className="flex gap-1 p-2 pt-3">
          {viewerStatuses.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded bg-white/30 overflow-hidden">
              <div
                className={`h-full bg-white transition-all ${
                  i < viewerIndex ? 'w-full' : i === viewerIndex ? 'w-full animate-pulse' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              {(current.user?.displayName || 'U')[0]}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{current.user?.displayName || 'You'}</p>
              <p className="text-white/60 text-xs">{formatTimeAgo(current.createdAt)}</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); closeStoryViewer(); }} className="text-white text-2xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center relative">
          {current.type === 'image' && current.content && (
            <img src={current.content} alt="Status" className="max-w-full max-h-full object-contain" />
          )}
          {current.type === 'video' && current.content && (
            <video src={current.content} autoPlay muted className="max-w-full max-h-full" />
          )}
          {current.type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: current.backgroundColor || '#25D366' }}
            >
              <p className="text-2xl font-medium text-white text-center">{current.content}</p>
            </div>
          )}

          {/* Nav arrows */}
          {viewerIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(prev => prev - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {viewerIndex < viewerStatuses.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(prev => prev + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-4">
          <span className="text-white/60 text-sm flex items-center gap-1">
            <Eye className="w-4 h-4" /> {current.viewedBy?.length || 0}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setIsAutoPlaying(!isAutoPlaying); }}
            className="text-white/80 hover:text-white"
          >
            {isAutoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
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
    <>
    {renderStoryViewer()}
    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleMediaSelect(e, 'image')} />
    <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMediaSelect(e, 'video')} />
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
            {selectedStatus.type === 'image' && selectedStatus.content && (
              <img src={selectedStatus.content} alt="Status" className="rounded-lg w-full max-h-[300px] object-contain bg-black" />
            )}
            {selectedStatus.type === 'video' && selectedStatus.content && (
              <video src={selectedStatus.content} controls className="rounded-lg w-full max-h-[300px] bg-black" />
            )}
            {selectedStatus.type === 'text' && (
              <div
                className="rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center"
                style={{
                  backgroundColor: selectedStatus.backgroundColor || '#25D366',
                  color: selectedStatus.textColor || '#FFFFFF',
                }}
              >
                <p className="text-xl font-medium">{selectedStatus.content}</p>
              </div>
            )}
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
            {/* Status type tabs */}
            <div className="flex gap-2 mb-2">
              <button
                className={`px-3 py-1 rounded-full text-sm ${statusType === 'text' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => { setStatusType('text'); setMediaFile(null); setMediaPreview(null); }}
              >Text</button>
              <button
                className={`px-3 py-1 rounded-full text-sm ${statusType === 'image' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => fileInputRef.current?.click()}
              ><Image className="w-3 h-3 inline mr-1" />Photo</button>
              <button
                className={`px-3 py-1 rounded-full text-sm ${statusType === 'video' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => videoInputRef.current?.click()}
              ><Video className="w-3 h-3 inline mr-1" />Video</button>
            </div>

            {/* Media preview */}
            {mediaPreview && statusType === 'image' && (
              <img src={mediaPreview} alt="Preview" className="rounded-lg w-full max-h-[200px] object-contain bg-black" />
            )}
            {mediaPreview && statusType === 'video' && (
              <video src={mediaPreview} controls className="rounded-lg w-full max-h-[200px] bg-black" />
            )}

            {statusType === 'text' ? (
              <>
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
              </>
            ) : (
              <Textarea
                placeholder="Add a caption... (optional)"
                value={newStatusText}
                onChange={(e) => setNewStatusText(e.target.value)}
                className="min-h-[60px]"
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreateForm(false); setMediaFile(null); setMediaPreview(null); setStatusType('text'); }}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateStatus}
                disabled={isCreating || (statusType === 'text' ? !newStatusText.trim() : !mediaFile)}
              >
                {isCreating ? 'Posting...' : 'Post Status'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Text Status
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
              >
                <Video className="h-4 w-4" />
              </Button>
            </div>

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
                          onClick={() => {
                            const userStatuses = contactStatuses.filter(s => s.userId === status.userId);
                            const idx = userStatuses.findIndex(s => s.id === status.id);
                            openStoryViewer(userStatuses, idx >= 0 ? idx : 0);
                          }}
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
    </>
  );
}
