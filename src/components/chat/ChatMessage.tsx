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
            
            {/* Show concepts if available */}
            {message.concepts && message.concepts.length > 0 && (
              <div className="mb-2 p-2 bg-background/50 rounded text-xs">
                <div className="font-medium">Extracted Concepts:</div>
                <div className="text-muted-foreground">{message.concepts.join(", ")}</div>
              </div>
            )}
            
            {/* Show chunks if available */}
            {message.chunks && message.chunks.length > 0 && (
              <div className="mb-2 p-2 bg-background/50 rounded text-xs">
                <div className="font-medium">Retrieved Chunks:</div>
                <div className="text-muted-foreground">{message.chunks.join(" | ")}</div>
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