
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lastResponse, chatHistory = [] } = await req.json();

    if (!DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY not found, falling back to static questions');
      return new Response(JSON.stringify({ 
        questions: [
          "Can you tell me more about this topic?",
          "How can I apply this in my daily life?",
          "What other techniques might be helpful?"
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create context from recent chat history
    const recentMessages = chatHistory.slice(-6).map((msg: any) => 
      `${msg.isUser ? 'User' : 'AI'}: ${msg.text}`
    ).join('\n');

    const contextPrompt = `Based on this mindfulness/wellness conversation context:

Recent conversation:
${recentMessages}

Latest AI response: "${lastResponse}"

Generate exactly 3 thoughtful follow-up questions that:
1. Are relevant to the mindfulness/wellness context
2. Help deepen the user's understanding or practice
3. Encourage reflection and growth
4. Are specific to the conversation topic
5. Sound natural and supportive

Focus on themes like: meditation, stress management, emotional wellness, self-care, mindfulness practices, breathing techniques, sleep wellness, relationships, and personal growth.

Return ONLY a JSON array of 3 strings, no other text:`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a mindfulness and wellness expert. Generate thoughtful, supportive follow-up questions that help users deepen their practice and understanding. Always respond with valid JSON array format.'
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content?.trim();

    let questions;
    try {
      questions = JSON.parse(generatedContent);
      
      // Validate that we have an array of strings
      if (!Array.isArray(questions) || questions.length !== 3 || !questions.every(q => typeof q === 'string')) {
        throw new Error('Invalid format from AI');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to context-aware static questions
      questions = getContextualFallbackQuestions(lastResponse);
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-contextual-questions:', error);
    
    // Fallback to static questions
    const fallbackQuestions = [
      "Can you tell me more about this approach?",
      "How can I practice this regularly?",
      "What should I do if I find this challenging?"
    ];

    return new Response(JSON.stringify({ questions: fallbackQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getContextualFallbackQuestions(lastResponse: string): string[] {
  const response = lastResponse.toLowerCase();
  
  if (response.includes('meditat') || response.includes('mindful')) {
    return [
      "How can I maintain focus during meditation?",
      "What's the best time of day to meditate?",
      "Can you guide me through a specific technique?"
    ];
  }
  
  if (response.includes('stress') || response.includes('anxiet')) {
    return [
      "What are some quick stress-relief techniques?",
      "How can I manage anxiety in the moment?",
      "What breathing exercises work best for stress?"
    ];
  }
  
  if (response.includes('sleep') || response.includes('rest')) {
    return [
      "How can I create a better bedtime routine?",
      "What helps calm the mind before sleep?",
      "Are there specific techniques for better sleep quality?"
    ];
  }
  
  return [
    "Can you tell me more about this topic?",
    "How can I apply this in my daily life?",
    "What other techniques might be helpful?"
  ];
}
