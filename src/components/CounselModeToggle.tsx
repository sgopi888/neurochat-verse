import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface CounselModeToggleProps {
  disabled?: boolean;
  isRagEnabled?: boolean;
  onRagToggle?: () => void;
}

export const CounselModeToggle = ({ 
  disabled = false, 
  isRagEnabled = false, 
  onRagToggle 
}: CounselModeToggleProps) => {
  const { config, updateConfig } = useConfigManager();

  // Counsel mode is active when all modes are off (including RAG)
  const isCounselMode = config.mode === 'none' && !config.codeInterpreter && !isRagEnabled;

  const toggleCounselMode = () => {
    // Turn off all modes for pure LLM chat
    updateConfig({ 
      mode: 'none', 
      codeInterpreter: false 
    });
    
    // Also turn off RAG if it's enabled
    if (isRagEnabled && onRagToggle) {
      onRagToggle();
    }
  };

  return (
    <Button
      type="button"
      onClick={toggleCounselMode}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        isCounselMode 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={isCounselMode ? "Counsel mode active - Pure LLM chat" : "Enable counsel mode - Turn off all assistants"}
    >
      <Heart className="h-4 w-4" />
    </Button>
  );
};

export default CounselModeToggle;