import React from 'react';
import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MCPTools: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wrench size={16} />
        {t('mcp_tools')}
      </div>
      <div className="flex gap-2 flex-wrap">
        {/* Mock tools for now, can be fetched from OpenClaw API */}
        <span className="px-2 py-1 bg-secondary text-[10px] rounded-md border border-border">google_search</span>
        <span className="px-2 py-1 bg-secondary text-[10px] rounded-md border border-border">file_system</span>
        <span className="px-2 py-1 bg-secondary text-[10px] rounded-md border border-border">memory</span>
      </div>
    </div>
  );
};
