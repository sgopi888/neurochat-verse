
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';

interface PlayVideoButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  hasAudio?: boolean;
}

const PlayVideoButton: React.FC<PlayVideoButtonProps> = ({ 
  onClick, 
  disabled = false, 
  isGenerating = false,
  hasAudio = false
}) => {
  const getButtonText = () => {
    if (isGenerating) return 'Generating Video...';
    if (hasAudio) return 'Generate Video';
    return 'Generate Audio & Video';
  };

  const getButtonIcon = () => {
    if (isGenerating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <Video className="h-4 w-4" />;
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isGenerating}
      size="sm"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105"
    >
      {getButtonIcon()}
      <span>{getButtonText()}</span>
    </Button>
  );
};

export default PlayVideoButton;
