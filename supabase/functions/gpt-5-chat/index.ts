import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, verbosity, reasoning, tools, userId } = await req.json();
    
    console.log('GPT-5 Chat request:', { userId, toolsCount: tools?.length, verbosity, reasoning });

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build request body for standard OpenAI chat completions
    const requestBody: any = {
      model: 'gpt-5-nano-2025-08-07',
      messages: messages,
      max_completion_tokens: 2000,
    };

    // Add tools if provided - only web search supported
    if (tools && tools.length > 0) {
      const processedTools = [];
      
      for (const tool of tools) {
        if (tool.type === 'web_search_preview') {
          processedTools.push({
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' }
                },
                required: ['query']
              }
            }
          });
        }
      }
      
      if (processedTools.length > 0) {
        requestBody.tools = processedTools;
        requestBody.tool_choice = 'auto';
      }
    }

    console.log('Calling OpenAI with model: gpt-5-nano-2025-08-07');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API error: ${response.status}`,
          details: errorData 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');

    // Format response to match expected structure
    const formattedResponse = {
      response: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      tool_calls: data.choices[0].message.tool_calls
    };

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-5-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});