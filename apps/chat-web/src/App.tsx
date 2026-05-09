import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { MCPTools } from './components/MCPTools';
import { useChatStorage } from './hooks/useChatStorage';
import { useOpenClaw } from './hooks/useOpenClaw';
import { Message } from './types/chat';
import './i18n';

function App() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    updateSessionMessages,
    currentSession,
  } = useChatStorage();

  const { sendMessage, isGenerating } = useOpenClaw({
    baseURL: 'http://localhost:18789/v1', // OpenClaw Gateway
    gatewayToken: 'no-key-needed', // Replace with actual token if needed
  });

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
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">OpenClaw</span>
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">Gemma 4 E4B</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Add more header actions here */}
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
    </div>
  );
}

export default App;
