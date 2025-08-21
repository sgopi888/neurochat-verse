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
    const { messages, userId, provider = 'aiml', model = 'gpt-5-nano', verbosity = 'low', reasoning = 'minimal', webSearch = false, codeInterpreter = false, onProgress } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making GPT request with provider: ${provider}, model: ${model}`);
    console.log('Processing request with:', { provider, model, verbosity, reasoning, webSearch, codeInterpreter });
    
    // Auto-activate web search if enabled and not explicitly disabled
    const shouldUseWebSearch = webSearch || (webSearch !== false && checkShouldUseWebSearch(messages));
    
    const startTime = Date.now();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (provider === 'aiml') {
      const aimlApiKey = Deno.env.get('AIMLAPI_KEY');
      if (!aimlApiKey) {
        console.error('AIMLAPI key not found, falling back to OpenAI');
        return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, shouldUseWebSearch, codeInterpreter);
      }

      try {
        const response = await makeAIMLRequest(messages, model, aimlApiKey, verbosity, reasoning, shouldUseWebSearch, codeInterpreter);
        return response; // AIML response already includes response time
      } catch (aimlError) {
        console.error('AIMLAPI error, falling back to OpenAI:', aimlError);
        const fallbackStartTime = Date.now();
        const response = await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, shouldUseWebSearch, codeInterpreter);
        return response; // OpenAI response already includes its own response time
      }
    } else {
      return await makeOpenAIRequest(messages, model, openAIApiKey, verbosity, reasoning, shouldUseWebSearch, codeInterpreter);
    }

  } catch (error) {
    console.error('Error in GPT chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Check if web search should be auto-activated based on message content
function checkShouldUseWebSearch(messages: any[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) return false;
  
  const searchTriggers = [
    'search online', 'web search', 'latest', 'recent', 'current', 'update this',
    'what\'s new', 'news', 'today', '2024', '2025', 'recently'
  ];
  
  return searchTriggers.some(trigger => 
    lastMessage.content.toLowerCase().includes(trigger)
  );
}

async function makeAIMLRequest(messages: any[], model: string, aimlApiKey: string, verbosity: string, reasoning: string, webSearch: boolean, codeInterpreter: boolean): Promise<Response> {
  const startTime = Date.now();
  // Convert messages to GPT-5 format
  const input = messages.map(msg => ({
    role: msg.role === 'system' ? 'developer' : msg.role,
    content: msg.content
  }));
  
  // Add follow-up questions generation and BMP/HRV analysis instructions
  const lastMessage = input[input.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    let additionalInstructions = `\n\nAfter your main response, also suggest 3 follow-up questions that the user might want to ask next based on our conversation. Format them as: \n\n**Follow-up Questions:**\n1. [question 1]\n2. [question 2]\n3. [question 3]`;
    
    // Check if user provided BMP/HRV data and code interpreter is enabled
    const hasBmpData = lastMessage.content.toLowerCase().includes('bmp') || 
                      lastMessage.content.toLowerCase().includes('hrv') || 
                      lastMessage.content.toLowerCase().includes('timestamp') ||
                      /\d+\s*bpm/i.test(lastMessage.content) ||
                      /\d{4}-\d{2}-\d{2}/.test(lastMessage.content);
    
    if (hasBmpData && codeInterpreter) {
      additionalInstructions = `\n\nI notice you've shared heart rate or BMP data. Please use the code interpreter tool to analyze this data. Calculate HRV metrics like SDNN, RMSSD, and provide insights about stress and recovery patterns. Show your Python analysis code and explain the results in simple terms.` + additionalInstructions;
    }
    
    input.push({
      role: 'user',
      content: `${lastMessage.content}${additionalInstructions}`
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
    const errorData = await response.json().catch(() => ({}));
    console.error('AIMLAPI error:', response.status, errorData);
    
    // Check for quota exhaustion
    if (errorData.error?.message?.includes('exhausted') || errorData.error?.message?.includes('limit')) {
      console.error('AIMLAPI quota exhausted, will fallback to OpenAI');
    }
    
    throw new Error(`AIMLAPI error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
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

  // Parse follow-up questions from the response - comprehensive regex patterns
  const followUpQuestions: string[] = [];
  
  // Multiple patterns to catch different formats
  const patterns = [
    /\*\*Follow-up Questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Follow-up Questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /\*\*Follow-up questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Follow-up questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /\*\*Suggested Questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Suggested Questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/
  ];
  
  let questionsFound = false;
  for (const pattern of patterns) {
    const match = outputText.match(pattern);
    if (match && match[1]) {
      const questionsText = match[1];
      const questions = questionsText.split('\n')
        .filter(line => line.trim().match(/^\d+\.\s/))
        .map(line => line.replace(/^\d+\.\s/, '').trim())
        .filter(q => q.length > 0 && q.length < 200) // Filter reasonable length
        .slice(0, 3); // Ensure exactly 3 questions
      
      if (questions.length > 0) {
        followUpQuestions.push(...questions);
        // Remove the entire section from main response
        outputText = outputText.replace(pattern, '').trim();
        questionsFound = true;
        break;
      }
    }
  }
  
  // Additional cleanup for any remaining follow-up question traces
  outputText = outputText.replace(/\*\*Follow-?[Uu]p [Qq]uestions?:\*\*.*$/gms, '').trim();
  outputText = outputText.replace(/Follow-?[Uu]p [Qq]uestions?:.*$/gms, '').trim();
  outputText = outputText.replace(/\*\*Suggested [Qq]uestions?:\*\*.*$/gms, '').trim();
  outputText = outputText.replace(/Suggested [Qq]uestions?:.*$/gms, '').trim();

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

  // Convert messages to OpenAI GPT-5 format (similar to AIML)
  const input = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Add follow-up questions generation and BMP/HRV analysis instructions  
  const lastMessage = input[input.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    let additionalInstructions = `\n\nAfter your main response, also suggest 3 follow-up questions that the user might want to ask next based on our conversation. Format them as: \n\n**Follow-up Questions:**\n1. [question 1]\n2. [question 2]\n3. [question 3]`;
    
    // Check if user provided BMP/HRV data and code interpreter is enabled
    const hasBmpData = lastMessage.content.toLowerCase().includes('bmp') || 
                      lastMessage.content.toLowerCase().includes('hrv') || 
                      lastMessage.content.toLowerCase().includes('timestamp') ||
                      /\d+\s*bpm/i.test(lastMessage.content) ||
                      /\d{4}-\d{2}-\d{2}/.test(lastMessage.content);
    
    if (hasBmpData && codeInterpreter) {
      additionalInstructions = `\n\nI notice you've shared heart rate or BMP data. Please use the code interpreter tool to analyze this data. Calculate HRV metrics like SDNN, RMSSD, and provide insights about stress and recovery patterns. Show your Python analysis code and explain the results in simple terms.` + additionalInstructions;
    }
    
    input.push({
      role: 'user',
      content: `${lastMessage.content}${additionalInstructions}`
    });
    // Remove the duplicate user message
    input.splice(-2, 1);
  }

  // Build tools array for web search and code interpreter
  const tools = [];
  if (webSearch) {
    tools.push({ type: "web_search_preview", search_context_size: "low" });
  }
  if (codeInterpreter) {
    tools.push({ type: "code_interpreter", container: { type: "auto" } });
  }

  const requestBody: any = {
    model: model,
    input,
    text: { verbosity },
    reasoning: { effort: reasoning },
  };

  // Add tools if enabled
  if (tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = "auto";
  }

  console.log('Making OpenAI GPT-5 request with body:', JSON.stringify(requestBody, null, 2));

  // Use OpenAI Responses API (GPT-5 format)
  const response = await fetch('https://api.openai.com/v1/responses', {
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
  console.log('OpenAI GPT-5 response received successfully');

  // Extract text from GPT-5 response format (same as AIML)
  let outputText = "";
  const sources: any[] = [];
  
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.type === "output_text" && content.text) {
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
      // Handle code interpreter outputs
      else if (item.type === "code_interpreter_call") {
        console.log('Code executed:', item.code);
        if (item.outputs) {
          console.log('Code outputs:', item.outputs);
        }
      }
    }
  }

  if (!outputText) {
    console.error('No response content from OpenAI:', data);
    return new Response(
      JSON.stringify({ error: 'No response generated' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse follow-up questions from OpenAI response - comprehensive patterns
  const followUpQuestions: string[] = [];
  
  // Multiple patterns to catch different formats
  const patterns = [
    /\*\*Follow-up Questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Follow-up Questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /\*\*Follow-up questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Follow-up questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /\*\*Suggested Questions:\*\*\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/,
    /Suggested Questions:\s*\n((?:\s*\d+\.\s*.+(?:\n|$))*)/
  ];
  
  let questionsFound = false;
  let codeInterpreterResults = '';
  
  // Extract code interpreter results for context preservation
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "code_interpreter_call") {
        codeInterpreterResults += `\n\nCode Analysis Results:\n`;
        if (item.code) {
          codeInterpreterResults += `Code executed: ${item.code}\n`;
        }
        if (item.outputs && Array.isArray(item.outputs)) {
          item.outputs.forEach((output, idx) => {
            if (output.text) {
              codeInterpreterResults += `Output ${idx + 1}: ${output.text}\n`;
            }
          });
        }
      }
    }
  }
  
  // Append code interpreter results to preserve context
  if (codeInterpreterResults) {
    outputText += codeInterpreterResults;
  }
  
  for (const pattern of patterns) {
    const match = outputText.match(pattern);
    if (match && match[1]) {
      const questionsText = match[1];
      const questions = questionsText.split('\n')
        .filter(line => line.trim().match(/^\d+\.\s/))
        .map(line => line.replace(/^\d+\.\s/, '').trim())
        .filter(q => q.length > 0 && q.length < 200) // Filter reasonable length
        .slice(0, 3); // Ensure exactly 3 questions
      
      if (questions.length > 0) {
        followUpQuestions.push(...questions);
        // Remove the entire follow-up questions section from main response
        outputText = outputText.replace(pattern, '').trim();
        questionsFound = true;
        break;
      }
    }
  }
  
  // Additional cleanup for any remaining follow-up question traces
  outputText = outputText.replace(/\*\*Follow-?[Uu]p [Qq]uestions?:\*\*.*$/gms, '').trim();
  outputText = outputText.replace(/Follow-?[Uu]p [Qq]uestions?:.*$/gms, '').trim();
  outputText = outputText.replace(/\*\*Suggested [Qq]uestions?:\*\*.*$/gms, '').trim();
  outputText = outputText.replace(/Suggested [Qq]uestions?:.*$/gms, '').trim();

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