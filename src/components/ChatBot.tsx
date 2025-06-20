import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionId: string;
  setSessionId: React.Dispatch<React.SetStateAction<string>>;
  question: string;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isListening: boolean;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  onSpeakText: (text: string) => Promise<void>;
}

const ChatBot: React.FC<ChatBotProps> = ({ 
  messages, 
  setMessages, 
  sessionId, 
  setSessionId,
  onSpeakText
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('neuroheart-session-id');
    const storedMessages = localStorage.getItem('neuroheart-chat-history');
    
    if (storedSessionId && !sessionId) {
      setSessionId(storedSessionId);
    } else if (!sessionId) {
      const newSessionId = `user_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('neuroheart-session-id', newSessionId);
    }

    if (storedMessages && messages.length === 0) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Error parsing stored messages:', error);
      }
    }
  }, [sessionId, messages.length, setSessionId, setMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('neuroheart-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="p-4">
      <div className="w-full max-w-full space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Welcome to NeuroChat</h3>
            <p className="text-gray-500 dark:text-gray-400">Ask me anything and I'll help you find the answer!</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onCopy={copyToClipboard}
            onSpeak={onSpeakText}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatBot;
