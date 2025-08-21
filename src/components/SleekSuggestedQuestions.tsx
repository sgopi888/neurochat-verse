import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SleekSuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
}

const SleekSuggestedQuestions: React.FC<SleekSuggestedQuestionsProps> = ({
  questions,
  onQuestionClick,
  isVisible
}) => {
  if (!isVisible || questions.length === 0) {
    return null;
  }

  return (
    <Card className="w-1/4 ml-4 mb-3 p-2 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20 shadow-sm">
      <div className="flex items-center gap-1 mb-1">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Query suggestions:
        </span>
      </div>
      
      <div className="space-y-1">
        {questions.slice(0, 3).map((question, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => onQuestionClick(question)}
            className="w-full justify-start text-left h-auto p-1.5 hover:bg-primary/10 transition-colors group text-xs"
          >
            <span className="text-[10px] text-foreground/80 group-hover:text-foreground line-clamp-2">
              {question}
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default SleekSuggestedQuestions;