import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePhoto?: string;
  status?: string;
  isBusiness: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  login: (phoneNumber: string, otp: string) => Promise<void>;
  loginWithToken: (accessToken: string, refreshToken: string, userData: User) => void;
  register: (phoneNumber: string, otp: string, displayName: string, isBusiness?: boolean) => Promise<void>;
  logout: () => void;
  sendOtp: (phoneNumber: string) => Promise<{ otp?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'web-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.setAccessToken(token);
      api.getMe()
        .then((userData) => {
          setUser(userData as User);
          socketService.connect(token);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          api.setAccessToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const sendOtp = async (phoneNumber: string) => {
    const response = await api.sendOtp(phoneNumber);
    return { otp: response.otp };
  };

  const login = async (phoneNumber: string, otp: string) => {
    const deviceId = generateDeviceId();
    const response = await api.login({
      phoneNumber,
      otp,
      deviceId,
      deviceName: 'Web Browser',
      deviceType: 'web',
    });

    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    api.setAccessToken(response.accessToken);
    
    const userData = await api.getMe();
    setUser(userData as User);
    socketService.connect(response.accessToken);
  };

  const register = async (phoneNumber: string, otp: string, displayName: string, isBusiness = false) => {
    const deviceId = generateDeviceId();
    const response = await api.register({
      phoneNumber,
      otp,
      displayName,
      deviceId,
      deviceName: 'Web Browser',
      deviceType: 'web',
      isBusiness,
    });

    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    api.setAccessToken(response.accessToken);
    
    const userData = await api.getMe();
    setUser(userData as User);
    socketService.connect(response.accessToken);
  };

    const loginWithToken = (accessToken: string, refreshToken: string, userData: User) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      api.setAccessToken(accessToken);
      setUser(userData);
      socketService.connect(accessToken);
    };

    const logout = () => {
      api.logout().catch(console.error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      api.setAccessToken(null);
      socketService.disconnect();
      setUser(null);
    };

    return (
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          isLoading,
          deviceId,
          login,
          loginWithToken,
          register,
          logout,
          sendOtp,
        }}
      >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
