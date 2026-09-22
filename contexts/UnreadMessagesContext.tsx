import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  fetchConversations,
  subscribeToConversationChanges,
} from '../lib/messagesApi';

interface UnreadMessagesContextValue {
  unreadCount: number;
  refresh: () => void;
}

const UnreadMessagesContext = createContext<
  UnreadMessagesContextValue | undefined
>(undefined);

export function UnreadMessagesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refresh = useCallback(() => {
    if (!session) return;
    fetchConversations()
      .then(data => {
        setUnreadCount(
          data.reduce(
            (sum, conversation) => sum + conversation.unread_count,
            0,
          ),
        );
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }

    refresh();
    const unsubscribe = subscribeToConversationChanges(refresh);
    return unsubscribe;
  }, [session, refresh]);

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages(): UnreadMessagesContextValue {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    throw new Error(
      'useUnreadMessages must be used within UnreadMessagesProvider',
    );
  }
  return ctx;
}
