
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

    // Convert ArrayBuffer to base64
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    console.log('TTS generation completed successfully')

    return new Response(
      JSON.stringify({ 
        audio: base64Audio
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
