
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ask-ai-chat-blue.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Input validation function
function validateInput(question: string): { isValid: boolean; error?: string } {
  if (!question || typeof question !== 'string') {
    return { isValid: false, error: 'Question is required and must be a string' };
  }
  
  if (question.length > 1000) {
    return { isValid: false, error: 'Question must be 1000 characters or less' };
  }
  
  // Basic content filtering - block inappropriate content
  const inappropriatePatterns = [
    /\b(kill|suicide|harm|hurt|die|death)\s+(myself|yourself|someone)\b/i,
    /\b(how\s+to\s+)?(kill|murder|harm|hurt)\b/i,
    /\b(bomb|weapon|drug|illegal)\b/i,
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(question)) {
      return { isValid: false, error: 'Content not allowed. Please ask mindfulness and wellness related questions.' };
    }
  }
  
  return { isValid: true };
}

// Rate limiting function
function checkRateLimit(userId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (userLimit.count >= maxRequests) {
    return { allowed: false, error: 'Rate limit exceeded. Please wait before making another request.' };
  }
  
  // Increment count
  rateLimitStore.set(userId, { count: userLimit.count + 1, resetTime: userLimit.resetTime });
  return { allowed: true };
}

// Sanitize input to prevent injection attacks
function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { question, userId, chatId, sessionId } = await req.json()
    
    console.log('Received request:', { question: question?.substring(0, 100), userId, chatId, sessionId })

    // Validate required fields
    if (!question || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate and sanitize input
    const validation = validateInput(question);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const sanitizedQuestion = sanitizeInput(question);
    
    console.log('Processing sanitized question:', sanitizedQuestion.substring(0, 100))

    // Mock AI response for testing - replace with actual webhook when available
    const mockResponse = {
      answer: `Thank you for your question about "${sanitizedQuestion.substring(0, 50)}...". This is a mindfulness-focused response. In mindfulness practice, we often explore questions through the lens of present-moment awareness and inner observation. Consider taking a few deep breaths and noticing what arises within you as you contemplate this topic. Remember, true insight often comes from patient, compassionate self-inquiry rather than quick answers.`,
      suggestedQuestions: [
        "How can I practice mindfulness in daily life?",
        "What are some breathing techniques for anxiety?",
        "How do I develop self-compassion?",
        "What is meditation and how do I start?"
      ]
    };

    // For now, use mock response. Uncomment below when webhook is available:
    /*
    const webhookUrl = 'https://eotool.app.n8n.cloud/webhook/ask-ai-chat'
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: sanitizedQuestion,
        userId,
        chatId,
        sessionId
      })
    })

    if (!webhookResponse.ok) {
      console.error('Webhook request failed:', webhookResponse.status, webhookResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Sorry, I encountered an error while processing your request. Please try again.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const responseData = await webhookResponse.json()
    */

    console.log('Sending mock response')

    return new Response(
      JSON.stringify(mockResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in webhook handler:', error)
    
    // Return generic error message to user
    return new Response(
      JSON.stringify({ error: 'Sorry, I encountered an error while processing your request. Please try again.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
