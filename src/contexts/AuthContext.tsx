import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserCredential, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../utils/firebase';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  loading: boolean;
  createTestUser: (email: string, password: string) => Promise<UserCredential>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AuthProvider: Auth state changed', user);
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<UserCredential> => {
    console.log('AuthProvider: Attempting login', email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Login successful', result.user);
      return result;
    } catch (error) {
      console.error('AuthProvider: Login error', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('AuthProvider: Attempting logout');
    try {
      await signOut(auth);
      console.log('AuthProvider: Logout successful');
    } catch (error) {
      console.error('AuthProvider: Logout error', error);
      throw error;
    }
  };

  const createTestUser = async (email: string, password: string): Promise<UserCredential> => {
    console.log('AuthProvider: Creating test user', email);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Test user created successfully', result.user);
      return result;
    } catch (error) {
      console.error('AuthProvider: Error creating test user', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    loading,
    createTestUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;