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
    const { messages, userId, provider = 'aiml', model = 'gpt-5-nano' } = await req.json();

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
        return await makeOpenAIRequest(messages, model, openAIApiKey);
      }

      try {
        return await makeAIMLRequest(messages, model, aimlApiKey);
      } catch (aimlError) {
        console.error('AIMLAPI error, falling back to OpenAI:', aimlError);
        return await makeOpenAIRequest(messages, model, openAIApiKey);
      }
    } else {
      return await makeOpenAIRequest(messages, model, openAIApiKey);
    }

  } catch (error) {
    console.error('Error in GPT chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function makeAIMLRequest(messages: any[], model: string, aimlApiKey: string): Promise<Response> {
  const modelName = model === 'gpt-5-nano' ? 'gpt-5-nano' : 'gpt-5-2025-08-07';
  
  const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aimlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      max_completion_tokens: 8000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AIMLAPI error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AIMLAPI response received successfully');

  return new Response(
    JSON.stringify({ response: data.choices[0].message.content }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function makeOpenAIRequest(messages: any[], model: string, openAIApiKey: string | undefined): Promise<Response> {
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

  const modelName = model === 'gpt-5-nano' ? 'gpt-5-nano-2025-08-07' : 'gpt-5-2025-08-07';

  // Prepare request body based on model
  let requestBody: any = {
    model: modelName,
    messages,
  };

  // Use correct parameters for different model generations
  if (modelName.startsWith('gpt-5') || modelName.startsWith('gpt-4.1') || modelName.startsWith('o3') || modelName.startsWith('o4')) {
    requestBody.max_completion_tokens = 8000;
  } else {
    requestBody.max_tokens = 8000;
    requestBody.temperature = 0.7;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
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
  const responseText = data.choices?.[0]?.message?.content;

  if (!responseText) {
    console.error('No response content from OpenAI:', data);
    return new Response(
      JSON.stringify({ error: 'No response generated' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('OpenAI response received successfully');

  return new Response(
    JSON.stringify({ response: responseText }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}