
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

export const generateContextualQuestions = async (
  chatId: string,
  recentMessages?: ChatMessage[]
): Promise<string[]> => {
  try {
    console.log('Generating contextual questions for chat:', chatId);
    
    const { data, error } = await supabase.functions.invoke('generate-contextual-questions', {
      body: {
        chatId,
        recentMessages: recentMessages || []
      }
    });

    if (error) {
      console.error('Error calling contextual questions function:', error);
      return getFallbackQuestions();
    }

    if (data?.questions && Array.isArray(data.questions)) {
      console.log('Generated contextual questions:', data.questions);
      return data.questions;
    }

    return getFallbackQuestions();
  } catch (error) {
    console.error('Error generating contextual questions:', error);
    return getFallbackQuestions();
  }
};

const getFallbackQuestions = (): string[] => {
  const fallbackQuestions = [
    "How are you feeling today?",
    "What's on your mind?",
    "Need mindfulness guidance?",
    "Ready for a breathing exercise?",
    "How can I support you?",
    "What's bringing you stress?",
    "Want to explore your emotions?",
    "Need help with relaxation?",
    "How's your energy level?",
    "What would help right now?"
  ];

  // Return 3 random questions
  const shuffled = fallbackQuestions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};
