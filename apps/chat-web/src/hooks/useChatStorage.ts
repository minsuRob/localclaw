import { useState, useEffect } from 'react';
import { ChatSession, Message } from '../types/chat';

const STORAGE_KEY = 'openclaw_chat_sessions';

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const updateSessionMessages = (sessionId: string, messages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const firstUserMsg = messages.find(m => m.role === 'user')?.content;
        return {
          ...s,
          messages,
          title: firstUserMsg ? firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '') : s.title,
          updatedAt: Date.now(),
        };
      }
      return s;
    }));
  };

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    updateSessionMessages,
    currentSession: sessions.find(s => s.id === currentSessionId),
  };
}
