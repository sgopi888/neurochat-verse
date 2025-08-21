import { Button } from '@/components/ui/button';
import { Code, Code2 } from 'lucide-react';
import { GPTService } from '@/services/gptService';
import { useState, useEffect } from 'react';

interface CodeInterpreterToggleProps {
  disabled?: boolean;
}

export const CodeInterpreterToggle = ({ disabled = false }: CodeInterpreterToggleProps) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Load initial state from GPT config
    const config = JSON.parse(localStorage.getItem('gpt-config') || '{}');
    setIsEnabled(config.codeInterpreter || false);
  }, []);

  const toggleCodeInterpreter = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Update GPT service config
    const config = JSON.parse(localStorage.getItem('gpt-config') || '{}');
    const updatedConfig = { ...config, codeInterpreter: newState };
    GPTService.setConfig(updatedConfig);
  };

  return (
    <Button
      onClick={toggleCodeInterpreter}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        isEnabled 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={isEnabled ? "BPM data analysis enabled" : "Enable BPM data analysis for HRV insights"}
    >
      {isEnabled ? <Code2 className="h-4 w-4" /> : <Code className="h-4 w-4" />}
    </Button>
  );
};

export default CodeInterpreterToggle;