import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  user: any;
  login: (access: string, refresh: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('access_token'));
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // On mount or when token changes, check if token exists and fetch user
  useEffect(() => {
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await apiClient.get('/auth/me/');
      setUser(res);
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    }
  };

  const login = (access: string, refresh: string) => {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
    setToken(access);
    navigate('/');
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, user, login, logout }}>
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
