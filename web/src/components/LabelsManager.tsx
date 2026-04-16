import { useState, useEffect } from 'react';
import { X, Plus, Tag, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
  chatLabels?: Label[];
  onLabelsChange?: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000',
  '#246BFD', '#06b6d4', '#d946ef', '#f43f5e', '#84cc16'
];

export function LabelsManager({ isOpen, onClose, chatId, chatLabels = [], onLabelsChange }: LabelsManagerProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLabels();
    }
  }, [isOpen]);

  const loadLabels = async () => {
    try {
      const data = await api.getLabels();
      setLabels(data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setLoading(true);
    try {
      await api.createLabel({ name: newLabelName.trim(), color: newLabelColor });
      setNewLabelName('');
      setNewLabelColor(PRESET_COLORS[0]);
      await loadLabels();
    } catch (error) {
      console.error('Failed to create label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel || !editingLabel.name.trim()) return;
    setLoading(true);
    try {
      await api.updateLabel(editingLabel.id, { name: editingLabel.name, color: editingLabel.color });
      setEditingLabel(null);
      await loadLabels();
    } catch (error) {
      console.error('Failed to update label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return;
    setLoading(true);
    try {
      await api.deleteLabel(labelId);
      await loadLabels();
      onLabelsChange?.();
    } catch (error) {
      console.error('Failed to delete label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChatLabel = async (label: Label) => {
    if (!chatId) return;
    setLoading(true);
    try {
      const isAssigned = chatLabels.some(cl => cl.id === label.id);
      if (isAssigned) {
        await api.removeLabelFromChat(chatId, label.id);
      } else {
        await api.assignLabelsToChat(chatId, [label.id]);
      }
      onLabelsChange?.();
    } catch (error) {
      console.error('Failed to toggle label:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {chatId ? 'Manage Chat Labels' : 'Labels'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Create New Label</h3>
            <div className="flex gap-2 mb-2">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="flex-1"
              />
              <Button onClick={handleCreateLabel} disabled={loading || !newLabelName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewLabelColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${newLabelColor === color ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Your Labels</h3>
            {labels.length === 0 ? (
              <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-2">No labels yet</p>
                        <p className="text-[10px] text-gray-400">Labels help you organize chats by category, priority, or status</p>
                      </div>
            ) : (
              labels.map(label => (
                <div key={label.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                  {editingLabel?.id === label.id ? (
                    <>
                      <Input
                        value={editingLabel.name}
                        onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                        className="flex-1 h-8"
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingLabel({ ...editingLabel, color })}
                            className={`w-5 h-5 rounded-full border ${editingLabel.color === color ? 'border-gray-800' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <Button size="sm" onClick={handleUpdateLabel} disabled={loading}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingLabel(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      {chatId && (
                        <input
                          type="checkbox"
                          checked={chatLabels.some(cl => cl.id === label.id)}
                          onChange={() => handleToggleChatLabel(label)}
                          disabled={loading}
                          className="w-4 h-4"
                        />
                      )}
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1">{label.name}</span>
                      <button
                        onClick={() => setEditingLabel(label)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
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
