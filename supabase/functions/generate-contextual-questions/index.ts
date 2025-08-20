import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AIMLAPI_KEY = Deno.env.get('AIMLAPI_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lastResponse = '', chatHistory = [] } = await req.json();
    console.log('🤔 Generating contextual questions for response length:', lastResponse.length);

    if (!AIMLAPI_KEY) {
      console.warn('AIMLAPI_KEY not found, using fallback questions');
      return new Response(JSON.stringify({ 
        questions: getContextualFallbackQuestions(lastResponse) 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare conversation context (last 4 messages max)
    const recentHistory = chatHistory.slice(-4).map((msg: any) => 
      `${msg.isUser ? 'User' : 'AI'}: ${msg.text}`
    ).join('\n');

    const prompt = `You are a compassionate mindfulness and wellness coach. Based on the recent conversation, generate 3 contextual follow-up questions that would help the user explore their situation deeper.

Requirements:
- Write in first person from the user's perspective 
- Make questions specific to their mentioned concerns/situation as in chatHistory
- Avoid generic questions - make them contextual to their specific issues
- Questions should feel natural and conversational and continuing chatHistory

Examples based on context:
- If discussing work stress: "How can meditation help me to reduce anxiety?"
- If discussing relationships: "How can I communicate my needs more clearly to my partner without anger emotions?"
- If discussing sleep issues: "What daily emotional interactions might be preventing me from getting quality rest?"
- If discussing focus problems: "What underlying emotions might be affecting my concentration?"

These are not content; Reply this not literally but as per chatHistory below only

Recent conversation context chatHistory:
${recentHistory}

Latest AI response:
${lastResponse}

Instructions: must generated as a following questions based on Recent conversation context above and not generic; These are likely question user may have in mind once this AI response is read.
Generate exactly 3 follow-up questions in JSON format:
{"questions": ["question 1", "question 2", "question 3"]}`;

    console.log('🚀 Calling AIML API with GPT-5-nano for contextual questions');
    console.log('📝 Chat history length:', chatHistory.length);
    console.log('📝 Recent history:', recentHistory);

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIMLAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AIML API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        questions: getContextualFallbackQuestions(lastResponse) 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('✅ AIML API response received');

    if (data.choices?.[0]?.message?.content) {
      try {
        const questionsResponse = JSON.parse(data.choices[0].message.content);
        
        if (questionsResponse.questions && Array.isArray(questionsResponse.questions)) {
          console.log('✅ Generated contextual questions:', questionsResponse.questions);
          return new Response(JSON.stringify({ 
            questions: questionsResponse.questions.slice(0, 3) 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error('❌ Error parsing questions JSON:', parseError);
      }
    }

    // Fallback if parsing fails
    console.log('⚠️ Using fallback questions');
    return new Response(JSON.stringify({ 
      questions: getContextualFallbackQuestions(lastResponse) 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-contextual-questions:', error);
    
    return new Response(JSON.stringify({ 
      questions: [
        "Can you tell me more about what I'm experiencing?",
        "How has this been affecting my daily life?",
        "What would help me feel better about this situation?"
      ]
    }), {
      status: 200, // Still return 200 with fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getContextualFallbackQuestions(lastResponse: string): string[] {
  const response = lastResponse.toLowerCase();
  
  // Meditation and mindfulness
  if (response.includes('meditat') || response.includes('mindful')) {
    return [
      "How can I make meditation a consistent part of my daily routine?",
      "What's holding me back from maintaining focus during meditation?",
      "How can I use mindfulness to better manage my stress?"
    ];
  }

  // Stress and anxiety
  if (response.includes('stress') || response.includes('anxiet') || response.includes('worry')) {
    return [
      "What are the main sources of stress in my life right now?",
      "How can I better recognize when my anxiety is starting to build up?",
      "What coping strategies have worked for me in the past?"
    ];
  }

  // Sleep issues
  if (response.includes('sleep') || response.includes('rest') || response.includes('insomnia')) {
    return [
      "What thoughts keep me awake at night?",
      "How can I create a more peaceful bedtime environment?",
      "What habits might be interfering with my sleep quality?"
    ];
  }

  // Relationships
  if (response.includes('relationship') || response.includes('communication') || response.includes('conflict')) {
    return [
      "How can I better express my needs in my relationships?",
      "What patterns do I notice in my relationship conflicts?",
      "How can I set healthier boundaries with the people in my life?"
    ];
  }

  // Work and productivity
  if (response.includes('work') || response.includes('productiv') || response.includes('focus')) {
    return [
      "What aspects of my work bring me the most stress?",
      "How can I create better work-life balance for myself?",
      "What would help me stay more focused on important tasks?"
    ];
  }

  // Emotional processing
  if (response.includes('emotion') || response.includes('anger') || response.includes('sad')) {
    return [
      "What emotions am I having trouble processing right now?",
      "How can I create more space for my feelings?",
      "What would help me feel more emotionally balanced?"
    ];
  }

  // Default contextual questions
  return [
    "What would be most helpful for me to explore right now?",
    "How can I apply this insight to improve my daily life?",
    "What small step could I take today to move forward?"
  ];
}