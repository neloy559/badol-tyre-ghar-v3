import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // Sync token with API service
  useEffect(() => {
    if (accessToken) {
      api.setAccessToken(accessToken);
    } else {
      api.setAccessToken(null);
    }
  }, [accessToken]);

  const login = async (phone, password) => {
    try {
      const res = await authApi.post('/auth/login', { phone, password });
      const { accessToken, user: userData } = res.data.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await authApi.post('/auth/refresh');
      const { accessToken } = res.data.data;
      setAccessToken(accessToken);
      
      // If we don't have user info, fetch it
      if (!user) {
        const meRes = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setUser(meRes.data.data);
      }
      return accessToken;
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      return null;
    }
  };

  // Initial check on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshSession();
      } catch (err) {
        console.log('Session initialization failed (guest session).');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Provide a way for the API interceptor to trigger a logout or refresh
  useEffect(() => {
    api.registerAuthHandlers({
      onLogout: logout,
      onRefresh: refreshSession
    });
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    accessToken,
    isAdmin: user?.role === 'admin' || user?.role === 'editor',
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="btg-app-initial-loader">
          <div className="btg-app-initial-loader__content">
            <div className="btg-app-initial-loader__spinner"></div>
            <h2 className="btg-app-initial-loader__title">বাদল টায়ার ঘর</h2>
            <p className="btg-app-initial-loader__subtitle">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
