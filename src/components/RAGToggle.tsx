import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpenCheck, Database } from 'lucide-react';

interface RAGToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const RAGToggle: React.FC<RAGToggleProps> = ({ 
  isEnabled, 
  onToggle, 
  disabled = false 
}) => {
  return (
    <Button
      type="button"
      onClick={onToggle}
      variant={isEnabled ? "default" : "ghost"}
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        isEnabled 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      title={isEnabled ? 'RAG mode enabled - Knowledge retrieval active' : 'RAG mode disabled - Click to enable knowledge retrieval'}
      disabled={disabled}
    >
      {isEnabled ? (
        <Database className="h-4 w-4" />
      ) : (
        <BookOpenCheck className="h-4 w-4" />
      )}
    </Button>
  );
};

export default RAGToggle;