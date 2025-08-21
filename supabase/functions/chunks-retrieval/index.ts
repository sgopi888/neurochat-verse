// Supabase Edge Function: chunks-retrieval
// Retrieves relevant chunks from knowledge base via n8n webhook
// Processes chat history to find contextually relevant information

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CHUNKS_WEBHOOK_URL = "https://sreen8n.app.n8n.cloud/webhook/chunks-retrieval";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { chatHistory, userMessage } = await req.json();
    
    console.log('Chunks retrieval request:', { 
      chatHistoryLength: chatHistory?.length || 0,
      userMessage: userMessage?.substring(0, 100) + '...' 
    });

    // Prepare the request for n8n chunks retrieval
    const chunksRequest = {
      user_query: userMessage,
      chat_history: chatHistory || [],
      sessionId: "chunks_" + Date.now(),
      timestamp: new Date().toISOString()
    };

    // Call n8n chunks retrieval webhook
    const response = await fetch(CHUNKS_WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(chunksRequest),
    });

    console.log('N8N chunks response status:', response.status);

    if (!response.ok) {
      console.error('N8N chunks error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          chunks: [], 
          error: `N8N webhook error: ${response.status}` 
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200 // Return 200 to frontend with error info in body
        }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    let chunksData;

    if (contentType.includes("application/json")) {
      chunksData = await response.json();
    } else {
      const textResponse = await response.text();
      // Try to parse as JSON, fallback to text wrapper
      try {
        chunksData = JSON.parse(textResponse);
      } catch {
        chunksData = { chunks: [textResponse] };
      }
    }

    console.log('Processed chunks data:', chunksData);

    // Ensure consistent response format
    const formattedResponse = {
      success: true,
      chunks: Array.isArray(chunksData?.chunks) ? chunksData.chunks : 
             Array.isArray(chunksData) ? chunksData :
             chunksData?.content ? [chunksData.content] :
             typeof chunksData === 'string' ? [chunksData] : [],
      metadata: chunksData?.metadata || {},
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(formattedResponse), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });

  } catch (error) {
    console.error("Chunks retrieval error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        chunks: [],
        error: "Failed to retrieve chunks",
        details: (error as Error).message 
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders }, 
        status: 200 // Return 200 with error info for graceful handling
      }
    );
  }
});