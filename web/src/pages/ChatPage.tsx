import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'
import { ArrowLeft, Send, Phone, Video, User, Check, CheckCheck } from 'lucide-react'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  type: string
  status: string
  createdAt: string
}

interface OtherUser {
  id: string
  phone: string
  displayName: string
  profilePhoto: string | null
  isOnline: boolean
  lastSeen: string | null
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load chat data
  useEffect(() => {
    if (!chatId) return

    const loadChat = async () => {
      try {
        const [chats, msgs] = await Promise.all([
          api.getChats(),
          api.getMessages(chatId),
        ])
        const thisChat = chats.find((c: any) => c.id === chatId)
        if (thisChat?.otherUser) setOtherUser(thisChat.otherUser)
        setMessages(msgs)
        api.markRead(chatId).catch(() => {})
      } catch (e) {
        console.error('Failed to load chat:', e)
      } finally {
        setLoading(false)
      }
    }

    loadChat()
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Socket events
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !chatId) return

    const handleNewMessage = (msg: Message) => {
      if (msg.chatId === chatId) {
        setMessages((prev) => {
          // Deduplicate: skip if message ID already exists or matches a temp message
          if (prev.some((m) => m.id === msg.id)) return prev
          // Replace optimistic temp message if tempId matches
          const tempIdx = prev.findIndex((m) => m.id.startsWith('temp-') && msg.senderId === user?.id)
          if (tempIdx >= 0 && msg.senderId === user?.id) {
            const updated = [...prev]
            updated[tempIdx] = msg
            return updated
          }
          return [...prev, msg]
        })
        api.markRead(chatId).catch(() => {})
        socket.emit('message:read', { chatId })
      }
    }

    const handleTypingStart = (data: { chatId: string; userId: string }) => {
      if (data.chatId === chatId && data.userId !== user?.id) {
        setTyping(true)
      }
    }

    const handleTypingStop = (data: { chatId: string; userId: string }) => {
      if (data.chatId === chatId && data.userId !== user?.id) {
        setTyping(false)
      }
    }

    const handleStatusUpdate = (data: { messageId: string; status: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
      )
    }

    const handleRead = (data: { chatId: string; readBy?: string }) => {
      if (data.chatId === chatId) {
        // Only mark MY sent messages as 'read' (not received messages)
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id ? { ...m, status: 'read' } : m
          )
        )
      }
    }

    socket.on('message:new', handleNewMessage)
    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop', handleTypingStop)
    socket.on('message:status', handleStatusUpdate)
    socket.on('message:read', handleRead)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop', handleTypingStop)
      socket.off('message:status', handleStatusUpdate)
      socket.off('message:read', handleRead)
    }
  }, [chatId, user?.id])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !chatId) return

    const socket = getSocket()
    if (!socket) return

    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      chatId,
      senderId: user!.id,
      content: text,
      type: 'text',
      status: 'sending',
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMsg])
    setInput('')

    socket.emit('message:send', { chatId, content: text, tempId }, (response: any) => {
      if (response?.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...response.message, tempId } : m))
        )
      }
    })

    socket.emit('typing:stop', { chatId })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    const socket = getSocket()
    if (!socket || !chatId) return

    socket.emit('typing:start', { chatId })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId })
    }, 2000)
  }

  const initiateCall = (type: 'audio' | 'video') => {
    const socket = getSocket()
    if (!socket || !otherUser) return

    // Dispatch custom event for CallDialog to pick up
    window.dispatchEvent(
      new CustomEvent('call:start', {
        detail: { targetUserId: otherUser.id, callType: type, targetUser: otherUser },
      })
    )
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderStatus = (status: string, isMine: boolean) => {
    if (!isMine) return null
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 border border-blue-200 rounded-full" />
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-blue-200" />
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center gap-3 shrink-0 shadow-md">
        <button onClick={() => navigate('/')} className="p-1.5 hover:bg-blue-700 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center ring-2 ring-blue-300">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {otherUser?.displayName || otherUser?.phone || 'Chat'}
          </h2>
          <p className="text-xs text-blue-100">
            {typing ? 'typing...' : otherUser?.isOnline ? 'online' : otherUser?.lastSeen ? `last seen ${new Date(otherUser.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'offline'}
          </p>
        </div>
        <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-blue-700 rounded-full">
          <Phone className="w-5 h-5" />
        </button>
        <button onClick={() => initiateCall('video')} className="p-2 hover:bg-blue-700 rounded-full">
          <Video className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col min-h-0" style={{ backgroundColor: '#ECE5DD', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d5cec5\' fill-opacity=\'0.25\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        <div className="mt-auto space-y-1">
          {messages.map((msg) => {
            const isMine = msg.senderId === user?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {renderStatus(msg.status, isMine)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
