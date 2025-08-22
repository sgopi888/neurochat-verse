import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface WebSearchToggleProps {
  disabled?: boolean;
}

export const WebSearchToggle = ({ disabled = false }: WebSearchToggleProps) => {
  const { config, updateConfig } = useConfigManager();

  const isWebEnabled = config.mode === 'web';

  const toggleWebSearch = () => {
    updateConfig({ 
      mode: isWebEnabled ? 'none' : 'web' 
    });
  };

  return (
    <Button
      type="button"
      onClick={toggleWebSearch}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        isWebEnabled 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={isWebEnabled ? "Web search enabled" : "Enable web search"}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
};

export default WebSearchToggle;