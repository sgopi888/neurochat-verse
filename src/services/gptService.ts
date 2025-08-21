import { supabase } from '@/integrations/supabase/client';
import { PROMPTS, fillTemplate } from '@/config/prompts';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface GPTResponse {
  success: boolean;
  data?: string;
  sources?: { url: string; title: string }[];
  responseTime?: number;
  error?: string;
}

interface GPTConfig {
  provider: 'aiml' | 'openai';
  model: 'gpt-5-nano';
  verbosity: 'low' | 'medium' | 'high';
  reasoning: 'minimal' | 'low' | 'medium' | 'high';
  webSearch: boolean;
  codeInterpreter: boolean;
}

export class GPTService {
  private static getConfig(): GPTConfig {
    // Get from localStorage or default to AIML + GPT-5 nano
    const savedConfig = localStorage.getItem('gpt-config');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    return { provider: 'aiml', model: 'gpt-5-nano', verbosity: 'low', reasoning: 'minimal', webSearch: false, codeInterpreter: false };
  }

  static setConfig(config: GPTConfig): void {
    localStorage.setItem('gpt-config', JSON.stringify(config));
  }

  private static async callGPT(
    messages: Array<{ role: string; content: string }>,
    userId?: string
  ): Promise<GPTResponse> {
    const config = this.getConfig();
    
    try {
      const { data, error } = await supabase.functions.invoke('gpt-chat', {
        body: {
          messages,
          userId,
          provider: config.provider,
          model: config.model,
          verbosity: config.verbosity,
          reasoning: config.reasoning,
          webSearch: config.webSearch,
          codeInterpreter: config.codeInterpreter
        }
      });

      if (error) {
        console.error('GPT API error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data.response, sources: data.sources, responseTime: data.responseTime };
    } catch (error) {
      console.error('GPT service error:', error);
      return { success: false, error: 'Failed to connect to AI service' };
    }
  }

  static async probingChat(userMessage: string, chatHistory: Message[], userId?: string): Promise<GPTResponse> {
    const systemPrompt = PROMPTS.PROBING_CHAT;

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

    const systemPrompt = PROMPTS.KEYWORD_EXTRACTION;

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

    const systemPrompt = PROMPTS.MEDITATION_GENERATION;

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