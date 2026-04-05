import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { I18nProvider } from './i18n/I18nContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';

// Lazy load heavy components for faster initial load
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const ChatSidebar = lazy(() => import('./components/ChatSidebar').then(m => ({ default: m.ChatSidebar })));
const ChatArea = lazy(() => import('./components/ChatArea').then(m => ({ default: m.ChatArea })));
const CallDialog = lazy(() => import('./components/CallDialog').then(m => ({ default: m.CallDialog })));
const AdminPanel = lazy(() => import('./admin/AdminPanel'));

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
      <div className="h-screen flex flex-col bg-[#F7F8FC]">
        <Suspense fallback={<LoadingSpinner />}>
          {activeChat ? (
            <ChatArea />
          ) : (
            <ChatSidebar />
          )}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#F7F8FC]">
      <Suspense fallback={<LoadingSpinner />}>
        <ChatSidebar />
        <ChatArea />
      </Suspense>
    </div>
  );
}

function ChatApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#246BFD] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <ChatProvider>
      <CallProvider>
        <ConnectionStatus />
        <Suspense fallback={null}>
          <CallDialog />
        </Suspense>
        <ResponsiveLayout />
      </CallProvider>
    </ChatProvider>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F7F8FC]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#246BFD] mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  // Check if we're on the /admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <AdminPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <I18nProvider>
          <AuthProvider>
            <ChatApp />
          </AuthProvider>
        </I18nProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
