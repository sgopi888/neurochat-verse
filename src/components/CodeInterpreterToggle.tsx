import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import { useConfigManager } from '@/hooks/useConfigManager';

interface CodeInterpreterToggleProps {
  disabled?: boolean;
}

export const CodeInterpreterToggle = ({ disabled = false }: CodeInterpreterToggleProps) => {
  const { config, updateConfig } = useConfigManager();

  const toggleCodeInterpreter = () => {
    updateConfig({ codeInterpreter: !config.codeInterpreter });
  };

  return (
    <Button
      type="button"
      onClick={toggleCodeInterpreter}
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-all duration-200 ${
        config.codeInterpreter 
          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
      disabled={disabled}
      title={config.codeInterpreter ? "Code interpreter enabled" : "Enable code interpreter for analysis"}
    >
      <Terminal className="h-4 w-4" />
    </Button>
  );
};

export default CodeInterpreterToggle;