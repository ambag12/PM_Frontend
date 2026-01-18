import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Ideally, verify token or fetch user profile here
      // For now, we assume token is valid or handle 401 in interceptors
      // Fetching user details could be done here if there's a /users/me endpoint
      // Based on api.py, we might need to check how to get current user.
      // Usually /users/me or similar.
      // Let's try to fetch self if possible, or just set user state if we stored it.
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await client.post('auth', {
        type: 'normal',
        username,
        password,
      });
      
      const { auth_token, id, username: apiUsername, full_name } = response.data;
      
      const userData = { id, username: apiUsername, full_name };
      
      setToken(auth_token);
      setUser(userData);
      
      localStorage.setItem('authToken', auth_token);
      localStorage.setItem('authUser', JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const register = async (userData) => {
      try {
          const response = await client.post('auth/register', {
              type: 'public',
              ...userData
          });
          const { auth_token, id, username: apiUsername, full_name } = response.data;
          const userObj = { id, username: apiUsername, full_name };
          
          setToken(auth_token);
          setUser(userObj);
          
          localStorage.setItem('authToken', auth_token);
          localStorage.setItem('authUser', JSON.stringify(userObj));
          return true;
      } catch (error) {
          console.error("Registration failed", error);
          throw error;
      }
  }

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
