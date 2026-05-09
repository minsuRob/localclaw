import React, { useRef, useEffect } from 'react';
import type { Message } from '../types/chat';
import { cn } from '../lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  isGenerating: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isGenerating }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
          <Bot size={48} />
          <h2 className="text-2xl font-bold">How can I help you today?</h2>
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-4 max-w-3xl mx-auto",
            message.role === 'user' ? "flex-row-reverse" : ""
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"
          )}>
            {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
          </div>
          
          <div className={cn(
            "space-y-2 max-w-[85%]",
            message.role === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm" 
                : "bg-secondary/50 border border-border rounded-tl-none"
            )}>
              {message.content}
              {message.images && message.images.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {message.images.map((img, i) => (
                    <img key={i} src={img} alt="uploaded" className="max-w-xs rounded-lg border border-border" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {isGenerating && (
        <div className="flex gap-4 max-w-3xl mx-auto">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div className="flex items-center gap-1 p-4">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
};
