import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GPTService } from '@/services/gptService';
import { estimateTokens } from '@/utils/tokenCounter';
import { Copy, RefreshCw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface DebugStep {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  timestamp?: Date;
  tokens?: number;
}

interface LLMContext {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  totalTokens: number;
}

export default function LLMTest() {
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [llmContext, setLlmContext] = useState<LLMContext | null>(null);
  const [llmResponse, setLlmResponse] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const WEBHOOK_URL = "https://sreen8n.app.n8n.cloud/webhook/neuroneuro";

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [steps]);

  const updateStep = (id: string, updates: Partial<DebugStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const addStep = (step: DebugStep) => {
    setSteps(prev => [...prev, step]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const testLLMFlow = async () => {
    if (!userQuery.trim()) return;

    setIsProcessing(true);
    setSteps([]);
    setLlmContext(null);
    setLlmResponse('');

    try {
      // Step 1: Original Query
      addStep({
        id: 'query',
        title: 'Original User Query',
        status: 'completed',
        data: userQuery,
        timestamp: new Date(),
        tokens: estimateTokens(userQuery)
      });

      // Step 2: Extract Concepts
      addStep({
        id: 'concepts',
        title: 'Extracting Concepts',
        status: 'processing',
        timestamp: new Date()
      });

      const conceptsResponse = await GPTService.extractConcepts(userQuery);
      
      if (conceptsResponse.success) {
        updateStep('concepts', {
          status: 'completed',
          data: conceptsResponse.data,
          tokens: estimateTokens(conceptsResponse.data || '')
        });
      } else {
        updateStep('concepts', {
          status: 'error',
          data: conceptsResponse.error
        });
      }

      // Step 3: Get RAG Chunks (direct webhook)
      addStep({
        id: 'chunks',
        title: 'Retrieving Knowledge Chunks',
        status: 'processing',
        timestamp: new Date()
      });

      let chunks: string[] = [];
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_query: userQuery, sessionId: "user_123" }),
        });

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          console.log("🔍 Raw webhook response:", data);

          if (Array.isArray(data)) {
            chunks = data;
          } else if (data?.chunks) {
            chunks = data.chunks;
          } else if (data?.reply) {
            chunks = [data.reply];
          } else if (data?.message) {
            chunks = [data.message];
          } else {
            chunks = [JSON.stringify(data)];
          }
        } else {
          const reply = await res.text();
          chunks = [reply];
        }
      } catch (error) {
        console.error("Webhook error:", error);
        chunks = [];
      }
      
      updateStep('chunks', {
        status: 'completed',
        data: {
          chunksCount: chunks.length,
          chunks: chunks,
          totalChunkTokens: chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0)
        }
      });

      // Step 4: Build LLM Context (chunks separate from system)
      addStep({
        id: 'context',
        title: 'Building LLM Context',
        status: 'processing',
        timestamp: new Date()
      });

      const systemPrompt = "You are a warm, compassionate mindfulness coach and guide...";

      const messages = [
        { role: 'system', content: systemPrompt },
        ...(chunks.length > 0
          ? [{ role: 'user', content: `Here is retrieved knowledge context. Use it if relevant:\n\n${chunks.join("\n\n---\n\n")}` }]
          : []),
        { role: 'user', content: userQuery }
      ];

      const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

      const context: LLMContext = {
        systemPrompt,
        messages,
        totalTokens
      };

      setLlmContext(context);
      updateStep('context', {
        status: 'completed',
        data: context,
        tokens: totalTokens
      });

      // Step 5: LLM Call
      addStep({
        id: 'llm',
        title: 'Calling LLM',
        status: 'processing',
        timestamp: new Date()
      });

      const llmResponse = await GPTService.probingChatWithChunks(userQuery, [], chunks);
      
      if (llmResponse.success) {
        setLlmResponse(llmResponse.data || '');
        updateStep('llm', {
          status: 'completed',
          data: {
            response: llmResponse.data,
            responseTime: llmResponse.responseTime,
            followUpQuestions: llmResponse.followUpQuestions
          },
          tokens: estimateTokens(llmResponse.data || '')
        });
      } else {
        updateStep('llm', {
          status: 'error',
          data: llmResponse.error
        });
      }

    } catch (error) {
      console.error('LLM Test Error:', error);
      addStep({
        id: 'error',
        title: 'Error',
        status: 'error',
        data: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepData = (step: DebugStep) => {
    if (!step.data) return null;

    switch (step.id) {
      case 'query':
        return <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md">{step.data}</pre>;
      case 'concepts':
        return <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-md">{step.data}</pre>;
      case 'chunks':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Badge variant="secondary">{step.data.chunksCount} chunks</Badge>
              <Badge variant="outline">{step.data.totalChunkTokens} tokens</Badge>
            </div>
            {step.data.chunks.map((chunk: string, idx: number) => (
              <div key={idx} className="bg-muted/30 p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Chunk {idx + 1}</p>
                <p className="text-sm whitespace-pre-wrap">{chunk.substring(0, 200)}...</p>
              </div>
            ))}
          </div>
        );
      case 'context':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary">{step.data.messages.length} messages</Badge>
              <Badge variant="outline">{step.data.totalTokens} total tokens</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">System Prompt:</p>
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded-md max-h-40 overflow-y-auto">
                {step.data.systemPrompt}
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Messages Array:</p>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-md">
                {JSON.stringify(step.data.messages, null, 2)}
              </pre>
            </div>
          </div>
        );
      case 'llm':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {step.data.responseTime && <Badge variant="outline">{step.data.responseTime}ms</Badge>}
              <Badge variant="secondary">{step.tokens} tokens</Badge>
            </div>
            <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md">{step.data.response}</pre>
            {step.data.followUpQuestions?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Follow-up Questions:</p>
                <ul className="text-sm space-y-1">
                  {step.data.followUpQuestions.map((q: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground">• {q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'error':
        return <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{step.data}</p>;
      default:
        return <pre className="text-xs bg-muted/30 p-3 rounded-md">{JSON.stringify(step.data, null, 2)}</pre>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">LLM Test & Debug Interface</h1>
        <p className="text-muted-foreground">Test the complete RAG flow and see exactly what context the LLM receives</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Test Input</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Enter your test query..."
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && testLLMFlow()}
            />
            <Button onClick={testLLMFlow} disabled={isProcessing || !userQuery.trim()} className="w-full">
              {isProcessing ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : (<><ArrowRight className="w-4 h-4 mr-2" />Test RAG Flow</>)}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Processing Steps</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-96" ref={scrollAreaRef}>
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                          step.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <span className="font-medium text-sm">{step.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.tokens && <Badge variant="outline" className="text-xs">{step.tokens} tokens</Badge>}
                        {step.timestamp && <span className="text-xs text-muted-foreground">{step.timestamp.toLocaleTimeString()}</span>}
                      </div>
                    </div>
                    {step.data && <div className="ml-4">{renderStepData(step)}</div>}
                    {idx < steps.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {llmContext && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Final LLM Context</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleCopy(JSON.stringify(llmContext, null, 2))}>
                <Copy className="w-4 h-4 mr-2" />Copy JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="secondary">{llmContext.messages.length} messages</Badge>
                <Badge variant="outline">{llmContext.totalTokens} total tokens</Badge>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(llmContext, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {llmResponse && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>LLM Response</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleCopy(llmResponse)}>
                <Copy className="w-4 h-4 mr-2" />Copy Response
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-md">{llmResponse}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
