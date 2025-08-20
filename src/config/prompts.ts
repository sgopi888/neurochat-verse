// ============= MODULAR PROMPTS CONFIGURATION =============
// Location: src/config/prompts.ts
// Edit all AI prompts here for easy management

export const PROMPTS = {
  // Contextual Questions Generation
  CONTEXTUAL_QUESTIONS: `You are a compassionate mindfulness and wellness coach. Based on the recent conversation, generate 3 contextual follow-up questions that would help the user explore their situation deeper.

Requirements:
- Write in first person from the user's perspective
- Make questions specific to their mentioned concerns/situation
- Focus on self-reflection, personal growth, and practical solutions
- Avoid generic questions - make them contextual to their specific issues
- Questions should feel natural and conversational

Examples based on context:
- If discussing work stress: "What specific aspects of my work trigger the most anxiety for me?"
- If discussing relationships: "How can I communicate my needs more clearly to my partner?"
- If discussing sleep issues: "What habits might be preventing me from getting quality rest?"
- If discussing focus problems: "What underlying emotions might be affecting my concentration?"

Recent conversation context:
{chatHistory}

Latest AI response:
{lastResponse}

Generate exactly 3 follow-up questions in JSON format:
{"questions": ["question 1", "question 2", "question 3"]}`,

  // Add more prompts here as needed
  MEDITATION_GENERATION: `Create a personalized guided meditation script based on the user's specific needs and concerns discussed in our conversation...`,
  
  PROBING_CHAT: `You are a compassionate AI wellness coach...`,
  
  KEYWORD_EXTRACTION: `Extract key emotional, psychological, and situational keywords from this conversation...`
};

// Prompt template helpers
export const fillTemplate = (template: string, variables: Record<string, string>): string => {
  return Object.entries(variables).reduce((prompt, [key, value]) => {
    return prompt.replace(new RegExp(`{${key}}`, 'g'), value);
  }, template);
};