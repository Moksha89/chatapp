import { useState, useEffect } from 'react';
import { X, Plus, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface QuickReply {
  id: string;
  shortcode: string;
  message: string;
}

interface QuickRepliesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickRepliesManager({ isOpen, onClose }: QuickRepliesManagerProps) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [newShortcode, setNewShortcode] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQuickReplies();
    }
  }, [isOpen]);

  const loadQuickReplies = async () => {
    try {
      const data = await api.getQuickReplies();
      setQuickReplies(data);
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  };

  const handleCreate = async () => {
    if (!newShortcode.trim() || !newMessage.trim()) return;
    setLoading(true);
    try {
      await api.createQuickReply({ shortcode: newShortcode.trim(), message: newMessage.trim() });
      setNewShortcode('');
      setNewMessage('');
      await loadQuickReplies();
    } catch (error) {
      console.error('Failed to create quick reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingReply || !editingReply.shortcode.trim() || !editingReply.message.trim()) return;
    setLoading(true);
    try {
      await api.updateQuickReply(editingReply.id, {
        shortcode: editingReply.shortcode,
        message: editingReply.message
      });
      setEditingReply(null);
      await loadQuickReplies();
    } catch (error) {
      console.error('Failed to update quick reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quick reply?')) return;
    setLoading(true);
    try {
      await api.deleteQuickReply(id);
      await loadQuickReplies();
    } catch (error) {
      console.error('Failed to delete quick reply:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Quick Replies
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Create New Quick Reply</h3>
            <div className="space-y-2">
              <Input
                value={newShortcode}
                onChange={(e) => setNewShortcode(e.target.value)}
                placeholder="Shortcode (e.g., /greet)"
                className="w-full"
              />
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message template"
                className="w-full p-2 border rounded-md resize-none h-20"
              />
              <Button onClick={handleCreate} disabled={loading || !newShortcode.trim() || !newMessage.trim()} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Quick Reply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Your Quick Replies</h3>
            <p className="text-xs text-gray-500 mb-1">Type the shortcode in chat to use these templates</p>
                    <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-400">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-mono">/shortcode</span>
                      <span>in chat input to trigger quick reply</span>
                    </div>
            {quickReplies.length === 0 ? (
              <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-2">No quick replies yet</p>
                        <p className="text-[10px] text-gray-400">Create shortcuts for messages you send often</p>
                      </div>
            ) : (
              quickReplies.map(reply => (
                <div key={reply.id} className="p-3 border rounded-lg">
                  {editingReply?.id === reply.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editingReply.shortcode}
                        onChange={(e) => setEditingReply({ ...editingReply, shortcode: e.target.value })}
                        placeholder="Shortcode"
                      />
                      <textarea
                        value={editingReply.message}
                        onChange={(e) => setEditingReply({ ...editingReply, message: e.target.value })}
                        className="w-full p-2 border rounded-md resize-none h-20"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate} disabled={loading}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingReply(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {reply.shortcode}
                        </code>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingReply(reply)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.message}</p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
