
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioBase64, script, replicaId } = await req.json()
    
    console.log(`Tavus video generation request - Script length: ${script?.length || 0}, Replica: ${replicaId}`)
    
    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Audio is required for video generation' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
    
    if (!tavusApiKey) {
      console.error('Tavus API key not found in environment')
      return new Response(
        JSON.stringify({ error: 'Tavus service not configured - missing API key' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Upload audio to Supabase Storage
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
    const fileName = `video_audio_${Date.now()}.mp3`
    
    console.log('Uploading audio to Supabase Storage for video generation...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-uploads')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading audio:', uploadError)
      throw new Error(`Failed to upload audio file: ${uploadError.message}`)
    }

    // Get public URL for the uploaded audio
    const { data: { publicUrl } } = supabase.storage
      .from('audio-uploads')
      .getPublicUrl(fileName)

    console.log('Audio uploaded for video, public URL:', publicUrl)

    // Call Tavus API with ONLY audio_url (not script) - this is the critical fix
    const tavusPayload = {
      replica_id: replicaId,
      audio_url: publicUrl,
      video_name: `NeuroHeart_Avatar_${Date.now()}`
      // NOTE: Intentionally NOT including 'script' parameter when using audio_url
    }

    console.log('Calling Tavus API with payload:', tavusPayload)

    const tavusResponse = await fetch('https://tavusapi.com/v2/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': tavusApiKey
      },
      body: JSON.stringify(tavusPayload)
    })

    if (!tavusResponse.ok) {
      const errorText = await tavusResponse.text()
      console.error('Tavus API error:', tavusResponse.status, errorText)
      throw new Error(`Tavus API error: ${errorText}`)
    }

    const tavusData = await tavusResponse.json()
    console.log('Tavus video generation started successfully:', tavusData)

    // Clean up the temporary audio file after a delay
    setTimeout(async () => {
      try {
        await supabase.storage.from('audio-uploads').remove([fileName])
        console.log('Temporary video audio file cleaned up')
      } catch (error) {
        console.error('Error cleaning up video audio file:', error)
      }
    }, 60000) // Clean up after 1 minute

    return new Response(
      JSON.stringify({
        videoId: tavusData.video_id,
        status: tavusData.status,
        videoUrl: tavusData.video_url || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-tavus-video function:', error)
    return new Response(
      JSON.stringify({ error: `Video generation error: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
