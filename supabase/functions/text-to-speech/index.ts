
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TTS Constants
const DAILY_TTS_LIMIT = 10
const MAX_TEXT_LENGTH = 4000
const ALLOWED_VOICES = ['James', 'Cassidy', 'Drew', 'Lavender']

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface UsageRecord {
  id: string
  user_id: string
  date: string
  chat_queries_count: number
  tts_requests_count: number
  monthly_chat_count: number
  monthly_tts_count: number
}

// Enhanced TTS rate limiting with database tracking
async function checkTTSUsageLimit(userId: string): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  try {
    console.log('Checking TTS usage limit for user:', userId)
    
    // Get or create daily usage record
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_or_create_daily_usage', { p_user_id: userId })
    
    if (usageError) {
      console.error('Error fetching usage data:', usageError)
      return { allowed: true } // Allow on error to prevent blocking users
    }
    
    if (!usageData || usageData.length === 0) {
      console.error('No usage data returned')
      return { allowed: true }
    }
    
    const usage = usageData[0] as UsageRecord
    const currentTTSCount = usage.tts_requests_count
    
    console.log('Current TTS usage:', currentTTSCount, 'of', DAILY_TTS_LIMIT)
    
    // Check if daily limit exceeded
    if (currentTTSCount >= DAILY_TTS_LIMIT) {
      return { 
        allowed: false, 
        error: `Daily TTS limit reached (${DAILY_TTS_LIMIT} per day). Limit resets at midnight UTC.`,
        remaining: 0
      }
    }
    
    return { 
      allowed: true, 
      remaining: DAILY_TTS_LIMIT - currentTTSCount 
    }
    
  } catch (error) {
    console.error('TTS usage check failed:', error)
    return { allowed: true } // Allow on error
  }
}

// Update TTS usage counter
async function incrementTTSUsage(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_usage_limits')
      .update({ 
        tts_requests_count: supabase.raw('tts_requests_count + 1'),
        monthly_tts_count: supabase.raw('monthly_tts_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('date', new Date().toISOString().split('T')[0])
    
    if (error) {
      console.error('Error updating TTS usage:', error)
    } else {
      console.log('TTS usage incremented for user:', userId)
    }
  } catch (error) {
    console.error('Failed to increment TTS usage:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voice, userId } = await req.json()

    // Validate required fields
    if (!text || !voice || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, voice, and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate text length
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate voice
    if (!ALLOWED_VOICES.includes(voice)) {
      return new Response(
        JSON.stringify({ error: `Invalid voice. Allowed voices: ${ALLOWED_VOICES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('TTS request received:', { 
      textLength: text.length, 
      voice, 
      userId: userId.substring(0, 8) + '...' 
    })

    // Check TTS usage limits
    const usageCheck = await checkTTSUsageLimit(userId)
    if (!usageCheck.allowed) {
      console.log('TTS usage limit exceeded for user:', userId)
      return new Response(
        JSON.stringify({ 
          error: usageCheck.error,
          remainingTTS: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ElevenLabs API key
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      console.error('ELEVENLABS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'TTS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map voice names to ElevenLabs voice IDs
    const voiceMap: { [key: string]: string } = {
      'James': 'onwK6e5Y6O6o2BxlvgoG',
      'Cassidy': 'XB0fDUnXU5powFXDhCwa', 
      'Drew': '29vD33N1CtxCmqQRPOHJ',
      'Lavender': 'Xb7hH8MSUJpSbSDYk0k2'
    }

    const voiceId = voiceMap[voice]
    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: 'Voice mapping not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling ElevenLabs API with voice:', voice, 'mapped to ID:', voiceId)

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', response.status, errorText)
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'TTS service authentication failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'TTS service rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'TTS service temporarily unavailable' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get the audio data
    const audioData = await response.arrayBuffer()
    console.log('Successfully generated TTS audio, size:', audioData.byteLength, 'bytes')

    // Increment usage counter after successful generation
    await incrementTTSUsage(userId)

    // Return the audio data
    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Error in TTS function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
