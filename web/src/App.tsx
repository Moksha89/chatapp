import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { LoginPage } from './components/LoginPage';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatArea } from './components/ChatArea';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';
import { CallDialog } from './components/CallDialog';

function ResponsiveLayout() {
  const { activeChat } = useChat();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-100">
        {activeChat ? (
          <ChatArea />
        ) : (
          <ChatSidebar />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <ChatSidebar />
      <ChatArea />
    </div>
  );
}

function ChatApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ChatProvider>
      <CallProvider>
        <ConnectionStatus />
        <CallDialog />
        <ResponsiveLayout />
      </CallProvider>
    </ChatProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ChatApp />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
