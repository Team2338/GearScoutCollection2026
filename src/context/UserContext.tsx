/**
 * User context provider for authentication state management
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { IUser } from '@/model/Models';
import { isValidUser } from '@/model/Models';
import { STORAGE_KEYS } from '@/constants';
import { saveToSessionStorage, getJsonFromSessionStorage, removeFromSessionStorage } from '@/utils/sessionStorage';

interface UserContextValue {
	/** Current authenticated user or null */
	user: IUser | null;
	/** Function to update the current user */
	setUser: (user: IUser | null) => void;
	/** Whether a user is currently authenticated */
	isAuthenticated: boolean;
	/** Function to log out the current user */
	logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
	children: ReactNode;
}

/**
 * Provider component for user authentication context
 * @param props - Component props
 * @returns UserContext provider
 */
export function UserProvider({ children }: UserProviderProps): JSX.Element {
  const [user, setUserState] = useState<IUser | null>(() => {
    try {
      const parsed = getJsonFromSessionStorage<IUser>(STORAGE_KEYS.CURRENT_USER);
      return (parsed && isValidUser(parsed)) ? parsed : null;
    } catch (error) {
      console.error('Error loading user from storage:', error);
      return null;
    }
  });

  const setUser = useCallback((newUser: IUser | null) => {
    setUserState(newUser);
    if (newUser) {
      saveToSessionStorage(STORAGE_KEYS.CURRENT_USER, newUser);
    } else {
      removeFromSessionStorage(STORAGE_KEYS.CURRENT_USER);
    }
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    removeFromSessionStorage(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const isAuthenticated = user !== null;

  return (
    <UserContext.Provider value={{ user, setUser, isAuthenticated, logout }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access user context
 * @throws Error if used outside of UserProvider
 * @returns User context value with current user and auth methods
 */
export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
