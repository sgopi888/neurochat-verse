import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use the working n8n webhook URL from the user's test
const CHUNKS_WEBHOOK_URL = 'https://sreen8n.app.n8n.cloud/webhook/neuroneuro';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Chunks retrieval function called');
    
    // Parse request body
    const { user_query, sessionId } = await req.json();
    
    if (!user_query) {
      console.error('❌ Missing user_query in request');
      return new Response(JSON.stringify({
        success: false,
        error: 'user_query is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('📨 Using working n8n payload format');
    
    // Use the working payload format from user's test
    const n8nPayload = {
      user_query: user_query,
      sessionId: sessionId || `user_${Date.now()}`
    };

    console.log('🌐 Calling working n8n webhook:', CHUNKS_WEBHOOK_URL);
    
    // Call n8n webhook with working format
    const n8nResponse = await fetch(CHUNKS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      console.error('❌ n8n webhook failed:', n8nResponse.status, n8nResponse.statusText);
      return new Response(JSON.stringify({
        success: false,
        error: `n8n webhook failed: ${n8nResponse.status}`,
        chunks: []
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const n8nData = await n8nResponse.json();
    console.log('✅ n8n response received:', { data: n8nData });
    
    // Extract chunks from n8n response - adapt to whatever format n8n returns
    let chunks: string[] = [];
    
    if (n8nData.reply) {
      // Split reply into chunks if it's long, or use as single chunk
      const reply = n8nData.reply.toString();
      if (reply.length > 200) {
        // Split into sentences and group
        const sentences = reply.split(/[.!?]+/).filter(s => s.trim().length > 0);
        chunks = sentences.map(s => s.trim()).filter(s => s.length > 0);
      } else {
        chunks = [reply];
      }
    } else if (n8nData.chunks && Array.isArray(n8nData.chunks)) {
      chunks = n8nData.chunks;
    } else if (n8nData.message) {
      chunks = [n8nData.message];
    } else if (typeof n8nData === 'string') {
      chunks = [n8nData];
    }

    console.log('📚 Extracted chunks:', chunks.length, 'chunks');

    return new Response(JSON.stringify({
      success: true,
      chunks: chunks,
      message: `Retrieved ${chunks.length} relevant chunks`
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Chunks retrieval error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      chunks: []
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});