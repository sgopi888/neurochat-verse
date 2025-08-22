import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface WebSearchToggleProps {
  disabled?: boolean;
  onCounselModeOff?: () => void;
}

export const WebSearchToggle = ({ disabled = false, onCounselModeOff }: WebSearchToggleProps) => {
  const { config, updateConfig } = useConfigManager();

  const isWebEnabled = config.mode === 'web';

  const toggleWebSearch = () => {
    const newMode = isWebEnabled ? 'none' : 'web';
    updateConfig({ mode: newMode });
    
    // Turn off counsel mode when activating web search
    if (newMode === 'web' && onCounselModeOff) {
      onCounselModeOff();
    }
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