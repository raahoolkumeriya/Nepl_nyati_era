import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  validateCredentials, 
  createSession, 
  restoreSession, 
  clearSession, 
  hasPermission, 
  getRoleConfig,
  getAllUsers,
  addAuctioneer,
  deleteAuctioneer,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => restoreSession());
  const [usersList, setUsersList] = useState(() => getAllUsers());

  const login = useCallback(async (email, password) => {
    const validUser = validateCredentials(email, password);
    if (!validUser) {
      throw new Error('Invalid email or password');
    }
    const session = createSession(validUser);
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const can = useCallback((permission) => {
    return hasPermission(user, permission);
  }, [user]);

  const refreshUsers = useCallback(() => {
    setUsersList(getAllUsers());
  }, []);

  const handleAddAuctioneer = useCallback(({ name, email, password, role }) => {
    const newUser = addAuctioneer({ name, email, password, role });
    setUsersList(getAllUsers());
    return newUser;
  }, []);

  const handleDeleteAuctioneer = useCallback((emailToDelete) => {
    deleteAuctioneer(emailToDelete);
    setUsersList(getAllUsers());
  }, []);

  const roleConfig = user ? getRoleConfig(user.role) : null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      can, 
      roleConfig, 
      isAuthenticated: !!user,
      usersList,
      refreshUsers,
      addAuctioneer: handleAddAuctioneer,
      deleteAuctioneer: handleDeleteAuctioneer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
