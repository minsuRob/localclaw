import { useState, useCallback } from 'react';
import type { Message, OpenClawConfig } from '../types/chat';

const WEBCHAT_AGENT_FS_HINT = (projectRoot: string) => {
  const root = projectRoot.trim();
  return [
    '[OpenClaw web chat — gateway agent]',
    `On the gateway host, use file tools (read, list, edit, exec) with ABSOLUTE paths under: ${root}`,
    `UI changes for this product live under ${root}/apps/chat-web/`,
    `Deploy to GitHub Pages: from ${root}, git add → git commit → git push origin main (workflow deploys when apps/chat-web/** changes).`,
    `You may run ${root}/scripts/deploy-chat-web.sh after edits.`,
    `Never ask the user to paste file contents until read/list/edit under ${root} has been attempted.`,
    `Match agents.defaults.workspace in ~/.openclaw/openclaw.json (Docker: /home/node/.openclaw/workspace when the repo is mounted there).`,
  ].join('\n');
};

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
      const root = config.agentProjectRoot?.trim();
      const conversation = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const payloadMessages =
        root && root.length > 0
          ? [{ role: 'system' as const, content: WEBCHAT_AGENT_FS_HINT(root) }, ...conversation]
          : conversation;

      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-session-key': sessionKey,
          ...(hasGatewayToken ? { Authorization: `Bearer ${config.gatewayToken.trim()}` } : {}),
          ...(config.agentId ? { 'x-openclaw-agent-id': config.agentId } : {}),
          ...(config.gatewayModelRef?.trim()
            ? { 'x-openclaw-model': config.gatewayModelRef.trim() }
            : {}),
        },
        body: JSON.stringify({
          model: 'openclaw',
          messages: payloadMessages,
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
