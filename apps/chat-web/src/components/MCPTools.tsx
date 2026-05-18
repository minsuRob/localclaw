import React from 'react';
import { FolderGit2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MCPToolsProps {
  agentProjectRoot?: string;
}

export const MCPTools: React.FC<MCPToolsProps> = ({ agentProjectRoot }) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Info size={16} className="text-muted-foreground" />
        {t('gateway_agent_panel_title')}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t('gateway_agent_panel_body')}</p>
      <div className="flex flex-wrap items-start gap-2 rounded-lg bg-background/60 border border-border px-3 py-2">
        <FolderGit2 size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            {t('gateway_agent_project_root_label')}
          </div>
          <div className="font-mono text-[11px] text-foreground break-all pt-0.5">
            {agentProjectRoot?.trim() ? agentProjectRoot.trim() : t('gateway_agent_project_root_missing')}
          </div>
        </div>
      </div>
    </div>
  );
};
