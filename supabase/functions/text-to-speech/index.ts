
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://obgbnrasiyozdnmoixxx.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const voiceIds = {
  Rachel: 'kqVT88a5QfII1HNAEPTJ',
  Cassidy: '9BWtsMINqrJLrRacOk9x'
};

// Rate limiting store for TTS
const ttsRateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkTTSRateLimit(userId: string, maxRequests: number = 5): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const key = `tts_${userId}`
  
  const current = ttsRateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    ttsRateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voice = 'Rachel', userId } = await req.json()
    
    // Rate limiting check
    if (userId && !checkTTSRateLimit(userId, 5)) {
      console.log(`TTS rate limit exceeded for user: ${userId}`)
      return new Response(
        JSON.stringify({ error: 'Too many TTS requests. Please try again later.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate text length for TTS
    if (text.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Text too long for TTS conversion' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    if (!elevenLabsApiKey) {
      console.error('ElevenLabs API key not configured')
      return new Response(
        JSON.stringify({ error: 'TTS service temporarily unavailable' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const voiceId = voiceIds[voice as keyof typeof voiceIds] || voiceIds.Rachel

    console.log(`Generating TTS for voice: ${voice} (${voiceId}), text length: ${text.length}`)

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: 'TTS service temporarily unavailable' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    console.log('TTS generation successful')

    return new Response(
      JSON.stringify({ audio: audioBase64 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in text-to-speech function:', error)
    return new Response(
      JSON.stringify({ error: 'TTS service temporarily unavailable' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
