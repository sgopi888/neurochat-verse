
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
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        message.isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 border border-gray-200'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          {message.isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-gray-600" />
          )}
          <span className={`text-xs ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className="mb-3">
          <p className={`text-sm whitespace-pre-wrap ${
            message.isUser ? 'text-white' : 'text-gray-900'
          }`}>
            {message.text}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => onCopy(message.text)}
            variant="ghost"
            size="sm"
            className={`h-6 px-2 ${
              message.isUser 
                ? 'hover:bg-blue-500 text-blue-100 hover:text-white' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {!message.isUser && (
            <Button
              onClick={() => onSpeak(message.text)}
              variant="ghost"
              size="sm"
              className="h-6 px-2 hover:bg-gray-200 text-gray-600"
            >
              <Volume2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
