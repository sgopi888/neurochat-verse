
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { videoId } = await req.json()
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
    
    if (!tavusApiKey) {
      return new Response(
        JSON.stringify({ error: 'Tavus service not configured' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Poll Tavus API for video status
    const response = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'x-api-key': tavusApiKey
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tavus API error: ${errorText}`)
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({
        status: data.status,
        videoUrl: data.video_url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error polling Tavus video:', error)
    return new Response(
      JSON.stringify({ error: `Polling error: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
