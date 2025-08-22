import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface WebSearchToggleProps {
  disabled?: boolean;
}

const WebSearchToggle: React.FC<WebSearchToggleProps> = ({ disabled = false }) => {
  const { config, updateConfig } = useConfigManager();

  const toggleWebSearch = () => {
    updateConfig({ webSearch: !config.webSearch });
  };

  return (
    <Button
      type="button"
      onClick={toggleWebSearch}
      size="sm"
      variant="ghost"
      className={`h-8 w-8 p-0 ${
        config.webSearch
          ? 'text-primary hover:text-primary/80'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={config.webSearch ? 'Web search enabled' : 'Web search disabled'}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
};

export default WebSearchToggle;