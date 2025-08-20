import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface GPTResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export class GPTService {
  private static async callGPT(
    messages: Array<{ role: string; content: string }>,
    userId?: string
  ): Promise<GPTResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('gpt-chat', {
        body: {
          messages,
          userId,
          model: 'gpt-5-2025-08-07'
        }
      });

      if (error) {
        console.error('GPT API error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data.response };
    } catch (error) {
      console.error('GPT service error:', error);
      return { success: false, error: 'Failed to connect to AI service' };
    }
  }

  static async probingChat(userMessage: string, chatHistory: Message[], userId?: string): Promise<GPTResponse> {
    const systemPrompt = `You are a compassionate listener and gentle guide. Your role is to encourage the user to open up about their current struggles, worries, emotional pain, and challenges. 

Ask gentle, open-ended questions that help them reveal more details about what's troubling them. Be warm, empathetic, and patient. Do not give solutions, advice, or meditations yet - your only goal is to help them explore and articulate their emotional landscape.

Some example approaches:
- "Tell me more about what's been weighing on your mind lately..."
- "How has that been affecting you day-to-day?"
- "What feels most challenging about that situation?"
- "Can you describe what that stress feels like for you?"

Keep your responses natural, conversational, and supportive. Focus on drawing out emotions, contexts, and details that will help create a personalized meditation later.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: userMessage }
    ];

    return this.callGPT(messages, userId);
  }

  static async extractKeywords(chatHistory: Message[], userId?: string): Promise<GPTResponse> {
    const chatText = chatHistory
      .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const systemPrompt = `Analyze the following conversation and extract the key search terms that would be most useful for finding relevant meditation and wellness content.

Focus on:
- Emotional states (anxiety, stress, sadness, anger, etc.)
- Specific problems or challenges mentioned
- Life situations or contexts
- Physical symptoms or sensations
- Relationships or social issues
- Work or life circumstances

Return 3-7 concise search keywords or short phrases, separated by commas. Make them specific enough to find relevant content but broad enough to match various resources.

Example output: "work stress, anxiety, sleep problems, relationship conflict"`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please extract search keywords from this conversation:\n\n${chatText}` }
    ];

    return this.callGPT(messages, userId);
  }

  static async generateMeditationScript(
    chatHistory: Message[], 
    retrievedChunks: string, 
    userId?: string
  ): Promise<GPTResponse> {
    const chatText = chatHistory
      .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const systemPrompt = `You are a skilled meditation guide creating a personalized meditation script. Using the user's conversation history and the relevant reference material provided, create a gentle, healing meditation that directly addresses their specific struggles and emotional needs.

Structure your meditation with these elements:
1. **Grounding Introduction** (1-2 minutes) - Help them settle and feel safe
2. **Guided Breathing** (2-3 minutes) - Simple, calming breath work
3. **Emotional Awareness** (2-3 minutes) - Gently acknowledge their struggles with compassion  
4. **Mental Observation** (2-3 minutes) - Help them observe thoughts and feelings without being overwhelmed
5. **Healing Visualization or Affirmation** (3-4 minutes) - Tailored to their specific issues and needs
6. **Integration & Closure** (1-2 minutes) - Gentle return with positive intention

Make it 500-700 words total. Use warm, compassionate language. Reference their specific struggles naturally without being repetitive. Draw insights from the reference material to enhance the meditation's relevance and depth.

Write in second person ("you") as if speaking directly to them during the meditation.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Create a personalized meditation script based on:

CONVERSATION CONTEXT:
${chatText}

REFERENCE MATERIAL:
${retrievedChunks}

Please create a healing meditation that addresses their specific needs.` 
      }
    ];

    return this.callGPT(messages, userId);
  }
}