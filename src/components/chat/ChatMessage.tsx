import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, RotateCcw } from "lucide-react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "sending" | "done" | "failed";
  linkedUserId?: string;
  chunks?: string[];
  concepts?: string[];
  chunkCount?: number;
  tokenCount?: number;
  chunkExcerpt?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onCopy: (msgId: string) => void;
  onRetry: (msgId: string) => void;
}

const ChatMessage = ({ message, onCopy, onRetry }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isError = message.status === "failed";
  const isSending = message.status === "sending";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <Card className={`max-w-[80%] p-4 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">
              {isUser ? "You" : "Assistant"}
            </div>
            
            {/* Compact RAG indicator */}
            {message.chunkCount && message.chunkCount > 0 && (
              <div className="mb-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs flex items-center gap-2">
                <div className="flex items-center gap-1 text-primary font-medium">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  RAG: {message.chunkCount} chunks
                </div>
                {message.tokenCount && (
                  <div className="text-muted-foreground">• {message.tokenCount} tokens</div>
                )}
                {message.chunkExcerpt && (
                  <div className="text-muted-foreground italic truncate flex-1">
                    • "{message.chunkExcerpt}"
                  </div>
                )}
              </div>
            )}
            
            <div className="whitespace-pre-wrap">
              {isSending && !message.content ? "Thinking..." : message.content}
            </div>
            
            {isError && (
              <div className="text-destructive text-sm mt-2">
                Failed to get response
              </div>
            )}
          </div>
          
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(message.id)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRetry(message.id)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatMessage;