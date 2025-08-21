import { supabase } from '@/integrations/supabase/client';
import { ADVANCED_PROMPTS, createGPT5Input, type AdvancedPromptConfig } from '@/config/advancedPrompts';
import type { AdvancedSettings } from '@/hooks/useAdvancedSettings';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AdvancedGPTResponse {
  success: boolean;
  data?: any;
  error?: string;
  structured?: boolean;
}

export class AdvancedGPTService {
  private static async callGPT5(
    messages: Array<{ role: string; content: any }>,
    config: AdvancedPromptConfig,
    userId?: string
  ): Promise<AdvancedGPTResponse> {
    try {
      // Create GPT-5-nano compatible request
      const gpt5Input = createGPT5Input(messages, config);

      const { data, error } = await supabase.functions.invoke('gpt-5-chat', {
        body: {
          model: 'gpt-5-nano',
          ...gpt5Input,
          userId
        }
      });

      if (error) {
        console.error('GPT-5 API error:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data.response,
        structured: config.schemaHint.includes('JSON')
      };
    } catch (error) {
      console.error('Advanced GPT service error:', error);
      return { success: false, error: 'Failed to connect to GPT-5 service' };
    }
  }

  static async enhancedMeditationGeneration(
    userMessage: string,
    chatHistory: Message[],
    settings: AdvancedSettings,
    userId?: string
  ): Promise<AdvancedGPTResponse> {
    if (!settings.useAdvancedMode) {
      // Fallback to basic service
      const { GPTService } = await import('@/services/gptService');
      return GPTService.probingChat(userMessage, chatHistory, userId);
    }

    const config: AdvancedPromptConfig = {
      toneInstruction: this.getToneInstruction(settings.reasoningEffort),
      schemaHint: this.getSchemaHint(settings),
      verbosityLevel: settings.verbosityLevel,
      reasoningEffort: settings.reasoningEffort,
      tools: this.getTools(settings)
    };

    const systemPrompt = ADVANCED_PROMPTS.MEDITATION_WITH_STRUCTURE(config);

    const messages = [
      { 
        role: 'system', 
        content: [{ type: 'input_text', text: systemPrompt }]
      },
      ...chatHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: [{ type: 'input_text', text: msg.text }]
      })),
      { 
        role: 'user', 
        content: [{ type: 'input_text', text: userMessage }]
      }
    ];

    return this.callGPT5(messages, config, userId);
  }

  static async bpmAnalysis(
    bpmData: number[],
    settings: AdvancedSettings,
    userId?: string
  ): Promise<AdvancedGPTResponse> {
    if (!settings.enableCode || !settings.useAdvancedMode) {
      return { success: false, error: 'Code interpreter not enabled' };
    }

    const config: AdvancedPromptConfig = {
      toneInstruction: this.getToneInstruction(settings.reasoningEffort),
      schemaHint: '',
      verbosityLevel: settings.verbosityLevel,
      reasoningEffort: settings.reasoningEffort,
      tools: [{ type: "code_interpreter", container: { type: "auto" } }]
    };

    const systemPrompt = ADVANCED_PROMPTS.BPM_ANALYSIS(bpmData, config);

    const messages = [
      { 
        role: 'user', 
        content: [{ type: 'input_text', text: systemPrompt }]
      }
    ];

    return this.callGPT5(messages, config, userId);
  }

  static async webEnhancedMeditation(
    userConcern: string,
    chatHistory: Message[],
    settings: AdvancedSettings,
    userId?: string
  ): Promise<AdvancedGPTResponse> {
    if (!settings.enableWeb || !settings.useAdvancedMode) {
      return { success: false, error: 'Web search not enabled' };
    }

    const config: AdvancedPromptConfig = {
      toneInstruction: this.getToneInstruction(settings.reasoningEffort),
      schemaHint: this.getSchemaHint(settings),
      verbosityLevel: settings.verbosityLevel,
      reasoningEffort: settings.reasoningEffort,
      tools: [{ type: "web_search_preview", search_context_size: "low" }]
    };

    const systemPrompt = ADVANCED_PROMPTS.WEB_ENHANCED_MEDITATION(config);

    const messages = [
      { 
        role: 'system', 
        content: [{ type: 'input_text', text: systemPrompt }]
      },
      { 
        role: 'user', 
        content: [{ type: 'input_text', text: `Create a meditation about: ${userConcern}. Search for recent research and techniques related to this topic.` }]
      }
    ];

    return this.callGPT5(messages, config, userId);
  }

  // Helper methods
  private static getToneInstruction(reasoningEffort: 'low' | 'medium' | 'high'): string {
    switch (reasoningEffort) {
      case 'low':
        return "Style: practical, non-esoteric, concrete steps, short cues. Avoid metaphysical/Scripture terms. Keep language plain and actionable.";
      case 'medium':
        return "Style: balanced, blend of practical guidance with light reflective depth. Use gentle metaphors or simple analogies. Keep tone encouraging but clear.";
      case 'high':
        return "Style: deep, reflective, layered reasoning with structured argumentation. Integrate nuanced insights, contextual framing, and careful progression. Allow more length and complexity while staying coherent.";
      default:
        return "Style: default, concise, and neutral.";
    }
  }

  private static getSchemaHint(settings: AdvancedSettings): string {
    const keys = ["meditation", "short_meditation", "followup_questions"];
    if (settings.enableWeb) {
      keys.push("fresh_wisdom", "sources");
    }
    
    let hint = `Return output strictly as JSON with keys: ${keys.join(", ")}. Do not include any other keys.`;
    
    if (settings.enableWeb) {
      hint += " For sources, output an array of objects with fields: title, url, published_date (YYYY-MM-DD). Use the web_search tool to cite 2–3 high-quality, recent sources.";
    }
    
    return hint;
  }

  private static getTools(settings: AdvancedSettings): any[] {
    const tools = [];
    if (settings.enableWeb) {
      tools.push({ type: "web_search_preview", search_context_size: "low" });
    }
    if (settings.enableCode) {
      tools.push({ type: "code_interpreter", container: { type: "auto" } });
    }
    return tools;
  }

  static parseStructuredResponse(response: any): {
    meditation?: string;
    shortMeditation?: string;
    followupQuestions?: string[];
    freshWisdom?: string;
    sources?: Array<{title: string; url: string; published_date: string}>;
    codeOutput?: any;
  } | null {
    try {
      if (typeof response === 'string') {
        // Try to parse JSON from string
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            meditation: parsed.meditation,
            shortMeditation: parsed.short_meditation,
            followupQuestions: parsed.followup_questions,
            freshWisdom: parsed.fresh_wisdom,
            sources: parsed.sources
          };
        }
      } else if (typeof response === 'object') {
        // Direct object response
        return {
          meditation: response.meditation,
          shortMeditation: response.short_meditation,
          followupQuestions: response.followup_questions,
          freshWisdom: response.fresh_wisdom,
          sources: response.sources,
          codeOutput: response.code_output
        };
      }
    } catch (error) {
      console.error('Failed to parse structured response:', error);
    }
    
    return null;
  }
}