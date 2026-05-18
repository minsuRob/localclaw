import { useState, useCallback } from 'react';
import type { Message, OpenClawConfig } from '../types/chat';

export function useOpenClaw(config: OpenClawConfig) {
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGatewayToken = Boolean(config.gatewayToken && config.gatewayToken.trim() && config.gatewayToken !== 'no-key-needed');

  const sendMessage = useCallback(async (
    messages: Message[],
    onToken: (token: string) => void,
    onError: (error: any) => void
  ) => {
    setIsGenerating(true);
    try {
      const sessionKey = 'main';
      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-session-key': sessionKey,
          ...(hasGatewayToken ? { 'Authorization': `Bearer ${config.gatewayToken.trim()}` } : {}),
          ...(config.agentId ? { 'x-openclaw-agent-id': config.agentId } : {}),
        },
        body: JSON.stringify({
          model: 'openclaw',
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = new Error(`HTTP error! status: ${response.status}`) as Error & {
          status?: number;
        };
        err.status = response.status;
        throw err;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const json = JSON.parse(data);
            const token = json.choices[0]?.delta?.content || '';
            if (token) onToken(token);
          } catch (e) {
            console.error('Error parsing SSE data', e);
          }
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      setIsGenerating(false);
    }
  }, [config, hasGatewayToken]);

  return { sendMessage, isGenerating };
}
