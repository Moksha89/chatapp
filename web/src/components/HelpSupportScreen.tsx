import { useState } from 'react';
import {
  X, HelpCircle, MessageCircle, Mail, ExternalLink, ChevronDown,
  ChevronUp, Search, FileText, Globe,
  Bug, Star, Send
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface HelpSupportScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  { category: 'Getting Started', question: 'How do I create an account?', answer: 'Download Abhi Chat from the app store, enter your phone number, verify with the OTP code sent via SMS, and set up your profile with a display name.' },
  { category: 'Getting Started', question: 'How do I scan a QR code to log in on web?', answer: 'Open abhi.so in your browser, then open Abhi Chat on your phone > Settings > Linked Devices > Link a Device. Point your phone camera at the QR code on screen.' },
  { category: 'Messaging', question: 'Can I send disappearing messages?', answer: 'Yes! Open a chat, tap the chat name at the top, select "Disappearing Messages" and choose a timer (24 hours, 7 days, or 90 days). Messages will auto-delete after the set time.' },
  { category: 'Messaging', question: 'How do I forward or star a message?', answer: 'Long press or right-click any message to see options including Forward, Star, Reply, Copy, and Delete. Starred messages can be found in the chat menu.' },
  { category: 'Privacy', question: 'Are my messages encrypted?', answer: 'Yes, all messages in Abhi Chat are end-to-end encrypted. Only you and the person you\'re communicating with can read your messages. Not even we can access them.' },
  { category: 'Privacy', question: 'How do I block someone?', answer: 'Open the chat with the person, tap their name at the top, scroll down and tap "Block Contact". You can also go to Settings > Privacy > Blocked Users.' },
  { category: 'Calls', question: 'Does Abhi Chat support video calls?', answer: 'Yes! You can make voice and video calls to any Abhi Chat user. Tap the phone or video icon at the top of any chat to start a call.' },
  { category: 'Groups', question: 'How many people can be in a group?', answer: 'Groups can have up to 1024 members. You can also create channels for unlimited subscribers for one-way broadcasting.' },
  { category: 'Account', question: 'How do I change my phone number?', answer: 'Go to Settings > Account > Change Number. You\'ll need to verify both your old and new phone numbers. All your chats and groups will be transferred.' },
  { category: 'Account', question: 'How do I delete my account?', answer: 'Go to Settings > Account > Delete Account. This will permanently delete your account, messages, and data. This action cannot be undone.' },
];

const CATEGORIES = ['All', 'Getting Started', 'Messaging', 'Privacy', 'Calls', 'Groups', 'Account'];

export function HelpSupportScreen({ isOpen, onClose }: HelpSupportScreenProps) {
  const [tab, setTab] = useState<'faq' | 'contact' | 'ticket'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  if (!isOpen) return null;

  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = !searchQuery || faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSubmitted(true);
    setTicketSubject('');
    setTicketMessage('');
    setTimeout(() => setTicketSubmitted(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-[#246BFD]" />
            </div>
            Help & Support
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'faq' as const, label: 'FAQ', icon: <FileText className="h-3.5 w-3.5" /> },
            { key: 'contact' as const, label: 'Contact Us', icon: <MessageCircle className="h-3.5 w-3.5" /> },
            { key: 'ticket' as const, label: 'Support Ticket', icon: <Mail className="h-3.5 w-3.5" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition ${
                tab === t.key ? 'border-[#246BFD] text-[#246BFD]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'faq' ? (
            <div>
              {/* Search */}
              <div className="p-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#F7F8FC] border-0 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Category filters */}
              <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-[#246BFD] text-white'
                        : 'bg-[#F7F8FC] text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* FAQ list */}
              <div className="px-4 pb-4 space-y-2">
                {filteredFaqs.length === 0 ? (
                  <div className="py-8 text-center">
                    <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No results found</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords or browse categories</p>
                  </div>
                ) : (
                  filteredFaqs.map((faq, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-[#F7F8FC] transition"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <HelpCircle className="h-4 w-4 text-[#246BFD] flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                        </div>
                        {expandedFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {expandedFaq === i && (
                        <div className="px-3 pb-3 ml-6">
                          <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] text-gray-400">Was this helpful?</span>
                            <button className="text-xs text-green-600 hover:underline">Yes</button>
                            <button className="text-xs text-red-500 hover:underline">No</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : tab === 'contact' ? (
            <div className="p-4 space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-8 w-8 text-[#246BFD]" />
                </div>
                <h3 className="font-bold text-gray-900">Get in Touch</h3>
                <p className="text-xs text-gray-400 mt-1">We're here to help you 24/7</p>
              </div>

              {/* Contact options */}
              <div className="space-y-2">
                <a href="mailto:support@abhi.so" className="flex items-center gap-3 p-4 bg-[#F7F8FC] rounded-xl hover:bg-gray-100 transition">
                  <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-[#246BFD]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">Email Support</p>
                    <p className="text-xs text-gray-400">support@abhi.so</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>

                <a href="https://abhi.so/help" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[#F7F8FC] rounded-xl hover:bg-gray-100 transition">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">Help Center</p>
                    <p className="text-xs text-gray-400">Browse articles and guides</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>

                <button onClick={() => setTab('ticket')} className="w-full flex items-center gap-3 p-4 bg-[#F7F8FC] rounded-xl hover:bg-gray-100 transition">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Bug className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm text-gray-900">Report a Bug</p>
                    <p className="text-xs text-gray-400">Submit a support ticket</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                </button>
              </div>

              {/* App info */}
              <div className="p-3 bg-[#F7F8FC] rounded-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">App Info</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Version</span>
                    <span className="text-gray-700 font-medium">2.1.0</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Platform</span>
                    <span className="text-gray-700 font-medium">Web</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Support Ticket */
            <div className="p-4 space-y-4">
              {ticketSubmitted ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <Star className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="font-bold text-gray-900">Ticket Submitted!</h3>
                  <p className="text-xs text-gray-400 mt-1">We'll get back to you within 24 hours</p>
                </div>
              ) : (
                <>
                  <div className="text-center py-2">
                    <h3 className="font-bold text-gray-900">Submit a Support Ticket</h3>
                    <p className="text-xs text-gray-400 mt-1">Describe your issue and we'll investigate</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                      Subject
                    </label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Brief description of the issue"
                      className="bg-[#F7F8FC] border-0 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                      Category
                    </label>
                    <select className="w-full bg-[#F7F8FC] border-0 rounded-xl text-sm px-3 py-2.5 text-gray-600 outline-none">
                      <option>Bug Report</option>
                      <option>Feature Request</option>
                      <option>Account Issue</option>
                      <option>Payment</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Please describe your issue in detail. Include steps to reproduce if reporting a bug."
                      className="w-full p-3 bg-[#F7F8FC] border-0 rounded-xl resize-none h-32 text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitTicket}
                    disabled={!ticketSubject.trim() || !ticketMessage.trim()}
                    className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl"
                  >
                    <Send className="w-4 h-4 mr-2" /> Submit Ticket
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="w-full rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
