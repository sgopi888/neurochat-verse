
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Volume2, User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
  };
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onCopy, onSpeak }) => {
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeString = date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (messageDate.getTime() === today.getTime()) {
      return `Today ${timeString}`;
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return `Yesterday ${timeString}`;
    } else {
      return `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })} ${timeString}`;
    }
  };

  return (
    <div className={`group flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[85%] lg:max-w-[70%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 transform transition-all duration-300 ease-out`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
          message.isUser 
            ? 'bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground hover:from-primary/90 hover:via-accent/90 hover:to-secondary/90 shadow-lg' 
            : 'bg-card border border-border hover:border-primary/50'
        }`}>
          {message.isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Message Content */}
        <div className={`transition-all duration-300 ease-out transform hover:scale-[1.01] ${
          message.isUser 
            ? 'bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground rounded-2xl rounded-tr-md shadow-lg hover:shadow-xl border border-primary/20' 
            : 'bg-card border border-border rounded-2xl rounded-tl-md shadow-sm hover:shadow-md hover:border-primary/50'
        } px-4 py-3 relative`}>
          
          {/* Timestamp - Always visible at top */}
          <div className={`text-xs mb-2 ${
            message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>

          {/* Message Text */}
          <div className="mb-2">
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
              message.isUser ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {message.text}
            </p>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            message.isUser ? 'justify-end' : 'justify-start'
          }`}>
            <Button
              onClick={() => onCopy(message.text)}
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 rounded-md transition-all duration-200 hover:scale-110 ${
                message.isUser 
                  ? 'hover:bg-primary/80 text-primary-foreground/70 hover:text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Copy className="h-3 w-3" />
            </Button>
            
            {!message.isUser && (
              <Button
                onClick={() => onSpeak(message.text)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-md transition-all duration-200 hover:scale-110 hover:bg-muted text-muted-foreground hover:text-primary"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
