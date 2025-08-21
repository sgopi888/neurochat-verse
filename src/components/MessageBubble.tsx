
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Volume2, User, Bot, Pause, Loader2, ExternalLink, Clock, CheckCircle2, Circle } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    responseTime?: number;
    sources?: { url: string; title: string }[];
    progress?: Array<{ step: string; status: 'pending' | 'processing' | 'completed'; details?: string }>;
  };
  onCopy: (text: string) => void;
  onSpeak: (messageId: string, message: any) => void;
  isPlaying?: boolean;
  isLoadingAudio?: boolean;
  onPauseAudio?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onCopy, 
  onSpeak, 
  isPlaying = false, 
  isLoadingAudio = false, 
  onPauseAudio 
}) => {
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
          
          {/* Timestamp and Response Time */}
          <div className={`text-xs mb-2 flex items-center gap-2 ${
            message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {!message.isUser && message.responseTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {message.responseTime}ms
              </span>
            )}
          </div>

          {/* Progress Indicators - Show if available and not user message */}
          {!message.isUser && message.progress && message.progress.length > 0 && (
            <div className="mb-3 p-3 bg-muted/30 rounded-lg border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Processing Steps:</p>
              <div className="space-y-2">
                {message.progress.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {step.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {step.status === 'processing' && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
                    {step.status === 'pending' && <Circle className="h-3 w-3 text-muted-foreground" />}
                    <span className={
                      step.status === 'completed' ? 'text-green-700 dark:text-green-400' :
                      step.status === 'processing' ? 'text-blue-700 dark:text-blue-400' :
                      'text-muted-foreground'
                    }>
                      {step.step}
                      {step.details && (
                        <span className="text-muted-foreground ml-1">({step.details})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Text */}
          <div className="mb-2">
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
              message.isUser ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {message.text}
            </p>
          </div>

          {/* Sources - Show if available and not user message */}
          {!message.isUser && message.sources && message.sources.length > 0 && (
            <div className="mb-3 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
              <div className="flex flex-wrap gap-1">
                {message.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors duration-200 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

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
                onClick={() => {
                  if (isPlaying) {
                    onPauseAudio?.(message.id);
                  } else {
                    onSpeak(message.id, message);
                  }
                }}
                variant="ghost"
                size="sm"
                disabled={isLoadingAudio}
                className="h-6 w-6 p-0 rounded-md transition-all duration-200 hover:scale-110 hover:bg-muted text-muted-foreground hover:text-primary"
              >
                {isLoadingAudio ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
