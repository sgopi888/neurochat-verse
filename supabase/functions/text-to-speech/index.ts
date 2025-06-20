import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    
    console.log(`TTS request received - Voice: ${voice}, Text length: ${text?.length || 0}, User: ${userId}`)
    
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
      console.error('No text provided for TTS')
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
      console.error(`Text too long for TTS: ${text.length} characters`)
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
      console.error('ElevenLabs API key not found in environment')
      return new Response(
        JSON.stringify({ error: 'TTS service not configured - missing API key' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const voiceId = voiceIds[voice as keyof typeof voiceIds] || voiceIds.Rachel

    console.log(`Generating TTS with ElevenLabs - Voice: ${voice} (${voiceId})`)

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
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    })

    console.log(`ElevenLabs API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', response.status, errorText)
      
      // Parse error for more specific messages
      let errorMessage = 'TTS service temporarily unavailable'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.detail && errorJson.detail.message) {
          errorMessage = errorJson.detail.message
        }
      } catch (e) {
        // Keep default error message
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    console.log(`Audio generated successfully - Size: ${audioBuffer.byteLength} bytes`)
    
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

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
      JSON.stringify({ error: `TTS service error: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
