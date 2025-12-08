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
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Plus, Trash2, Edit2, MessageSquare, Clock, Zap } from 'lucide-react';

interface AutoReply {
  id: string;
  userId: string;
  type: 'greeting' | 'away' | 'quick_reply';
  message: string;
  isEnabled: boolean;
  schedule: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AutoReplySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTO_REPLY_TYPES = [
  { value: 'greeting', label: 'Greeting Message', icon: MessageSquare, description: 'Sent when someone messages you for the first time' },
  { value: 'away', label: 'Away Message', icon: Clock, description: 'Sent when you are unavailable' },
  { value: 'quick_reply', label: 'Quick Reply', icon: Zap, description: 'Custom auto-response for specific scenarios' },
];

export function AutoReplySettings({ isOpen, onClose }: AutoReplySettingsProps) {
  const { user } = useAuth();
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReply, setEditingReply] = useState<AutoReply | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'greeting' as 'greeting' | 'away' | 'quick_reply',
    message: '',
    schedule: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadAutoReplies();
    }
  }, [isOpen]);

  const loadAutoReplies = async () => {
    setIsLoading(true);
    try {
      const replies = await api.getAutoReplies();
      setAutoReplies(replies);
    } catch (error) {
      console.error('Failed to load auto-replies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'greeting',
      message: '',
      schedule: '',
    });
    setEditingReply(null);
    setShowForm(false);
  };

  const handleEditReply = (reply: AutoReply) => {
    setEditingReply(reply);
    setFormData({
      type: reply.type,
      message: reply.message,
      schedule: reply.schedule || '',
    });
    setShowForm(true);
  };

  const handleSaveReply = async () => {
    if (!formData.message.trim()) return;

    setIsSaving(true);
    try {
      const replyData = {
        type: formData.type,
        message: formData.message,
        schedule: formData.type === 'away' && formData.schedule ? formData.schedule : null,
      };

      if (editingReply) {
        await api.updateAutoReply(editingReply.id, replyData);
      } else {
        await api.createAutoReply(replyData);
      }
      resetForm();
      loadAutoReplies();
    } catch (error) {
      console.error('Failed to save auto-reply:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await api.deleteAutoReply(replyId);
      loadAutoReplies();
    } catch (error) {
      console.error('Failed to delete auto-reply:', error);
    }
  };

  const handleToggleReply = async (replyId: string) => {
    try {
      await api.toggleAutoReply(replyId);
      loadAutoReplies();
    } catch (error) {
      console.error('Failed to toggle auto-reply:', error);
    }
  };

  const getTypeInfo = (type: string) => {
    return AUTO_REPLY_TYPES.find(t => t.value === type) || AUTO_REPLY_TYPES[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto-Reply Messages</DialogTitle>
          <DialogDescription>
            Set up automatic responses for your business
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message Type</label>
              <select
                className="w-full h-10 px-3 border rounded-md mt-1"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                {AUTO_REPLY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {getTypeInfo(formData.type).description}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Message *</label>
              <Textarea
                placeholder="Enter your auto-reply message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            {formData.type === 'away' && (
              <div>
                <label className="text-sm font-medium">Schedule (optional)</label>
                <Input
                  placeholder="e.g., Mon-Fri 6PM-9AM, Weekends"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to always send when enabled
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveReply}
                disabled={isSaving || !formData.message.trim()}
              >
                {isSaving ? 'Saving...' : editingReply ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Auto-Reply
            </Button>

            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : autoReplies.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No auto-replies configured yet.</p>
                <div className="space-y-2 text-left">
                  {AUTO_REPLY_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div key={type.value} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {autoReplies.map((reply) => {
                  const typeInfo = getTypeInfo(reply.type);
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg border ${!reply.isEnabled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            reply.type === 'greeting' ? 'bg-green-100' :
                            reply.type === 'away' ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              reply.type === 'greeting' ? 'text-green-600' :
                              reply.type === 'away' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{typeInfo.label}</h4>
                              <Switch
                                checked={reply.isEnabled}
                                onCheckedChange={() => handleToggleReply(reply.id)}
                              />
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {reply.message}
                            </p>
                            {reply.schedule && (
                              <p className="text-xs text-gray-400 mt-1">
                                Schedule: {reply.schedule}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReply(reply)}
                        >
                          <Edit2 className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReply(reply.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
