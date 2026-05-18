import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { MCPTools } from './components/MCPTools';
import { SettingsModal } from './components/SettingsModal';
import { useChatStorage } from './hooks/useChatStorage';
import { useOpenClaw } from './hooks/useOpenClaw';
import type { Message, OpenClawConfig } from './types/chat';
import './i18n';

const CONFIG_STORAGE_KEY = 'openclaw_config';
const DEFAULT_BASE_URL = 'https://robertlee-macbookpro.tail15c8bb.ts.net/v1';
const LEGACY_BASE_URLS = new Set([
  'http://localhost:18789/v1',
  'http://127.0.0.1:18789/v1',
  'http://host.docker.internal:18789/v1',
]);

function normalizeBaseURL(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return DEFAULT_BASE_URL;

  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, '');
    if (path.endsWith('/v1')) {
      return `${url.origin}${path}`;
    }

    return `${url.origin}/v1`;
  } catch {
    return trimmed;
  }
}

function normalizeConfig(savedConfig: Partial<OpenClawConfig> | null): OpenClawConfig {
  if (!savedConfig) {
    return {
      baseURL: DEFAULT_BASE_URL,
      gatewayToken: '',
    };
  }

  const savedBaseURL = typeof savedConfig.baseURL === 'string' ? savedConfig.baseURL.trim() : '';
  const baseURL = !savedBaseURL || LEGACY_BASE_URLS.has(savedBaseURL)
    ? DEFAULT_BASE_URL
    : normalizeBaseURL(savedBaseURL);

  return {
    baseURL,
    gatewayToken: typeof savedConfig.gatewayToken === 'string' ? savedConfig.gatewayToken : '',
    agentId: savedConfig.agentId,
  };
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<OpenClawConfig>(() => {
    if (typeof window === 'undefined') {
      return normalizeConfig(null);
    }

    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        return normalizeConfig(JSON.parse(saved) as Partial<OpenClawConfig>);
      } catch (e) {
        console.error('Failed to parse config', e);
      }
    }
    return normalizeConfig(null);
  });

  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    updateSessionMessages,
    currentSession,
  } = useChatStorage();

  const { sendMessage, isGenerating } = useOpenClaw(config);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSendMessage = async (text: string, images: string[]) => {
    let session = currentSession;
    if (!session) {
      session = createSession();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      images,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMessage];
    updateSessionMessages(session.id, updatedMessages);

    const assistantMessageId = crypto.randomUUID();
    let assistantContent = '';

    await sendMessage(
      updatedMessages,
      (token) => {
        assistantContent += token;
        const finalMessages: Message[] = [
          ...updatedMessages,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: assistantContent,
            timestamp: Date.now(),
          },
        ];
        updateSessionMessages(session!.id, finalMessages);
      },
      (error) => {
        console.error('Chat error:', error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Error: ${error.message || 'Failed to connect to OpenClaw Gateway. Please check your settings and ensure the gateway is running.'}`,
          timestamp: Date.now(),
        };
        updateSessionMessages(session!.id, [...updatedMessages, errorMessage]);
      }
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">OpenClaw</span>
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">Gemma 4 E4B</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
            <span>{config.baseURL}</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            messages={currentSession?.messages || []}
            isGenerating={isGenerating}
          />
          
          <div className="px-4 md:px-8 pb-4">
            <MCPTools />
          </div>

          <MessageInput
            onSend={handleSendMessage}
            disabled={isGenerating}
          />
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal
          config={config}
          onSave={setConfig}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
