import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import {
  Plus, Trash2, Edit2, MessageSquare, Clock, Zap, Bot, ArrowRight,
  Calendar, Hash, AlertCircle, CheckCircle2, Settings
} from 'lucide-react';

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

interface ChatbotRule {
  trigger: string;
  response: string;
  matchType: 'exact' | 'contains' | 'regex';
}

const AUTO_REPLY_TYPES = [
  { value: 'greeting', label: 'Greeting Message', icon: MessageSquare, description: 'Sent when someone messages you for the first time', color: 'green' },
  { value: 'away', label: 'Away Message', icon: Clock, description: 'Sent when you are unavailable or outside business hours', color: 'orange' },
  { value: 'quick_reply', label: 'Quick Reply', icon: Zap, description: 'Auto-response triggered by keywords in messages', color: 'blue' },
];

const SCHEDULE_PRESETS = [
  { label: 'Always', value: '' },
  { label: 'Outside business hours', value: 'Mon-Fri 6PM-9AM, Sat-Sun' },
  { label: 'Weekends only', value: 'Sat-Sun' },
  { label: 'Evenings', value: 'Daily 6PM-9AM' },
  { label: 'Custom', value: 'custom' },
];

export function AutoReplySettings({ isOpen, onClose }: AutoReplySettingsProps) {
  useAuth();
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReply, setEditingReply] = useState<AutoReply | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<'replies' | 'chatbot' | 'templates'>('replies');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    type: 'greeting' as 'greeting' | 'away' | 'quick_reply',
    message: '',
    schedule: '',
    customSchedule: '',
    triggerKeywords: '',
  });

  // Chatbot state
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotRules, setChatbotRules] = useState<ChatbotRule[]>([
    { trigger: '', response: '', matchType: 'contains' },
  ]);

  // Message templates
  const [templates] = useState([
    { name: 'Welcome', content: 'Welcome to our business! How can we help you today?', category: 'Greeting' },
    { name: 'Order Confirmation', content: 'Thank you for your order! Your order #{order_id} has been confirmed. We will update you on the delivery status.', category: 'Order' },
    { name: 'Appointment Reminder', content: 'Reminder: You have an appointment scheduled for {date} at {time}. Reply YES to confirm or NO to reschedule.', category: 'Reminder' },
    { name: 'Payment Received', content: 'Payment of {amount} received. Thank you! Your receipt number is #{receipt_id}.', category: 'Payment' },
    { name: 'Shipping Update', content: 'Your order #{order_id} has been shipped! Track your delivery: {tracking_link}', category: 'Shipping' },
    { name: 'Feedback Request', content: 'How was your experience? Please rate us from 1-5 stars. Your feedback helps us improve!', category: 'Feedback' },
  ]);

  useEffect(() => {
    if (isOpen) { loadAutoReplies(); }
  }, [isOpen]);

  const loadAutoReplies = async () => {
    setIsLoading(true);
    try {
      const replies = await api.getAutoReplies();
      setAutoReplies(replies);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ type: 'greeting', message: '', schedule: '', customSchedule: '', triggerKeywords: '' });
    setEditingReply(null);
    setShowForm(false);
  };

  const handleEditReply = (reply: AutoReply) => {
    setEditingReply(reply);
    setFormData({
      type: reply.type, message: reply.message,
      schedule: reply.schedule || '', customSchedule: '',
      triggerKeywords: '',
    });
    setShowForm(true);
  };

  const handleSaveReply = async () => {
    if (!formData.message.trim()) return;
    setIsSaving(true);
    try {
      const schedule = formData.schedule === 'custom' ? formData.customSchedule : formData.schedule;
      const replyData = {
        type: formData.type,
        message: formData.message,
        schedule: formData.type === 'away' && schedule ? schedule : null,
      };
      if (editingReply) {
        await api.updateAutoReply(editingReply.id, replyData);
      } else {
        await api.createAutoReply(replyData);
      }
      resetForm();
      loadAutoReplies();
      setMessage({ type: 'success', text: 'Auto-reply saved!' });
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Delete this auto-reply?')) return;
    try {
      await api.deleteAutoReply(replyId);
      loadAutoReplies();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleToggleReply = async (replyId: string) => {
    try {
      await api.toggleAutoReply(replyId);
      loadAutoReplies();
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const addChatbotRule = () => {
    setChatbotRules([...chatbotRules, { trigger: '', response: '', matchType: 'contains' }]);
  };

  const removeChatbotRule = (index: number) => {
    setChatbotRules(chatbotRules.filter((_, i) => i !== index));
  };

  const updateChatbotRule = (index: number, field: keyof ChatbotRule, value: string) => {
    const updated = [...chatbotRules];
    updated[index] = { ...updated[index], [field]: value };
    setChatbotRules(updated);
  };

  const getTypeInfo = (type: string) => AUTO_REPLY_TYPES.find(t => t.value === type) || AUTO_REPLY_TYPES[0];

  const applyTemplate = (content: string) => {
    setFormData({ ...formData, message: content, type: 'quick_reply' });
    setTab('replies');
    setShowForm(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#246BFD]" />
            Auto-Replies & Chatbot
          </DialogTitle>
          <DialogDescription>Automate responses for your business</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-3">
          {[
            { id: 'replies' as const, label: 'Auto-Replies', icon: MessageSquare },
            { id: 'chatbot' as const, label: 'Chatbot', icon: Bot },
            { id: 'templates' as const, label: 'Templates', icon: Hash },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                tab === t.id ? 'text-[#246BFD] border-[#246BFD]' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mx-4 mt-2 p-2 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {/* AUTO-REPLIES TAB */}
          {tab === 'replies' && (
            <>
              {showForm ? (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {AUTO_REPLY_TYPES.map(type => (
                        <button key={type.value} onClick={() => setFormData({ ...formData, type: type.value as typeof formData.type })}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            formData.type === type.value ? 'border-[#246BFD] bg-[#246BFD]/5' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <type.icon className={`w-5 h-5 mx-auto mb-1 ${formData.type === type.value ? 'text-[#246BFD]' : 'text-gray-400'}`} />
                          <p className="text-[10px] font-medium">{type.label}</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{getTypeInfo(formData.type).description}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Message *</label>
                    <Textarea placeholder="Enter your auto-reply message..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="rounded-xl min-h-[100px]" />
                    <p className="text-[10px] text-gray-400 mt-1">Supports variables: {'{name}'}, {'{business}'}, {'{time}'}</p>
                  </div>

                  {formData.type === 'quick_reply' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Trigger Keywords</label>
                      <Input placeholder="e.g., price, hours, hello (comma-separated)" value={formData.triggerKeywords} onChange={(e) => setFormData({ ...formData, triggerKeywords: e.target.value })} className="rounded-xl" />
                    </div>
                  )}

                  {formData.type === 'away' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#246BFD]" /> Schedule
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {SCHEDULE_PRESETS.map(p => (
                          <button key={p.label} onClick={() => setFormData({ ...formData, schedule: p.value })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                              formData.schedule === p.value ? 'bg-[#246BFD] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {formData.schedule === 'custom' && (
                        <Input placeholder="e.g., Mon-Fri 6PM-9AM" value={formData.customSchedule} onChange={(e) => setFormData({ ...formData, customSchedule: e.target.value })} className="rounded-xl" />
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={resetForm}>Cancel</Button>
                    <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={handleSaveReply} disabled={isSaving || !formData.message.trim()}>
                      {isSaving ? 'Saving...' : editingReply ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  <Button className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Auto-Reply
                  </Button>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#246BFD]" />
                    </div>
                  ) : autoReplies.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No auto-replies yet</p>
                      <div className="space-y-1.5 text-left mt-4">
                        {AUTO_REPLY_TYPES.map(type => (
                          <div key={type.value} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                            <type.icon className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium">{type.label}</p>
                              <p className="text-[10px] text-gray-400">{type.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {autoReplies.map(reply => {
                        const typeInfo = getTypeInfo(reply.type);
                        const Icon = typeInfo.icon;
                        return (
                          <div key={reply.id} className={`p-3 rounded-xl border ${!reply.isEnabled ? 'opacity-50' : ''} hover:border-[#246BFD]/30 transition-colors`}>
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                typeInfo.color === 'green' ? 'bg-green-100' : typeInfo.color === 'orange' ? 'bg-orange-100' : 'bg-blue-100'
                              }`}>
                                <Icon className={`h-4 w-4 ${
                                  typeInfo.color === 'green' ? 'text-green-600' : typeInfo.color === 'orange' ? 'text-orange-600' : 'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-medium">{typeInfo.label}</h4>
                                  <Switch checked={reply.isEnabled} onCheckedChange={() => handleToggleReply(reply.id)} />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{reply.message}</p>
                                {reply.schedule && (
                                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {reply.schedule}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 flex-shrink-0">
                                <button onClick={() => handleEditReply(reply)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                  <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                </button>
                                <button onClick={() => handleDeleteReply(reply.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* CHATBOT TAB */}
          {tab === 'chatbot' && (
            <div className="space-y-4 mt-3">
              <div className="flex items-center justify-between p-3 bg-[#246BFD]/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#246BFD]" />
                  <div>
                    <p className="text-sm font-medium">Chatbot</p>
                    <p className="text-[10px] text-gray-400">Auto-respond based on keyword triggers</p>
                  </div>
                </div>
                <Switch checked={chatbotEnabled} onCheckedChange={setChatbotEnabled} />
              </div>

              {chatbotEnabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">Flow Rules</p>
                      <button onClick={addChatbotRule} className="text-[10px] text-[#246BFD] font-medium hover:underline">+ Add Rule</button>
                    </div>
                    {chatbotRules.map((rule, index) => (
                      <div key={index} className="p-3 border rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-gray-400 w-5">#{index + 1}</span>
                          <select value={rule.matchType} onChange={(e) => updateChatbotRule(index, 'matchType', e.target.value)}
                            className="text-[10px] px-2 py-1 bg-gray-50 border rounded-lg">
                            <option value="contains">Contains</option>
                            <option value="exact">Exact match</option>
                            <option value="regex">Regex</option>
                          </select>
                          {chatbotRules.length > 1 && (
                            <button onClick={() => removeChatbotRule(index)} className="ml-auto p-1 hover:bg-red-50 rounded">
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input placeholder='Trigger: "price", "hours"...' value={rule.trigger} onChange={(e) => updateChatbotRule(index, 'trigger', e.target.value)} className="flex-1 rounded-lg text-xs h-8" />
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <Input placeholder="Response message" value={rule.response} onChange={(e) => updateChatbotRule(index, 'response', e.target.value)} className="flex-1 rounded-lg text-xs h-8" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => {
                    const validRules = chatbotRules.filter(r => r.trigger && r.response);
                    if (validRules.length > 0) {
                      setMessage({ type: 'success', text: `Chatbot saved with ${validRules.length} rules` });
                    }
                  }}>
                    <Settings className="w-4 h-4 mr-2" /> Save Chatbot Rules
                  </Button>
                </>
              )}

              {!chatbotEnabled && (
                <div className="text-center py-6">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Chatbot is disabled</p>
                  <p className="text-[10px] text-gray-400">Enable to auto-respond based on keyword triggers</p>
                </div>
              )}
            </div>
          )}

          {/* TEMPLATES TAB */}
          {tab === 'templates' && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-gray-500 mb-2">Pre-built message templates for common scenarios. Click to use as auto-reply.</p>
              {templates.map((template, i) => (
                <div key={i} className="p-3 border rounded-xl hover:border-[#246BFD]/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800">{template.name}</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] text-gray-500">{template.category}</span>
                    </div>
                    <button onClick={() => applyTemplate(template.content)} className="text-[10px] text-[#246BFD] font-medium hover:underline">Use</button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{template.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
