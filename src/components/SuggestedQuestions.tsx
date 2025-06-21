
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Lightbulb } from 'lucide-react';

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
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Suggested follow-up questions:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuestionClick(question)}
            className="text-left justify-start bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-800/30 dark:hover:to-purple-800/30 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <MessageCircle className="h-3 w-3 mr-2 text-blue-500" />
            <span className="text-sm">{question}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
