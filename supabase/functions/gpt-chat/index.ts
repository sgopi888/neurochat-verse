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
    const { messages, userId, provider = 'aiml', model = 'gpt-5-nano', verbosity = 'low', reasoning = 'minimal', webSearch = false, codeInterpreter = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making GPT request with provider: ${provider}, model: ${model}`);
    console.log('Processing request with:', { provider, model, verbosity, reasoning, webSearch, codeInterpreter });
    
    const startTime = Date.now();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (provider === 'aiml') {
      const aimlApiKey = Deno.env.get('AIMLAPI_KEY');
      if (!aimlApiKey) {
        console.error('AIMLAPI key not found, falling back to OpenAI');
        return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, webSearch, codeInterpreter);
      }

      try {
        const response = await makeAIMLRequest(messages, model, aimlApiKey, verbosity, reasoning, webSearch, codeInterpreter);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Add response time to the response
        const responseData = await response.json();
        responseData.responseTime = responseTime;
        
        return new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (aimlError) {
        console.error('AIMLAPI error, falling back to OpenAI:', aimlError);
        return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, webSearch, codeInterpreter);
      }
    } else {
      return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, webSearch, codeInterpreter);
    }

  } catch (error) {
    console.error('Error in GPT chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function makeAIMLRequest(messages: any[], model: string, aimlApiKey: string, verbosity: string, reasoning: string, webSearch: boolean, codeInterpreter: boolean): Promise<Response> {
  const startTime = Date.now();
  // Convert messages to GPT-5 format
  const input = messages.map(msg => ({
    role: msg.role === 'system' ? 'developer' : msg.role,
    content: msg.content
  }));
  
  // Add follow-up questions generation to the system message
  const lastMessage = input[input.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    input.push({
      role: 'user',
      content: `${lastMessage.content}\n\nAfter your main response, also suggest 3 follow-up reflective questions based on our conversation so far. Format them as: \n\n**Follow-up Questions:**\n1. [question 1]\n2. [question 2]\n3. [question 3]`
    });
    // Remove the duplicate user message
    input.splice(-2, 1);
  }
  
  // Build tools array for web search and code interpreter
  const tools = [];
  if (webSearch) {
    tools.push({ type: "web_search_preview" });
  }
  if (codeInterpreter) {
    tools.push({ type: "code_interpreter" });
  }

  const requestBody: any = {
    model: 'gpt-5-nano',
    input,
    text: { verbosity },
    reasoning: { effort: reasoning },
  };

  // Add tools if enabled
  if (tools.length > 0) {
    requestBody.tools = tools;
  }

  const response = await fetch('https://api.aimlapi.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aimlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`AIMLAPI error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AIMLAPI GPT-5 response received successfully');

  // Extract text from GPT-5 response format and handle web search results
  let outputText = "";
  const sources: any[] = [];
  
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.text) {
            outputText += content.text;
          }
        }
        
        // Extract citations if present
        if (item.content[0]?.annotations) {
          for (const annotation of item.content[0].annotations) {
            if (annotation.type === 'url_citation') {
              sources.push({
                url: annotation.url,
                title: annotation.title || annotation.url
              });
            }
          }
        }
      }
    }
  }

  // Parse follow-up questions from the response
  const followUpQuestions: string[] = [];
  const followUpMatch = outputText.match(/\*\*Follow-up Questions:\*\*\n((?:\d+\.\s.+\n?)+)/);
  
  if (followUpMatch) {
    const questionsText = followUpMatch[1];
    const questions = questionsText.split('\n')
      .filter(line => line.trim().match(/^\d+\.\s/))
      .map(line => line.replace(/^\d+\.\s/, '').trim())
      .filter(q => q.length > 0);
    
    followUpQuestions.push(...questions);
    
  // Remove follow-up questions section from main response
  outputText = outputText.replace(/\*\*Follow-up Questions:\*\*\n((?:\d+\.\s.+\n?)+)/, '').trim();
}

const endTime = Date.now();
const responseTime = endTime - startTime;

return new Response(
  JSON.stringify({ 
    response: outputText,
    sources,
    followUpQuestions,
    responseTime
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
}

async function makeOpenAIRequest(messages: any[], model: string, openAIApiKey: string | undefined, verbosity: string, reasoning: string, webSearch: boolean, codeInterpreter: boolean): Promise<Response> {
  const startTime = Date.now();
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Convert messages to OpenAI format and add follow-up questions generation
  const openaiMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Add follow-up questions instruction to the last user message
  if (openaiMessages.length > 0 && openaiMessages[openaiMessages.length - 1].role === 'user') {
    const lastMessage = openaiMessages[openaiMessages.length - 1];
    lastMessage.content = `${lastMessage.content}\n\nAfter your main response, also suggest 3 follow-up reflective questions based on our conversation so far. Format them as: \n\n**Follow-up Questions:**\n1. [question 1]\n2. [question 2]\n3. [question 3]`;
  }

  // Build tools array for web search and code interpreter
  const tools = [];
  if (webSearch) {
    tools.push({ type: "web_search_preview" });
  }
  if (codeInterpreter) {
    tools.push({ type: "code_interpreter" });
  }

  const requestBody: any = {
    model: model,
    messages: openaiMessages,
    max_completion_tokens: 1000,
    stream: false
  };

  // Add tools if enabled (OpenAI format)
  if (tools.length > 0) {
    requestBody.tools = tools.map(tool => {
      if (tool.type === "web_search_preview") {
        return { type: "web_search" };
      }
      if (tool.type === "code_interpreter") {
        return { type: "code_interpreter" };
      }
      return tool;
    });
  }

  // Use OpenAI Chat Completions API
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
  console.log('OpenAI response received successfully');

  // Extract text content from OpenAI Chat Completions response
  let outputText = data.choices[0]?.message?.content || "";
  const sources: any[] = [];

  if (!outputText) {
    console.error('No response content from OpenAI:', data);
    return new Response(
      JSON.stringify({ error: 'No response generated' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse follow-up questions from OpenAI response
  const followUpQuestions: string[] = [];
  const followUpMatch = outputText.match(/\*\*Follow-up Questions:\*\*\n((?:\d+\.\s.+\n?)+)/);
  
  if (followUpMatch) {
    const questionsText = followUpMatch[1];
    const questions = questionsText.split('\n')
      .filter(line => line.trim().match(/^\d+\.\s/))
      .map(line => line.replace(/^\d+\.\s/, '').trim())
      .filter(q => q.length > 0);
    
    followUpQuestions.push(...questions);
    
  // Remove follow-up questions section from main response
  outputText = outputText.replace(/\*\*Follow-up Questions:\*\*\n((?:\d+\.\s.+\n?)+)/, '').trim();
}

const endTime = Date.now();
const responseTime = endTime - startTime;

return new Response(
  JSON.stringify({ 
    response: outputText,
    sources,
    followUpQuestions,
    responseTime
  }),
  { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  }
);
}