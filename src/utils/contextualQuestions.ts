
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const generateContextualQuestions = async (
  lastResponse: string,
  chatHistory: Message[] = []
): Promise<string[]> => {
  try {
    console.log('🤔 Calling generateContextualQuestions with:');
    console.log('  - lastResponse length:', lastResponse.length);
    console.log('  - chatHistory length:', chatHistory.length);
    console.log('  - recent messages:', chatHistory.slice(-2).map(m => ({ isUser: m.isUser, text: m.text.substring(0, 50) + '...' })));
    
    const { data, error } = await supabase.functions.invoke('generate-contextual-questions', {
      body: {
        lastResponse,
        chatHistory: chatHistory.slice(-4) // Send only recent messages for context
      }
    });

    if (error) {
      console.error('❌ Error calling generate-contextual-questions:', error);
      return getFallbackQuestions(lastResponse);
    }

    if (data?.questions && Array.isArray(data.questions)) {
      console.log('✅ Generated contextual questions:', data.questions);
      return data.questions;
    }

    console.log('⚠️ No questions in response, using fallback');
    console.log('  - Response data:', data);
    return getFallbackQuestions(lastResponse);
  } catch (error) {
    console.error('❌ Error in generateContextualQuestions:', error);
    return getFallbackQuestions(lastResponse);
  }
};

function getFallbackQuestions(lastResponse: string): string[] {
  const response = lastResponse.toLowerCase();
  
  // Meditation and mindfulness
  if (response.includes('meditat') || response.includes('mindful')) {
    return [
      "Can you guide me through a 5-minute breathing meditation?",
      "What are some mindfulness techniques for beginners?",
      "How can I maintain focus during meditation?"
    ];
  }

  // Stress and anxiety
  if (response.includes('stress') || response.includes('anxiet') || response.includes('worry')) {
    return [
      "What are some quick stress-relief techniques?",
      "How can I manage anxiety in social situations?",
      "What breathing exercises help with stress?"
    ];
  }

  // Sleep
  if (response.includes('sleep') || response.includes('rest') || response.includes('insomnia')) {
    return [
      "Can you help me create a bedtime routine?",
      "What are some natural ways to improve sleep?",
      "How can I calm my mind before bed?"
    ];
  }

  // Relationships
  if (response.includes('relationship') || response.includes('communication') || response.includes('conflict')) {
    return [
      "How can I improve communication with my partner?",
      "What are healthy ways to resolve conflicts?",
      "How do I set healthy boundaries?"
    ];
  }

  // Self-care
  if (response.includes('self-care') || response.includes('wellness') || response.includes('health')) {
    return [
      "What are some simple daily self-care practices?",
      "How can I build a sustainable wellness routine?",
      "What are signs I need to prioritize self-care?"
    ];
  }

  // Work and focus
  if (response.includes('work') || response.includes('productiv') || response.includes('focus')) {
    return [
      "How can I improve work-life balance?",
      "What techniques help with procrastination?",
      "How do I stay motivated during difficult tasks?"
    ];
  }

  // Emotions
  if (response.includes('emotion') || response.includes('anger') || response.includes('sad')) {
    return [
      "How can I better understand my emotions?",
      "What are healthy ways to express difficult feelings?",
      "How do I practice emotional self-regulation?"
    ];
  }

  // Default questions
  return [
    "Can you tell me more about this topic?",
    "How can I apply this in my daily life?",
    "What other techniques might be helpful?"
  ];
}
