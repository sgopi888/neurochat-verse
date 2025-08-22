import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, Globe, Slash } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

type RetrievalMode = 'none' | 'rag' | 'web';

export const RetrievalModeToggle: React.FC = () => {
  const { config, updateConfig } = useConfigManager();

  const cycleMode = () => {
    let nextMode: RetrievalMode;
    if (config.mode === 'none') nextMode = 'rag';
    else if (config.mode === 'rag') nextMode = 'web';
    else nextMode = 'none';
    
    updateConfig({ mode: nextMode });
  };

  const getIcon = () => {
    switch (config.mode) {
      case 'rag':
        return <BookOpenCheck className="h-4 w-4 text-primary" />;
      case 'web':
        return <Globe className="h-4 w-4 text-primary" />;
      default:
        return <Slash className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTitle = () => {
    switch (config.mode) {
      case 'rag':
        return 'Knowledge retrieval enabled';
      case 'web':
        return 'Web search enabled';
      default:
        return 'No external retrieval';
    }
  };

  return (
    <Button
      type="button"
      onClick={cycleMode}
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 transition-all duration-200"
      title={getTitle()}
    >
      {getIcon()}
    </Button>
  );
};

export default RetrievalModeToggle;