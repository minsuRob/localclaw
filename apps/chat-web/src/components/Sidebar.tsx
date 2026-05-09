import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatSession } from '../types/chat';
import { cn } from '../lib/utils';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isDarkMode,
  toggleDarkMode,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full w-64 bg-secondary/30 border-r border-border p-4">
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 w-full p-3 mb-6 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium"
      >
        <Plus size={20} />
        {t('new_chat')}
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-10">{t('no_chats')}</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-secondary",
                currentSessionId === session.id ? "bg-secondary ring-1 ring-border" : ""
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={18} className="text-muted-foreground shrink-0" />
                <span className="text-sm truncate font-medium">{session.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-all text-sm font-medium"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          {isDarkMode ? t('light_mode') : t('dark_mode')}
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary transition-all text-sm font-medium"
        >
          <Settings size={18} />
          {t('settings')}
        </button>
      </div>
    </div>
  );
};
