import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { GPTService } from '@/services/gptService';

interface WebSearchToggleProps {
  disabled?: boolean;
}

const WebSearchToggle: React.FC<WebSearchToggleProps> = ({ disabled = false }) => {
  const [isWebSearchEnabled, setIsWebSearchEnabled] = React.useState(false);

  React.useEffect(() => {
    // Load current config
    const savedConfig = localStorage.getItem('gpt-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setIsWebSearchEnabled(config.webSearch || false);
    }
  }, []);

  const toggleWebSearch = () => {
    const savedConfig = localStorage.getItem('gpt-config');
    const config = savedConfig ? JSON.parse(savedConfig) : {
      provider: 'aiml',
      model: 'gpt-5-nano',
      verbosity: 'low',
      reasoning: 'minimal',
      webSearch: false
    };
    
    const newWebSearchState = !isWebSearchEnabled;
    const newConfig = { ...config, webSearch: newWebSearchState };
    
    setIsWebSearchEnabled(newWebSearchState);
    GPTService.setConfig(newConfig);
  };

  return (
    <Button
      type="button"
      onClick={toggleWebSearch}
      size="sm"
      variant="ghost"
      className={`h-8 w-8 p-0 ${
        isWebSearchEnabled
          ? 'text-primary hover:text-primary/80'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={isWebSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
};

export default WebSearchToggle;