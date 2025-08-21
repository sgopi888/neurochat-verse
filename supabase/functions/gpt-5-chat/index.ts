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
    const { model, input, text, reasoning, tools, tool_choice, userId } = await req.json();
    
    console.log('GPT-5 Chat request:', { model, userId, toolsCount: tools?.length });

    if (!input || !Array.isArray(input)) {
      return new Response(
        JSON.stringify({ error: 'Input array is required' }),
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

    // Use GPT-5-nano as specified
    const modelName = model || 'gpt-5-nano-2025-08-07';
    
    // Build request body for OpenAI GPT-5 format
    const requestBody: any = {
      model: modelName,
      messages: input.map((msg: any) => ({
        role: msg.role,
        content: Array.isArray(msg.content) 
          ? msg.content.map((c: any) => c.type === 'input_text' ? c.text : c).join('\n')
          : msg.content
      })),
      max_completion_tokens: 2000,
      // Note: GPT-5 models don't support temperature parameter
    };

    // Add text settings if provided
    if (text?.verbosity) {
      requestBody.verbosity = text.verbosity;
    }

    // Add reasoning settings if provided  
    if (reasoning?.effort) {
      requestBody.reasoning_effort = reasoning.effort;
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools.map((tool: any) => {
        if (tool.type === 'web_search_preview') {
          return {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' }
                }
              }
            }
          };
        } else if (tool.type === 'code_interpreter') {
          return {
            type: 'code_interpreter'
          };
        }
        return tool;
      });
      
      if (tool_choice) {
        requestBody.tool_choice = tool_choice;
      }
    }

    console.log('Calling OpenAI with model:', modelName);

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