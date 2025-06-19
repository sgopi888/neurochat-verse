
import React from 'react';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex items-start space-x-2 max-w-xs md:max-w-md lg:max-w-lg ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-blue-100 text-blue-600'
        }`}>
          {message.isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        
        <div className={`rounded-2xl px-4 py-3 ${
          message.isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-blue-50 border border-blue-200 text-gray-800'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          <p className={`text-xs mt-1 ${
            message.isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
