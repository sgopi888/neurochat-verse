import { Button } from '@/components/ui/button';
import { BookOpen, BookOpenCheck } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface RAGToggleProps {
  disabled?: boolean;
}

export const RAGToggle = ({ disabled = false }: RAGToggleProps) => {
  const { config, updateConfig } = useConfigManager();

  const toggleRAG = () => {
    updateConfig({ ragEnabled: !config.ragEnabled });
  };

  return (
    <Button
      type="button"
      onClick={toggleRAG}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        config.ragEnabled 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={config.ragEnabled ? "Knowledge retrieval enabled" : "Enable knowledge retrieval for enhanced responses"}
    >
      {config.ragEnabled ? <BookOpenCheck className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
    </Button>
  );
};

export default RAGToggle;