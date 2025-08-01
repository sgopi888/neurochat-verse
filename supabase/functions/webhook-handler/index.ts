
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting constants
const RATE_LIMIT_REQUESTS = 10 // requests per window
const RATE_LIMIT_WINDOW_MINUTES = 5 // 5 minute window
const MAX_REQUEST_SIZE = 10240 // 10KB

// Input validation constants
const QUESTION_MIN_LENGTH = 1
const QUESTION_MAX_LENGTH = 2000
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Webhook timeout (increased for large responses)
const WEBHOOK_TIMEOUT_MS = 120000 // 2 minutes

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

// Rate limiting functions
async function checkRateLimit(userId: string, endpoint: string = 'webhook-handler'): Promise<{ allowed: boolean; error?: string }> {
  try {
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES)
    
    console.log('Checking rate limit for user:', userId, 'since:', windowStart.toISOString())
    
    // Get existing rate limit record within the current window
    const { data: rateLimitData, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching rate limit:', fetchError)
      return { allowed: true } // Allow on error to prevent blocking users
    }
    
    if (!rateLimitData) {
      // No existing record, create new one
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          endpoint,
          request_count: 1,
          window_start: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Error creating rate limit record:', insertError)
        return { allowed: true } // Allow on error
      }
      
      console.log('Created new rate limit record for user:', userId)
      return { allowed: true }
    }
    
    // Check if we're still within the rate limit
    if (rateLimitData.request_count >= RATE_LIMIT_REQUESTS) {
      console.log('Rate limit exceeded for user:', userId, 'count:', rateLimitData.request_count)
      return { 
        allowed: false, 
        error: `Rate limit exceeded. Maximum ${RATE_LIMIT_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MINUTES} minutes. Please try again later.` 
      }
    }
    
    // Increment the counter
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ 
        request_count: rateLimitData.request_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rateLimitData.id)
    
    if (updateError) {
      console.error('Error updating rate limit:', updateError)
      return { allowed: true } // Allow on error
    }
    
    console.log('Updated rate limit for user:', userId, 'new count:', rateLimitData.request_count + 1)
    return { allowed: true }
    
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true } // Allow on error to prevent blocking users
  }
}

// Enhanced webhook call with timeout and better error handling
async function callWebhookWithTimeout(webhookUrl: string, payload: any): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
  
  try {
    console.log('Calling webhook with timeout:', WEBHOOK_TIMEOUT_MS + 'ms')
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      console.error('Webhook request timed out after', WEBHOOK_TIMEOUT_MS + 'ms')
      throw new Error('Request timeout - the AI service took too long to respond. Please try a shorter request.')
    }
    
    throw error
  }
}

// Safe JSON parsing with better error messages
async function safeParseJson(response: Response): Promise<any> {
  const text = await response.text()
  
  if (!text || text.trim() === '') {
    throw new Error('Empty response from AI service')
  }
  
  try {
    return JSON.parse(text)
  } catch (parseError) {
    console.error('JSON parse error. Response text:', text.substring(0, 500))
    throw new Error('Invalid response format from AI service')
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

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId)
    if (!rateLimitResult.allowed) {
      console.log('Rate limit check failed for user:', userId)
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get webhook URL from secrets
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || 'https://sreen8n.app.n8n.cloud/webhook/trial-webhook'
    
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

    console.log('Calling webhook:', webhookUrl.substring(0, 50) + '...', 'for question length:', question.length)
    
    const webhookResponse = await callWebhookWithTimeout(webhookUrl, {
      question,
      userId,
      chatId,
      sessionId
    })

    if (!webhookResponse.ok) {
      console.error('Webhook request failed:', webhookResponse.status, webhookResponse.statusText)
      
      // Try to get error details from response
      let errorDetails = 'Unknown error'
      try {
        const errorText = await webhookResponse.text()
        if (errorText) {
          errorDetails = errorText.substring(0, 200)
        }
      } catch (e) {
        console.error('Could not read error response:', e)
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from AI service',
          details: `Status: ${webhookResponse.status}, ${errorDetails}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const responseData = await safeParseJson(webhookResponse)
    console.log('Successfully received response from n8n webhook, response length:', JSON.stringify(responseData).length)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in webhook handler:', error)
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 504, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Handle JSON parsing errors
    if (error.message && error.message.includes('response format')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 502, 
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
