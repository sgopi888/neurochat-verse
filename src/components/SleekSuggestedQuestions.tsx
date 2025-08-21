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
    <Card className="mx-4 mb-4 p-4 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Continue exploring:
        </span>
      </div>
      
      <div className="space-y-2">
        {questions.slice(0, 3).map((question, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => onQuestionClick(question)}
            className="w-full justify-between text-left h-auto p-3 hover:bg-primary/10 transition-colors group"
          >
            <span className="text-sm text-foreground/80 group-hover:text-foreground">
              {question}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default SleekSuggestedQuestions;