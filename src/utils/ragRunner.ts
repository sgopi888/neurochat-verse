import { GPTService } from '@/services/gptService';
import { estimateTokens } from '@/utils/tokenCounter';

export interface DebugStep {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  timestamp?: Date;
  tokens?: number;
}

export interface RagResult {
  response: string;
  followUpQuestions?: string[];
  responseTime?: number;
  chunks?: string[];
  totalTokens?: number;
  steps: DebugStep[];
  llmContext?: {
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    totalTokens: number;
  };
}

export class RagRunner {
  private readonly WEBHOOK_URL = "https://sreen8n.app.n8n.cloud/webhook/neuroneuro";
  private steps: DebugStep[] = [];
  private onStepUpdate?: (steps: DebugStep[]) => void;

  constructor(onStepUpdate?: (steps: DebugStep[]) => void) {
    this.onStepUpdate = onStepUpdate;
  }

  private updateStep(id: string, updates: Partial<DebugStep>) {
    this.steps = this.steps.map(step => 
      step.id === id ? { ...step, ...updates } : step
    );
    this.onStepUpdate?.(this.steps);
  }

  private addStep(step: DebugStep) {
    this.steps = [...this.steps, step];
    this.onStepUpdate?.(this.steps);
  }

  async runRagFlow(userQuery: string): Promise<RagResult> {
    if (!userQuery.trim()) {
      throw new Error("Empty user query");
    }

    // Reset steps
    this.steps = [];

    try {
      // Step 1: Original Query
      this.addStep({
        id: 'query',
        title: 'Original User Query',
        status: 'completed',
        data: userQuery,
        timestamp: new Date(),
        tokens: estimateTokens(userQuery)
      });

      // Step 2: Extract Concepts
      this.addStep({
        id: 'concepts',
        title: 'Extracting Concepts',
        status: 'processing',
        timestamp: new Date()
      });

      const conceptsResponse = await GPTService.extractConcepts(userQuery);
      
      if (conceptsResponse.success) {
        this.updateStep('concepts', {
          status: 'completed',
          data: conceptsResponse.data,
          tokens: estimateTokens(conceptsResponse.data || '')
        });
      } else {
        this.updateStep('concepts', {
          status: 'error',
          data: conceptsResponse.error
        });
      }

      // Step 3: Get RAG Chunks (direct webhook, exactly like LLMTest)
      this.addStep({
        id: 'chunks',
        title: 'Retrieving Knowledge Chunks',
        status: 'processing',
        timestamp: new Date()
      });

      let chunks: string[] = [];
      try {
        const res = await fetch(this.WEBHOOK_URL, {
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
      
      this.updateStep('chunks', {
        status: 'completed',
        data: {
          chunksCount: chunks.length,
          chunks: chunks,
          totalChunkTokens: chunks.reduce((sum, chunk) => sum + estimateTokens(chunk), 0)
        }
      });

      // Step 4: Build LLM Context
      this.addStep({
        id: 'context',
        title: 'Building LLM Context',
        status: 'processing',
        timestamp: new Date()
      });

      const systemPrompt = "You are a warm, compassionate mindfulness coach and guide...";
      let contextualPrompt = systemPrompt;
      
      if (chunks.length > 0) {
        const chunksContext = chunks.join('\n\n---\n\n');
        contextualPrompt += `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${chunksContext}\n\nUse this context to inform your response, but maintain your warm, conversational tone.`;
      }

      const messages = [
        { role: 'system', content: contextualPrompt },
        { role: 'user', content: userQuery }
      ];

      const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

      const llmContext = {
        systemPrompt: contextualPrompt,
        messages,
        totalTokens
      };

      this.updateStep('context', {
        status: 'completed',
        data: llmContext,
        tokens: totalTokens
      });

      // Step 5: LLM Call
      this.addStep({
        id: 'llm',
        title: 'Calling LLM',
        status: 'processing',
        timestamp: new Date()
      });

      const llmResponse = await GPTService.probingChatWithChunks(userQuery, [], chunks);
      
      if (llmResponse.success) {
        this.updateStep('llm', {
          status: 'completed',
          data: {
            response: llmResponse.data,
            responseTime: llmResponse.responseTime,
            followUpQuestions: llmResponse.followUpQuestions
          },
          tokens: estimateTokens(llmResponse.data || '')
        });

        return {
          response: llmResponse.data || '',
          followUpQuestions: llmResponse.followUpQuestions,
          responseTime: llmResponse.responseTime,
          chunks,
          totalTokens,
          steps: this.steps,
          llmContext
        };
      } else {
        this.updateStep('llm', {
          status: 'error',
          data: llmResponse.error
        });
        throw new Error(llmResponse.error || "LLM call failed");
      }

    } catch (error) {
      console.error('RAG Runner Error:', error);
      this.addStep({
        id: 'error',
        title: 'Error',
        status: 'error',
        data: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }
}

// Convenience function for one-off calls
export async function runRagFlow(userQuery: string, onStepUpdate?: (steps: DebugStep[]) => void): Promise<RagResult> {
  const runner = new RagRunner(onStepUpdate);
  return runner.runRagFlow(userQuery);
}