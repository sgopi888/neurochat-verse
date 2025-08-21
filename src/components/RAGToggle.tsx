import { Button } from '@/components/ui/button';
import { BookOpen, BookOpenCheck } from 'lucide-react';
import { GPTService } from '@/services/gptService';
import { useState, useEffect } from 'react';

interface RAGToggleProps {
  disabled?: boolean;
}

export const RAGToggle = ({ disabled = false }: RAGToggleProps) => {
  const [isEnabled, setIsEnabled] = useState(true); // Default to enabled

  useEffect(() => {
    // Load initial state from GPT config
    const config = JSON.parse(localStorage.getItem('gpt-config') || '{}');
    setIsEnabled(config.ragEnabled !== false); // Default to true if not set
  }, []);

  const toggleRAG = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Update GPT service config
    const config = JSON.parse(localStorage.getItem('gpt-config') || '{}');
    const updatedConfig = { ...config, ragEnabled: newState };
    GPTService.setConfig(updatedConfig);
  };

  return (
    <Button
      onClick={toggleRAG}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        isEnabled 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={isEnabled ? "Knowledge retrieval enabled" : "Enable knowledge retrieval for enhanced responses"}
    >
      {isEnabled ? <BookOpenCheck className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
    </Button>
  );
};

export default RAGToggle;