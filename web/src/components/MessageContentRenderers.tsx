import { BarChart3, MapPin, User } from 'lucide-react';
import { api } from '../services/api';

// Formatting utilities extracted from ChatArea
export function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function shouldShowDateSeparator(index: number, msgs: Array<{ createdAt: string }>): boolean {
  if (index === 0) return true;
  const curr = new Date(msgs[index].createdAt).toDateString();
  const prev = new Date(msgs[index - 1].createdAt).toDateString();
  return curr !== prev;
}

// Render poll content
export function renderPollContent(message: { id?: string; content?: string; chatId?: string }) {
  try {
    const poll = JSON.parse(message.content || '{}');
    const totalVotes = poll.options?.reduce((sum: number, opt: { votes: number }) => sum + (opt.votes || 0), 0) || 0;
    return (
      <div className="min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-[#246BFD]" />
          <span className="font-medium text-sm">{poll.question}</span>
        </div>
        {poll.options?.map((opt: { text: string; votes: number; voters?: string[] }, i: number) => {
          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
          return (
            <div key={i} className="mb-1.5">
              <button
                className="w-full text-left hover:bg-[#246BFD]/5 rounded px-1 py-0.5 transition-colors"
                onClick={() => {
                  if (message.id && message.chatId) {
                    api.votePoll(message.chatId, message.id, i).catch(() => {});
                  }
                }}
              >
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span>{opt.text}</span>
                  <span>{opt.votes || 0} {totalVotes > 0 ? `(${pct}%)` : ''}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div className="h-full bg-[#246BFD] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </button>
            </div>
          );
        })}
        {totalVotes > 0 && <p className="text-[10px] text-gray-400 mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>}
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}

// Render location content
export function renderLocationContent(message: { content?: string }) {
  try {
    const loc = JSON.parse(message.content || '{}');
    return (
      <div className="min-w-[200px]">
        <div className="bg-[#E8F0FE] rounded-xl p-3 flex items-center gap-2">
          <MapPin className="h-6 w-6 text-red-500" />
          <div>
            <p className="text-sm font-medium">{loc.name || 'Location'}</p>
            <p className="text-xs text-gray-500">{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</p>
          </div>
        </div>
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}

// Render contact card
export function renderContactCardContent(message: { content?: string }) {
  try {
    const contact = JSON.parse(message.content || '{}');
    return (
      <div className="min-w-[200px]">
        <div className="bg-[#E8F0FE] rounded-xl p-3 flex items-center gap-2">
          <User className="h-6 w-6 text-[#246BFD]" />
          <div>
            <p className="text-sm font-medium">{contact.name || 'Contact'}</p>
            <p className="text-xs text-gray-500">{contact.phoneNumber || ''}</p>
          </div>
        </div>
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}
