
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, recentMessages } = await req.json();

    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get auth header and create authenticated client
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabase.auth.setAuth(authHeader.replace('Bearer ', ''));
    }

    // Build context from recent messages
    let conversationContext = '';
    if (recentMessages && recentMessages.length > 0) {
      conversationContext = recentMessages
        .slice(-6) // Last 6 messages for context
        .map((msg: ChatMessage) => `${msg.is_user ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n');
    }

    // Generate contextual questions using DeepSeek
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are Neuroheart.AI, a mindfulness and wellness coach. Based on the conversation context, generate 3 thoughtful follow-up questions that:
            1. Are relevant to neuroheart mindfulness themes (heart coherence, emotional regulation, stress management, mindful living)
            2. Build naturally on the recent conversation
            3. Encourage deeper self-reflection and growth
            4. Are concise (max 10 words each)
            
            Format: Return only a JSON array of 3 strings, nothing else.
            Example: ["How did that make you feel?", "What triggers this pattern?", "Try a breathing exercise?"]`
          },
          {
            role: 'user',
            content: `Recent conversation:\n${conversationContext}\n\nGenerate 3 contextual follow-up questions:`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    let suggestedQuestions;

    try {
      suggestedQuestions = JSON.parse(deepseekData.choices[0].message.content);
    } catch (parseError) {
      console.warn('Failed to parse DeepSeek response, using fallback questions');
      // Fallback questions based on mindfulness themes
      suggestedQuestions = [
        "How are you feeling right now?",
        "What's on your mind today?",
        "Need help with stress?"
      ];
    }

    // Ensure we have exactly 3 questions
    if (!Array.isArray(suggestedQuestions) || suggestedQuestions.length !== 3) {
      suggestedQuestions = [
        "How can I support you today?",
        "What's bringing you here?",
        "Ready for mindfulness practice?"
      ];
    }

    console.log('Generated contextual questions:', suggestedQuestions);

    return new Response(
      JSON.stringify({ 
        questions: suggestedQuestions,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating contextual questions:', error);
    
    // Return fallback questions on error
    const fallbackQuestions = [
      "How are you feeling today?",
      "What's on your mind?",
      "Need mindfulness guidance?"
    ];
    
    return new Response(
      JSON.stringify({ 
        questions: fallbackQuestions,
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Still return 200 to provide fallback questions
      }
    );
  }
});
