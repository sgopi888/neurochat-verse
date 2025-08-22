import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ChatMessage, { ChatMessageData } from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL = "https://sreen8n.app.n8n.cloud/webhook/neuroneuro";

const SimpleRAGTest = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Simple RAG Test";
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Extract concepts using GPT
  const extractConcepts = async (userMessage: string): Promise<string[]> => {
    try {
      console.log('🧠 Extracting concepts from:', userMessage);
      
      const { data, error } = await supabase.functions.invoke('gpt-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are a concept extraction expert. Given a user's message, extract 3-5 key explicit concepts (topics, entities, themes) that would be useful for knowledge retrieval.

Return ONLY a comma-separated list of concepts, nothing else. No explanations, no formatting, just the concepts.

Examples:
User: "I'm feeling anxious about my job interview tomorrow"
Response: anxiety, job interview, career stress, workplace fears, interview preparation

User: "How can I improve my sleep quality?"
Response: sleep quality, insomnia, sleep hygiene, bedtime routine, rest improvement`
            },
            {
              role: 'user',
              content: userMessage
            }
          ]
        }
      });

      if (error) {
        console.error('Concept extraction error:', error);
        return [userMessage]; // Fallback to original message
      }

      const concepts = data?.data?.choices?.[0]?.message?.content || userMessage;
      const conceptList = concepts.split(',').map((c: string) => c.trim()).filter(Boolean);
      
      console.log('✅ Extracted concepts:', conceptList);
      return conceptList;
    } catch (error) {
      console.error('Concept extraction failed:', error);
      return [userMessage];
    }
  };

  // Get chunks from n8n
  const getChunksFromN8N = async (concepts: string[]): Promise<string[]> => {
    try {
      const query = concepts.join(', ');
      console.log('🎯 Calling n8n with concepts:', query);
      
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_query: query, 
          sessionId: `rag_test_${Date.now()}` 
        }),
      });

      const ct = res.headers.get("content-type") || "";
      let reply: string;
      if (ct.includes("application/json")) {
        const data = await res.json();
        reply = typeof data === "string" ? data : (data?.reply || data?.message || JSON.stringify(data));
      } else {
        reply = await res.text();
      }

      console.log('✅ n8n response:', reply ? 'success' : 'no reply');
      return reply ? [reply] : [];
    } catch (error) {
      console.error('n8n call failed:', error);
      return [];
    }
  };

  // Generate final response using GPT with chunks
  const generateResponseWithChunks = async (userMessage: string, chunks: string[]): Promise<string> => {
    try {
      console.log('🤖 Generating response with chunks');
      
      const { data, error } = await supabase.functions.invoke('gpt-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant. Use the provided knowledge chunks to answer the user's question. If the chunks don't contain relevant information, provide a general helpful response.

Knowledge chunks:
${chunks.join('\n\n')}

Answer the user's question using this knowledge when relevant.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ]
        }
      });

      if (error) {
        console.error('Response generation error:', error);
        return 'I apologize, but I encountered an error generating a response.';
      }

      const response = data?.data?.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';
      console.log('✅ Generated response with chunks');
      return response;
    } catch (error) {
      console.error('Response generation failed:', error);
      return 'I apologize, but I encountered an error generating a response.';
    }
  };

  const sendPrompt = async (text: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    const userMsg: ChatMessageData = { 
      id: userId, 
      role: "user", 
      content: text, 
      status: "done" 
    };
    
    const assistantMsg: ChatMessageData = { 
      id: assistantId, 
      role: "assistant", 
      content: "", 
      status: "sending", 
      linkedUserId: userId 
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsSending(true);

    try {
      // Step 1: Extract concepts
      const concepts = await extractConcepts(text);
      
      // Update assistant message to show concepts
      setMessages((prev) => prev.map((m) => 
        m.id === assistantId 
          ? { ...m, concepts, content: "Extracting knowledge..." } 
          : m
      ));

      // Step 2: Get chunks from n8n
      const chunks = await getChunksFromN8N(concepts);
      
      // Update assistant message to show chunks
      setMessages((prev) => prev.map((m) => 
        m.id === assistantId 
          ? { ...m, chunks, content: "Generating response..." } 
          : m
      ));

      // Step 3: Generate final response
      const finalResponse = await generateResponseWithChunks(text, chunks);
      
      setMessages((prev) => prev.map((m) => 
        m.id === assistantId 
          ? { ...m, content: finalResponse, status: "done" } 
          : m
      ));

    } catch (error) {
      console.error("RAG test error:", error);
      setMessages((prev) => prev.map((m) => 
        m.id === assistantId 
          ? { ...m, status: "failed" } 
          : m
      ));
      toast({ 
        title: "Error", 
        description: "Failed to get a response.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      toast({ title: "Copied", description: "Message copied to clipboard." });
    } catch (e) {
      toast({ title: "Copy failed", description: "Unable to copy.", variant: "destructive" });
    }
  };

  const handleRetry = async (msgId: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (!target) return;

    if (target.role === "user") {
      await sendPrompt(target.content);
      return;
    }

    const userMsg = target.linkedUserId
      ? messages.find((m) => m.id === target.linkedUserId)
      : [...messages].slice(0, messages.indexOf(target)).reverse().find((m) => m.role === "user");

    if (!userMsg) return;

    setMessages((prev) => prev.map((m) => 
      m.id === target.id 
        ? { ...m, status: "sending" as const, content: "", concepts: undefined, chunks: undefined } 
        : m
    ));
    setIsSending(true);

    await sendPrompt(userMsg.content);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container py-6">
          <h1 className="text-2xl font-bold">Simple RAG Test</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direct n8n integration with concept extraction and chunk retrieval visualization.
          </p>
        </div>
      </header>
      <main>
        <section className="container py-6">
          <Card className="p-4">
            <div className="h-[60vh] sm:h-[65vh]">
              <ScrollArea className="h-full pr-4" ref={scrollRef}>
                <div className="flex flex-col gap-4 py-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-20">
                      Ask a question to test RAG functionality!
                    </div>
                  ) : (
                    messages.map((m) => (
                      <ChatMessage key={m.id} message={m} onCopy={handleCopy} onRetry={handleRetry} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="mt-4">
              <ChatInput onSend={sendPrompt} disabled={isSending} />
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default SimpleRAGTest;