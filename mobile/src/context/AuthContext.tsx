import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { setCredentials, setLoading, clearAuth } from '../features/auth/authSlice';
import { store } from '../store/store';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoadingState] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('@auth_token');
      const u = await AsyncStorage.getItem('@auth_user');
      if (t && u) {
        const parsed = JSON.parse(u) as User;
        setToken(t);
        setUser(parsed);
        store.dispatch(setCredentials({ token: t, user: parsed }));
      }
      setLoadingState(false);
      store.dispatch(setLoading(false));
    })();
  }, []);

  const login = async (t: string, u: User) => {
    await AsyncStorage.setItem('@auth_token', t);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    store.dispatch(setCredentials({ token: t, user: u }));
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@auth_user');
    setToken(null);
    setUser(null);
    store.dispatch(clearAuth());
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);