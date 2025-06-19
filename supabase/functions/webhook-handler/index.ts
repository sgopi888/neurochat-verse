
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://obgbnrasiyozdnmoixxx.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Content filtering - basic inappropriate content detection
const inappropriatePatterns = [
  /\b(suicide|kill\s+myself|end\s+it\s+all)\b/i,
  /\b(nazi|hitler|genocide)\b/i,
  /\b(f\*ck|sh\*t|damn|hell)\b/i,
  /\b(hack|exploit|inject|script)\b/i,
]

function checkRateLimit(userId: string, maxRequests: number = 10): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const key = `webhook_${userId}`
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

function containsInappropriateContent(text: string): boolean {
  return inappropriatePatterns.some(pattern => pattern.test(text))
}

function validateInput(question: string): { isValid: boolean; error?: string } {
  if (!question || typeof question !== 'string') {
    return { isValid: false, error: 'Question is required' }
  }
  
  if (question.length > 1000) {
    return { isValid: false, error: 'Question too long' }
  }
  
  if (question.trim().length < 3) {
    return { isValid: false, error: 'Question too short' }
  }
  
  if (containsInappropriateContent(question)) {
    return { isValid: false, error: 'Content not allowed' }
  }
  
  return { isValid: true }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { question, userId, chatId, sessionId } = await req.json()

    // Rate limiting check
    if (!checkRateLimit(userId, 10)) {
      console.log(`Rate limit exceeded for user: ${userId}`)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Input validation
    const validation = validateInput(question)
    if (!validation.isValid) {
      console.log(`Input validation failed: ${validation.error}`)
      return new Response(
        JSON.stringify({ error: 'Invalid input provided.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize input
    const sanitizedQuestion = sanitizeInput(question)

    // Log the incoming request (without sensitive data)
    console.log('Processing question request', { userId, chatId, questionLength: sanitizedQuestion.length })

    // Forward the request to the n8n webhook
    const n8nResponse = await fetch('https://sreen8n.app.n8n.cloud/webhook/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: sanitizedQuestion,
        sessionId: sessionId || userId,
        userId,
        chatId
      }),
    })

    if (!n8nResponse.ok) {
      console.error('N8N API error:', n8nResponse.status, n8nResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable. Please try again.' }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const n8nData = await n8nResponse.json()
    
    // Generate suggested questions based on the AI response
    const suggestedQuestions = [
      "Can you explain this in more detail?",
      "What are the practical applications?",
      "Are there any related topics I should know about?"
    ]

    // Save suggested questions to database if chatId is provided
    if (chatId && suggestedQuestions.length > 0) {
      for (const question of suggestedQuestions) {
        await supabaseClient
          .from('suggested_questions')
          .insert({
            chat_id: chatId,
            question: question
          })
      }
    }

    // Return the response with suggested questions
    return new Response(
      JSON.stringify({
        ...n8nData,
        suggestedQuestions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in webhook handler:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
