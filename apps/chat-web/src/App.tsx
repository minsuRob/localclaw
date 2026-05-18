import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { MCPTools } from './components/MCPTools';
import { SettingsModal } from './components/SettingsModal';
import { useChatStorage } from './hooks/useChatStorage';
import { useOpenClaw } from './hooks/useOpenClaw';
import type { Message, OpenClawConfig } from './types/chat';
import { gatewayOriginFromApiBase } from './lib/gatewayUrls';
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
    gatewayModelRef:
      typeof savedConfig.gatewayModelRef === 'string'
        ? savedConfig.gatewayModelRef.trim() || undefined
        : undefined,
  };
}

function App() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

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
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* 모바일: 사이드바 오픈 시 딤 */}
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-label={t('sidebar_close')}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[min(85vw,16rem)] flex-col transition-transform duration-200 ease-out md:static md:z-0 md:h-auto md:w-auto md:max-w-none md:translate-x-0 md:shadow-none ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={createSession}
          onDeleteSession={deleteSession}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onOpenSettings={() => {
            setIsSettingsOpen(true);
            setMobileSidebarOpen(false);
          }}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/50 px-3 backdrop-blur-md md:h-14 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="shrink-0 rounded-xl p-2 hover:bg-secondary md:hidden"
              aria-label={t('open_menu')}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="truncate font-bold text-base tracking-tight md:text-lg">OpenClaw</span>
            <span className="hidden shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline-flex">
              Gemma 4 E4B
            </span>
          </div>
          <div className="hidden min-w-0 text-[10px] font-mono text-muted-foreground md:block md:truncate">
            <span>{config.baseURL}</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatWindow
            messages={currentSession?.messages || []}
            isGenerating={isGenerating}
          />

          <div className="hidden shrink-0 px-4 pb-2 pt-1 md:block md:px-8 md:pb-4">
            <MCPTools
              agentProjectRoot={config.agentProjectRoot}
              controlUiOrigin={gatewayOriginFromApiBase(config.baseURL)}
            />
          </div>

          <MessageInput onSend={handleSendMessage} disabled={isGenerating} />
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
