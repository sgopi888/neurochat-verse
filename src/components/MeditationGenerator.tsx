import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface MeditationGeneratorProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  probingMessageCount: number;
}

const MeditationGenerator: React.FC<MeditationGeneratorProps> = ({
  canGenerate,
  isGenerating,
  onGenerate,
  probingMessageCount
}) => {
  if (probingMessageCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10 my-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-medium">Ready for Your Personalized Meditation</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          I've learned about your situation. Let me create a guided meditation tailored specifically for you.
        </p>
      </div>
      
      <Button 
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        size="lg"
        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Your Meditation...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Meditation Script
          </>
        )}
      </Button>
      
      {isGenerating && (
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Analyzing your conversation...</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse animation-delay-200" />
            <span>Finding relevant guidance...</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse animation-delay-400" />
            <span>Creating personalized meditation...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeditationGenerator;