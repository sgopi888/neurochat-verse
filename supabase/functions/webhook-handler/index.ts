
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation constants
const QUESTION_MIN_LENGTH = 1
const QUESTION_MAX_LENGTH = 2000
const MAX_REQUEST_SIZE = 10240 // 10KB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Input validation functions
function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid)
}

function sanitizeInput(input: string): string {
  // Remove potential XSS/injection attempts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

function validateQuestion(question: string): { isValid: boolean; error?: string } {
  if (!question || typeof question !== 'string') {
    return { isValid: false, error: 'Question is required and must be a string' }
  }
  
  if (question.length < QUESTION_MIN_LENGTH) {
    return { isValid: false, error: 'Question is too short' }
  }
  
  if (question.length > QUESTION_MAX_LENGTH) {
    return { isValid: false, error: `Question is too long (max ${QUESTION_MAX_LENGTH} characters)` }
  }
  
  return { isValid: true }
}

function validateRequestBody(body: any): { isValid: boolean; error?: string; data?: any } {
  const { question, userId, chatId, sessionId } = body
  
  // Validate required fields
  if (!question || !userId) {
    return { isValid: false, error: 'Missing required fields: question and userId are required' }
  }
  
  // Validate question
  const questionValidation = validateQuestion(question)
  if (!questionValidation.isValid) {
    return { isValid: false, error: questionValidation.error }
  }
  
  // Validate UUIDs
  if (!isValidUUID(userId)) {
    return { isValid: false, error: 'Invalid userId format' }
  }
  
  if (chatId && !isValidUUID(chatId)) {
    return { isValid: false, error: 'Invalid chatId format' }
  }
  
  if (sessionId && !isValidUUID(sessionId)) {
    return { isValid: false, error: 'Invalid sessionId format' }
  }
  
  // Sanitize inputs
  const sanitizedQuestion = sanitizeInput(question)
  
  return {
    isValid: true,
    data: {
      question: sanitizedQuestion,
      userId,
      chatId,
      sessionId
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check request size
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      console.log('Request too large:', contentLength)
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestBody = await req.json()
    
    console.log('Raw request received:', { 
      question: requestBody.question?.substring(0, 100), 
      userId: requestBody.userId, 
      chatId: requestBody.chatId, 
      sessionId: requestBody.sessionId 
    })

    // Validate request body
    const validation = validateRequestBody(requestBody)
    if (!validation.isValid) {
      console.log('Validation failed:', validation.error)
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { question, userId, chatId, sessionId } = validation.data!
    
    console.log('Validated request:', { 
      question: question.substring(0, 100), 
      userId, 
      chatId, 
      sessionId,
      questionLength: question.length
    })

    // Get webhook URL from secrets
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    
    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL secret not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl)
    } catch {
      console.error('Invalid N8N_WEBHOOK_URL format:', webhookUrl)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Calling webhook:', webhookUrl.substring(0, 50) + '...')
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        userId,
        chatId,
        sessionId
      })
    })

    if (!webhookResponse.ok) {
      console.error('Webhook request failed:', webhookResponse.status, webhookResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI service' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const responseData = await webhookResponse.json()
    console.log('Successfully received response from n8n webhook')

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in webhook handler:', error)
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
