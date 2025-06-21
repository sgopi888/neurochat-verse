
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
    <div className={`group flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[85%] lg:max-w-[70%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 transform transition-all duration-300 ease-out`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
          message.isUser 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}>
          {message.isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </div>

        {/* Message Content */}
        <div className={`transition-all duration-300 ease-out transform hover:scale-[1.01] ${
          message.isUser 
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md shadow-lg hover:shadow-xl' 
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
        } px-4 py-3 relative`}>
          
          {/* Message Text */}
          <div className="mb-2">
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
              message.isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {message.text}
            </p>
          </div>

          {/* Timestamp and Actions */}
          <div className={`flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            message.isUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <span className={`text-xs transition-colors duration-200 ${
              message.isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatTime(message.timestamp)}
            </span>
            
            <div className="flex gap-1">
              <Button
                onClick={() => onCopy(message.text)}
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 rounded-md transition-all duration-200 hover:scale-110 ${
                  message.isUser 
                    ? 'hover:bg-blue-500 text-blue-100 hover:text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              {!message.isUser && (
                <Button
                  onClick={() => onSpeak(message.text)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-md transition-all duration-200 hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Volume2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
