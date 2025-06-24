
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { generateContextualQuestions } from '@/utils/contextualQuestions';

interface Message {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

interface SuggestedQuestionsProps {
  onQuestionSelect: (question: string) => void;
  chatId?: string;
  messages?: Message[];
  isVisible?: boolean;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  onQuestionSelect,
  chatId,
  messages = [],
  isVisible = true
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible && chatId) {
      generateQuestions();
    }
  }, [chatId, messages.length, isVisible]);

  const generateQuestions = async () => {
    if (!chatId) return;
    
    setIsLoading(true);
    try {
      // Get recent messages for context
      const recentMessages = messages.slice(-6);
      const contextualQuestions = await generateContextualQuestions(chatId, recentMessages);
      setQuestions(contextualQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      // Fallback to default questions
      setQuestions([
        "How are you feeling today?",
        "What's on your mind?",
        "Need mindfulness guidance?"
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || questions.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="text-sm text-gray-600 mb-2 font-medium">
        Suggested questions:
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuestionSelect(question)}
            className="text-left text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-3 py-1 h-auto whitespace-normal"
            disabled={isLoading}
          >
            {question}
          </Button>
        ))}
      </div>
      {isLoading && (
        <div className="text-xs text-gray-500 mt-2">
          Generating personalized suggestions...
        </div>
      )}
    </div>
  );
};

export default SuggestedQuestions;
