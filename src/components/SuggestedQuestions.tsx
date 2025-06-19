
import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionClick,
  isVisible
}) => {
  if (!isVisible || questions.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center space-x-2 mb-3">
        <HelpCircle className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-blue-800">Related Questions</h3>
      </div>
      <div className="space-y-2">
        {questions.slice(0, 3).map((question, index) => (
          <Button
            key={index}
            onClick={() => onQuestionClick(question)}
            variant="outline"
            className="w-full text-left justify-start h-auto p-3 text-sm border-blue-200 hover:bg-blue-100 hover:border-blue-300"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
