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
  sources?: Array<{ url: string; title: string }>;
  followUpQuestions?: string[];
  responseTime?: number;
  error?: string;
}

interface GPTConfig {
  provider: 'aiml' | 'openai';
  model: string;
  verbosity: 'low' | 'medium' | 'high';
  reasoning: 'low' | 'medium' | 'high';
  webSearch: boolean;
  codeInterpreter: boolean;
  ragEnabled: boolean;
}

export class GPTService {
  private static getConfig(): GPTConfig {
    const savedConfig = localStorage.getItem('gpt-config');
    const defaultConfig: GPTConfig = {
      provider: 'openai',
      model: 'gpt-5-nano-2025-08-07',
      verbosity: 'low',
      reasoning: 'medium',
      webSearch: false,
      codeInterpreter: false,
      ragEnabled: false // Default to OFF as requested
    };
    
    if (savedConfig) {
      try {
        return { ...defaultConfig, ...JSON.parse(savedConfig) };
      } catch (error) {
        console.error('Failed to parse GPT config:', error);
        return defaultConfig;
      }
    }
    
    return defaultConfig;
  }

  static setConfig(config: GPTConfig): void {
    // enforce mutual exclusivity
    let next = { ...config };

    if (next.webSearch) {
      next.ragEnabled = false;
    }
    if (next.ragEnabled) {
      next.webSearch = false;
    }

    localStorage.setItem('gpt-config', JSON.stringify(next));
  }

  private static async callGPT(
    messages: Array<{ role: string; content: string }>,
    userId?: string
  ): Promise<GPTResponse> {
    const config = this.getConfig();
    
    console.log('🤖 GPT Service: Using config', config);
    
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

      return { 
        success: true, 
        data: data.response, 
        sources: data.sources, 
        followUpQuestions: data.followUpQuestions || [],
        responseTime: data.responseTime 
      };
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

  static async probingChatWithChunks(
    userMessage: string, 
    chatHistory: Message[], 
    chunks: string[], 
    userId?: string
  ): Promise<GPTResponse> {
    const systemPrompt = PROMPTS.PROBING_CHAT;
    
    // Add chunks context if available
    let contextualPrompt = systemPrompt;
    if (chunks.length > 0) {
      const chunksContext = chunks.join('\n\n---\n\n');
      contextualPrompt += `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${chunksContext}\n\nUse this context to inform your response, but maintain your warm, conversational tone.`;
    }

    const messages = [
      { role: 'system', content: contextualPrompt },
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