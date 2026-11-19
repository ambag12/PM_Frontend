import React, { createContext, useCallback, useEffect, useState } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

// Keep only the user fields the UI needs (the auth payload also carries tokens).
const pickUser = (d) => ({
  id: d.id,
  username: d.username,
  full_name: d.full_name || d.full_name_display,
  full_name_display: d.full_name_display,
  email: d.email,
  photo: d.photo,
  big_photo: d.big_photo,
  bio: d.bio,
  lang: d.lang,
  timezone: d.timezone,
  is_superuser: d.is_superuser,
  roles: d.roles,
  date_joined: d.date_joined,
});

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => (localStorage.getItem('authToken') ? readStoredUser() : null));
  const [loading, setLoading] = useState(false);

  const persist = (u) => {
    setUser(u);
    localStorage.setItem('authUser', JSON.stringify(u));
  };

  // Refresh the profile from the API (also validates the token; a 401 logs out via the client interceptor).
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return null;
    try {
      const res = await client.get('users/me');
      const u = pickUser(res.data);
      persist(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (token) refreshUser();
  }, [token, refreshUser]);

  const startSession = (data) => {
    localStorage.setItem('authToken', data.auth_token);
    if (data.refresh) localStorage.setItem('authRefresh', data.refresh);
    setToken(data.auth_token);
    persist(pickUser(data));
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await client.post('auth', { type: 'normal', username, password });
      startSession(response.data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await client.post('auth/register', { type: 'public', accepted_terms: true, ...userData });
      startSession(response.data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authRefresh');
    localStorage.removeItem('authUser');
  };

  // Update local copy after profile edits
  const updateUser = (fields) => persist({ ...(user || {}), ...fields });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
