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
  codeInterpreter: boolean;
  mode: 'none' | 'rag' | 'web';
}

export class GPTService {
  private static getConfig(): GPTConfig {
    const savedConfig = localStorage.getItem('gpt-config');
    const defaultConfig: GPTConfig = {
      provider: 'openai',
      model: 'gpt-5-nano-2025-08-07',
      verbosity: 'low',
      reasoning: 'medium',
      codeInterpreter: false,
      mode: 'none'
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
    localStorage.setItem('gpt-config', JSON.stringify(config));
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
          webSearch: config.mode === 'web',
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
      }))
      // Note: Original user message is NOT included - chunks provide the context
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

  static async extractConcepts(userMessage: string, chatHistory: Message[] = [], userId?: string): Promise<GPTResponse> {
    const conceptPrompt = `You are a concept extractor for conversational queries.  
Your task:  
1. Remove stopwords, filler, and conversational chatter.  
2. Identify **all core concepts** explicitly present in the query.  
3. Suggest **additional potential related concepts** that might appear in relevant documents.  
4. Provide output in three fields:  
   - explicit_concepts = [...]  
   - potential_concepts = [...]  
   - concepts = [...] (union of both lists, unique, lowercased)  
5. Ignore URLs, links, emojis, and greetings.  

### Examples

Query: "I am feeling stressed and headache today. Too much work pressure"  
Output:  
explicit_concepts = ["stress", "headache", "work pressure"]  
potential_concepts = ["mental health", "burnout", "anxiety", "fatigue", "overwork", "job stress"]  
concepts = ["stress", "headache", "work pressure", "mental health", "burnout", "anxiety", "fatigue", "overwork", "job stress"]

Query: "Can't sleep, I watched some random videos on youtube and now my eyes hurt badly"  
Output:  
explicit_concepts = ["insomnia", "eye pain"]  
potential_concepts = ["sleep disorder", "screen fatigue", "circadian rhythm", "digital eye strain"]  
concepts = ["insomnia", "eye pain", "sleep disorder", "screen fatigue", "circadian rhythm", "digital eye strain"]

Query: "Been anxious and nervous lately, link here: https://reddit.com/something"  
Output:  
explicit_concepts = ["anxiety", "nervousness"]  
potential_concepts = ["panic", "stress", "mental health", "emotional regulation"]  
concepts = ["anxiety", "nervousness", "panic", "stress", "mental health", "emotional regulation"]

### Now process the following query:

{user_query}`;

    const messages = [
      { role: 'system', content: conceptPrompt },
      { role: 'user', content: userMessage }
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

  static async getRagChunks(userMessage: string, userId?: string, mode?: string): Promise<string[]> {
    const config = this.getConfig();
    const ragMode = mode || config.mode;
    if (ragMode !== 'rag') return [];

    try {
      console.log('🎯 RAG: Extracting concepts for search...');
      
      // Step 1: Extract concepts
      const conceptsResponse = await this.extractConcepts(userMessage, [], userId);
      let searchQuery = userMessage; // fallback
      
      if (conceptsResponse.success && conceptsResponse.data) {
        try {
          // Try to parse the concepts from the response
          const conceptsText = conceptsResponse.data;
          // Look for the concepts array in the response
          const conceptsMatch = conceptsText.match(/concepts\s*=\s*\[(.*?)\]/);
          if (conceptsMatch) {
            const conceptsStr = conceptsMatch[1];
            // Extract quoted concepts
            const concepts = conceptsStr.match(/"([^"]+)"/g)?.map(c => c.replace(/"/g, '')) || [];
            if (concepts.length > 0) {
              searchQuery = concepts.join(' ');
              console.log('✅ Using extracted concepts:', concepts);
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to parse concepts, using original message');
        }
      }

      // Step 2: Call n8n directly (like working code)
      console.log('🎯 RAG: Calling n8n directly with query:', searchQuery);
      const res = await fetch("https://sreen8n.app.n8n.cloud/webhook/neuroneuro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_query: searchQuery,   // n8n expects this
          sessionId: `user_${userId || 'anon'}_${Date.now()}`
        })
      });

      const data = await res.json();
      const reply = data?.reply || data?.message || "";
      console.log('✅ RAG: Retrieved from n8n:', reply ? 'success' : 'no reply');
      
      return reply ? [reply] : [];
    } catch (error) {
      console.error('❌ RAG: getRagChunks error:', error);
      return [];
    }
  }

}