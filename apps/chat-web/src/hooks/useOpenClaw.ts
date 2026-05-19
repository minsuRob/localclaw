import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  detectBrowserNavigationUrl,
  gatewayHttpRoot,
} from '../lib/browserIntent';
import type { Message, OpenClawConfig } from '../types/chat';

const WEBCHAT_AGENT_FS_HINT = (projectRoot: string) =>
  [
    '[OpenClaw web chat — gateway agent]',
    `On the gateway host, use file tools (read, list, edit, etc.) with ABSOLUTE paths.`,
    `Primary repository root for this UI: ${projectRoot.trim()}`,
    `Also align with agents.defaults.workspace in ~/.openclaw/openclaw.json when possible.`,
    `Do not claim you cannot access the filesystem without first attempting tool calls under that root.`,
  ].join('\n');

async function invokeBrowserOpen(
  config: OpenClawConfig,
  url: string,
  hasGatewayToken: boolean
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const root = gatewayHttpRoot(config.baseURL);
  const response = await fetch(`${root}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(hasGatewayToken
        ? { Authorization: `Bearer ${config.gatewayToken.trim()}` }
        : {}),
    },
    body: JSON.stringify({
      tool: 'browser',
      action: 'open',
      args: { url },
      sessionKey: 'main',
    }),
  });

  let body: { ok?: boolean; error?: { message?: string } } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    /* non-JSON */
  }

  if (!response.ok || body.ok === false) {
    const detail =
      body?.error?.message?.trim() ||
      `HTTP ${response.status}`;
    return { ok: false, detail };
  }
  return { ok: true };
}

export function useOpenClaw(config: OpenClawConfig) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGatewayToken = Boolean(config.gatewayToken && config.gatewayToken.trim() && config.gatewayToken !== 'no-key-needed');

  const sendMessage = useCallback(async (
    messages: Message[],
    onToken: (token: string) => void,
    onError: (error: any) => void
  ) => {
    setIsGenerating(true);
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const navUrl = lastUser ? detectBrowserNavigationUrl(lastUser.content) : null;
      if (navUrl) {
        const opened = await invokeBrowserOpen(config, navUrl, hasGatewayToken);
        if (opened.ok) {
          onToken(t('browser_open_success', { url: navUrl }));
          return;
        }
        onToken(t('browser_open_failed', { detail: opened.detail }));
        return;
      }

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
        },
        body: JSON.stringify({
          model: 'openclaw',
          messages: payloadMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = (await response.json()) as { error?: { message?: string } };
          detail = body?.error?.message?.trim() ?? '';
        } catch {
          /* non-JSON error body */
        }
        const err = new Error(
          detail || `HTTP error! status: ${response.status}`
        ) as Error & { status?: number };
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
  }, [config, hasGatewayToken, t]);

  return { sendMessage, isGenerating };
}
