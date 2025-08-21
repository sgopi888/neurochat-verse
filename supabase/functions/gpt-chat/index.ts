import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, provider = 'aiml', model = 'gpt-5-nano', verbosity = 'low', reasoning = 'minimal' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making GPT request with provider: ${provider}, model: ${model}`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (provider === 'aiml') {
      const aimlApiKey = Deno.env.get('AIMLAPI_KEY');
      if (!aimlApiKey) {
        console.error('AIMLAPI key not found, falling back to OpenAI');
        return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning);
      }

      try {
        return await makeAIMLRequest(messages, model, aimlApiKey, verbosity, reasoning);
      } catch (aimlError) {
        console.error('AIMLAPI error, falling back to OpenAI:', aimlError);
        return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning);
      }
    } else {
      return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning);
    }

  } catch (error) {
    console.error('Error in GPT chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function makeAIMLRequest(messages: any[], model: string, aimlApiKey: string, verbosity: string, reasoning: string): Promise<Response> {
  // Convert messages to GPT-5 format
  const input = messages.map(msg => ({
    role: msg.role === 'system' ? 'developer' : msg.role,
    content: msg.content
  }));
  
  const response = await fetch('https://api.aimlapi.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aimlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      input,
      text: { verbosity },
      reasoning: { effort: reasoning },
    }),
  });

  if (!response.ok) {
    throw new Error(`AIMLAPI error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AIMLAPI GPT-5 response received successfully');

  // Extract text from GPT-5 response format
  let outputText = "";
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.text) {
            outputText += content.text;
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ response: outputText }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function makeOpenAIRequest(messages: any[], model: string, openAIApiKey: string | undefined, verbosity: string, reasoning: string): Promise<Response> {
  if (!openAIApiKey) {
    console.error('OpenAI API key not found');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Convert messages to GPT-5 format
  const input = messages.map(msg => ({
    role: msg.role === 'system' ? 'developer' : msg.role,
    content: msg.content
  }));

  // Use GPT-5 responses API for gpt-5-nano
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-nano-2025-08-07',
      input,
      text: { verbosity },
      reasoning: { effort: reasoning },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI API error:', response.status, errorData);
    return new Response(
      JSON.stringify({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorData.error?.message || 'Unknown error'
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json();
  console.log('OpenAI GPT-5 response received successfully');

  // Extract text from GPT-5 response format
  let outputText = "";
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.text) {
            outputText += content.text;
          }
        }
      }
    }
  }

  if (!outputText) {
    console.error('No response content from OpenAI GPT-5:', data);
    return new Response(
      JSON.stringify({ error: 'No response generated' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ response: outputText }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}