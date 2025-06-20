
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('TTS function called - parsing request body')
    const { text, voice = 'Drew' } = await req.json()
    
    if (!text) {
      console.error('TTS Error: No text provided')
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`TTS request - Text length: ${text.length}, Voice: ${voice}`)

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('TTS Error: No authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('TTS Error: Invalid auth token', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`TTS request for user: ${user.id}`)

    // Check daily usage limits using the fixed function
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_or_create_daily_usage', { p_user_id: user.id })

    if (usageError) {
      console.error('TTS Error: Usage check failed', usageError)
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Usage data retrieved:', usageData)

    const usage = usageData?.[0]
    const dailyTTSLimit = 10

    if (usage && usage.tts_requests_count >= dailyTTSLimit) {
      console.log(`TTS limit reached for user ${user.id}: ${usage.tts_requests_count}/${dailyTTSLimit}`)
      return new Response(
        JSON.stringify({ 
          error: 'Daily TTS limit reached',
          usage: {
            daily_tts_used: usage.tts_requests_count,
            daily_tts_limit: dailyTTSLimit
          }
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Map voice names to ElevenLabs voice IDs
    const voiceMap = {
      'James': 'cgSgspJ2msm6clMCkdW9',
      'Cassidy': 'XB0fDUnXU5powFXDhCwa', 
      'Drew': 'LcfcDJNUP1GQjkzn1xUU',
      'Lavender': 'XrExE9yKIg1WjnnlVkGX'
    }

    const voiceId = voiceMap[voice as keyof typeof voiceMap] || voiceMap.Drew
    console.log(`Using voice ID: ${voiceId} for voice: ${voice}`)

    // Generate speech with ElevenLabs
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      console.error('TTS Error: ElevenLabs API key not configured')
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Calling ElevenLabs API...')
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    )

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', elevenLabsResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${elevenLabsResponse.status}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    console.log(`Audio generated, size: ${audioBuffer.byteLength} bytes`)
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('TTS Error: No audio data received from ElevenLabs')
      return new Response(
        JSON.stringify({ error: 'No audio data received' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update usage count using UPSERT pattern
    console.log('Updating usage count...')
    const currentDate = new Date().toISOString().split('T')[0]
    
    const { error: updateError } = await supabase
      .from('user_usage_limits')
      .upsert({
        user_id: user.id,
        date: currentDate,
        tts_requests_count: (usage?.tts_requests_count || 0) + 1,
        monthly_tts_count: (usage?.monthly_tts_count || 0) + 1,
        chat_queries_count: usage?.chat_queries_count || 0,
        monthly_chat_count: usage?.monthly_chat_count || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })

    if (updateError) {
      console.error('Failed to update usage:', updateError)
      // Don't fail the request if usage update fails, just log it
    } else {
      console.log('Usage count updated successfully')
    }

    // Convert ArrayBuffer to base64
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    console.log('TTS generation completed successfully')

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        usage: {
          daily_tts_used: (usage?.tts_requests_count || 0) + 1,
          daily_tts_limit: dailyTTSLimit
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in text-to-speech function:', error)
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
