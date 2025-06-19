
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Log the incoming request
    console.log('Received webhook request:', { question, userId, chatId, sessionId })

    // Forward the request to the n8n webhook
    const n8nResponse = await fetch('https://sreen8n.app.n8n.cloud/webhook/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        sessionId: sessionId || userId,
        userId,
        chatId
      }),
    })

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
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
