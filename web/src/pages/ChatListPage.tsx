import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'
import { MessageCircle, Search, LogOut, Plus, User } from 'lucide-react'

interface ChatItem {
  id: string
  otherUser: {
    id: string
    phone: string
    displayName: string
    profilePhoto: string | null
    isOnline: boolean
    lastSeen: string | null
  } | null
  lastMessage: {
    content: string
    senderId: string
    createdAt: string
    type: string
  } | null
  unreadCount: number
}

export default function ChatListPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchPhone, setSearchPhone] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadChats = useCallback(async () => {
    try {
      const data = await api.getChats()
      setChats(data)
    } catch (e) {
      console.error('Failed to load chats:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Listen for new messages to update chat list
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = () => {
      loadChats()
    }

    socket.on('message:new', handleNewMessage)
    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [loadChats])

  const handleSearch = async () => {
    if (!searchPhone.trim()) return
    setSearching(true)
    setHasSearched(false)
    try {
      const results = await api.searchUsers(searchPhone)
      setSearchResults(results.filter((u: any) => u.id !== user?.id))
      setHasSearched(true)
    } catch {
      setHasSearched(true)
    } finally {
      setSearching(false)
    }
  }

  const startChat = async (otherUserId: string) => {
    try {
      const { chatId } = await api.createChat(otherUserId)
      setShowNewChat(false)
      navigate(`/chat/${chatId}`)
    } catch (e: any) {
      console.error('Failed to create chat:', e)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filteredChats = chats.filter((c) => {
    if (!search) return true
    return c.otherUser?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
           c.otherUser?.phone?.includes(search)
  })

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6" />
          <h1 className="text-lg font-semibold">ChatApp</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-blue-700 rounded-full transition"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-blue-700 rounded-full transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-gray-50">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No chats yet</p>
            <p className="text-sm mt-1">Tap + to start a new conversation</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                {chat.otherUser?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-gray-900 truncate">
                    {chat.otherUser?.displayName || chat.otherUser?.phone || 'Unknown'}
                  </span>
                  {chat.lastMessage && (
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {formatTime(chat.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-2 shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold mb-4">New Chat</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Search by phone number"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
              >
                Search
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChat(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{u.displayName || u.phone}</div>
                    <div className="text-xs text-gray-500">{u.phone}</div>
                  </div>
                </button>
              ))}
              {searching && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              )}
              {!searching && hasSearched && searchResults.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No users found</p>
              )}
            </div>
            <button
              onClick={() => { setShowNewChat(false); setSearchResults([]); setSearchPhone(''); setHasSearched(false) }}
              className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
