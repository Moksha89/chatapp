'use client';

import { useState, useEffect } from 'react';
import LandingPage from '@/components/LandingPage';
import LoginPage from '@/components/LoginPage';
import ChatApp from '@/components/ChatApp';
import api from '@/lib/api';
import socketService from '@/lib/socket';

export default function Home() {
  const [view, setView] = useState<'landing' | 'login' | 'chat'>('landing');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setView('chat');
        socketService.connect(token);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any, token: string, refreshToken: string) => {
    api.setToken(token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setView('chat');
    socketService.connect(token);
  };

  const handleLogout = () => {
    api.clearToken();
    socketService.disconnect();
    setUser(null);
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading Abhi Chat...</p>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onOpenWebApp={() => setView('login')} />;
  }

  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <ChatApp user={user} onLogout={handleLogout} />;
}
