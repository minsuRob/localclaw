import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OpenClawConfig } from '../types/chat';

interface SettingsModalProps {
  config: OpenClawConfig;
  onSave: (config: OpenClawConfig) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ config, onSave, onClose }) => {
  const { t } = useTranslation();
  const [baseURL, setBaseURL] = useState(config.baseURL);
  const [gatewayToken, setGatewayToken] = useState(config.gatewayToken);
  const [agentId, setAgentId] = useState(config.agentId || '');

  const handleSave = () => {
    onSave({ baseURL, gatewayToken, agentId: agentId || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">{t('settings')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Gateway Base URL</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://robertlee-macbookpro.tail15c8bb.ts.net/v1"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 ring-primary/20 outline-none"
            />
            <p className="text-[10px] text-muted-foreground">
              GitHub Pages와 같은 HTTPS 환경에서는 Tailscale HTTPS 주소를 사용해야 혼합 콘텐츠 문제를 피할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Gateway Token</label>
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="선택 사항 - Tailscale Serve/Funnel이면 비워둘 수 있음"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 ring-primary/20 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Agent ID (Optional)</label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="openclaw"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-secondary/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
