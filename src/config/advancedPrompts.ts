export interface AdvancedPromptConfig {
  toneInstruction: string;
  schemaHint: string;
  verbosityLevel: 'low' | 'high';
  reasoningEffort: 'low' | 'medium' | 'high';
  tools: any[];
}

export const buildSchemaHint = (
  requiredKeys: string[],
  enableWeb: boolean = false
): string => {
  let schemaHint =
    "Return output strictly as JSON with keys: " +
    requiredKeys.join(", ") +
    ". Do not include any other keys.";

  if (enableWeb) {
    schemaHint +=
      " For sources, output an array of objects with fields: title, url, published_date (YYYY-MM-DD). " +
      "Use the web_search tool to cite 2–3 high-quality, recent sources.";
  }

  return schemaHint;
};

export const buildMeditationContent = (userConcern: string, config: AdvancedPromptConfig, shortOnly: boolean = false) => {
  const content = [
    { type: "input_text", text: config.schemaHint },
    { type: "input_text", text: `${config.toneInstruction} Now: Write a meditation about ${userConcern} tailored to this style.` }
  ];

  if (!shortOnly) {
    content.push({ type: "input_text", text: "Write a short 1-minute meditation in the same style." });
  }

  content.push({ type: "input_text", text: "Suggest 3 follow-up reflective questions based on the session so far." });

  return content;
};

export const ADVANCED_PROMPTS = {
  MEDITATION_WITH_STRUCTURE: (config: AdvancedPromptConfig) => {
    return `You are a meditation guide. ${config.toneInstruction} 
    
    Respond with structured content based on the user's concern. ${config.schemaHint}`;
  },

  PROBING_WITH_STRUCTURE: (config: AdvancedPromptConfig) => {
    return `You are an empathetic therapeutic guide. ${config.toneInstruction}
    
    Engage in supportive conversation with the user. ${config.schemaHint}`;
  },

  WEB_ENHANCED_MEDITATION: (config: AdvancedPromptConfig) => {
    return `You are a meditation guide with access to current research. ${config.toneInstruction}
    
    Use web search to find recent meditation techniques and research. ${config.schemaHint}`;
  },

  BPM_ANALYSIS: (bpmData: number[], config: AdvancedPromptConfig) => {
    return `Analyze heart rate variability data. ${config.toneInstruction}
    
    Heart Rate Data (BPM): ${JSON.stringify(bpmData)}
    
    Provide HRV analysis and wellness insights.`;
  }
};

export const createGPT5Input = (messages: Array<{ role: string; content: any }>, config: AdvancedPromptConfig) => {
  return {
    messages: messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content) 
        ? msg.content.map((c: any) => c.type === 'input_text' ? c.text : c.text || c).join('\n')
        : msg.content
    })),
    verbosity: config.verbosityLevel,
    reasoning: config.reasoningEffort,
    tools: config.tools
  };
};