
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
    const { text, voice = 'James' } = await req.json()
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check daily usage limits
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_or_create_daily_usage', { p_user_id: user.id })

    if (usageError) {
      console.error('Usage check error:', usageError)
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const usage = usageData?.[0]
    const dailyTTSLimit = 10

    if (usage && usage.tts_requests_count >= dailyTTSLimit) {
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

    const voiceId = voiceMap[voice as keyof typeof voiceMap] || voiceMap.James

    // Generate speech with ElevenLabs
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
      console.error('ElevenLabs API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'No audio data received' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update usage count using proper SQL syntax
    const { error: updateError } = await supabase
      .from('user_usage_limits')
      .update({ 
        tts_requests_count: (usage?.tts_requests_count || 0) + 1,
        monthly_tts_count: (usage?.monthly_tts_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().split('T')[0])

    if (updateError) {
      console.error('Failed to update usage:', updateError)
      // Don't fail the request if usage update fails, just log it
    }

    // Convert ArrayBuffer to base64
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
