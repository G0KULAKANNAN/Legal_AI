import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<User | null>;
  register: (data: any) => Promise<void>;
  sendRegisterOtp: (data: any) => Promise<void>;
  verifyRegisterOtp: (data: any) => Promise<User | null>;
  resendRegisterOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data?.success) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.success) {
      setUser(res.data.data.user);
      return res.data.data.user;
    }
    return null;
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    if (res.data?.success) {
      setUser(res.data.data.user);
    }
  };

  const sendRegisterOtp = async (data: any) => {
    await api.post('/auth/send-register-otp', data);
  };

  const verifyRegisterOtp = async (data: any) => {
    const res = await api.post('/auth/verify-register-otp', data);
    if (res.data?.success) {
      setUser(res.data.data.user);
      return res.data.data.user;
    }
    return null;
  };

  const resendRegisterOtp = async (email: string) => {
    await api.post('/auth/resend-register-otp', { email });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        sendRegisterOtp,
        verifyRegisterOtp,
        resendRegisterOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
