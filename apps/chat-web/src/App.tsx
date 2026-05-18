import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
/** 게이트웨이 맥에서의 레포 루트. 다른 환경이면 설정에서 수정하거나 VITE_AGENT_PROJECT_ROOT 로 빌드 시 지정. */
const DEFAULT_AGENT_PROJECT_ROOT =
  (import.meta.env.VITE_AGENT_PROJECT_ROOT as string | undefined)?.trim() ||
  '/Users/robertlee/Workspace/Personal/localclaw';
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
      agentProjectRoot: DEFAULT_AGENT_PROJECT_ROOT,
    };
  }

  const savedBaseURL = typeof savedConfig.baseURL === 'string' ? savedConfig.baseURL.trim() : '';
  const baseURL = !savedBaseURL || LEGACY_BASE_URLS.has(savedBaseURL)
    ? DEFAULT_BASE_URL
    : normalizeBaseURL(savedBaseURL);

  const savedRoot =
    typeof savedConfig.agentProjectRoot === 'string' ? savedConfig.agentProjectRoot.trim() : '';
  return {
    baseURL,
    gatewayToken:
      typeof savedConfig.gatewayToken === 'string' ? savedConfig.gatewayToken.trim() : '',
    agentId: savedConfig.agentId,
    agentProjectRoot: savedRoot || DEFAULT_AGENT_PROJECT_ROOT,
  };
}

function App() {
  const { t } = useTranslation();
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
      (error: unknown) => {
        console.error('Chat error:', error);
        const status =
          error instanceof Error && 'status' in error
            ? (error as Error & { status?: number }).status
            : undefined;
        if (status === 401) {
          setIsSettingsOpen(true);
        }
        const fallback =
          status === 401
            ? t('error_gateway_unauthorized')
            : error instanceof Error && error.message
              ? error.message
              : t('error_gateway_connect');
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Error: ${fallback}`,
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
            <MCPTools agentProjectRoot={config.agentProjectRoot} />
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
          onClearStoredCredentials={() =>
            setConfig((prev) => ({ ...prev, gatewayToken: '' }))
          }
        />
      )}
    </div>
  );
}

export default App;
