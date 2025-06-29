
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

interface PlayVideoButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

const PlayVideoButton: React.FC<PlayVideoButtonProps> = ({ 
  onClick, 
  disabled = false, 
  isGenerating = false 
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isGenerating}
      size="sm"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105"
    >
      <Video className="h-4 w-4" />
      <span>{isGenerating ? 'Generating...' : 'Play Video'}</span>
    </Button>
  );
};

export default PlayVideoButton;
