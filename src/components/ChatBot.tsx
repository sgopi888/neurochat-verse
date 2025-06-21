
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Menu, Settings } from 'lucide-react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  isLoading?: boolean;
  loadingIndicator?: React.ReactNode;
  suggestedQuestions?: React.ReactNode;
  onSuggestionClick?: (question: string) => void;
  isMobile?: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

const ChatBot: React.FC<ChatBotProps> = ({
  messages,
  onSendMessage,
  onCopy,
  onSpeak,
  isLoading = false,
  loadingIndicator,
  suggestedQuestions,
  onSuggestionClick,
  isMobile = false,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (question: string) => {
    console.log('ChatBot: Suggestion clicked:', question);
    setInput(''); // Clear any existing input
    if (onSuggestionClick) {
      onSuggestionClick(question);
    }
    // Focus the textarea after the suggestion is processed
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Clone the suggested questions element and pass the click handler
  const clonedSuggestedQuestions = suggestedQuestions && React.isValidElement(suggestedQuestions)
    ? React.cloneElement(suggestedQuestions as React.ReactElement<any>, {
        onQuestionClick: handleSuggestionClick
      })
    : suggestedQuestions;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile hamburger menu */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMobileSidebar}
                  className="p-2 h-8 w-8"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Mindfulness Coach
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your personal wellness companion
                </p>
              </div>
            </div>
            
            {/* Mobile settings button - Only shown when sidebar is closed */}
            {isMobile && !isMobileSidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMobileSidebar}
                className="p-2 h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to your Mindfulness Coach
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              I'm here to help you with meditation, stress relief, and wellness practices. 
              What would you like to explore today?
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {[
                "Help me with a breathing exercise",
                "I'm feeling stressed today",
                "Guide me through meditation",
                "Tips for better sleep"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={onCopy}
            onSpeak={onSpeak}
          />
        ))}

        {isLoading && loadingIndicator}

        {clonedSuggestedQuestions}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about mindfulness, meditation, or wellness..."
              className="min-h-[44px] max-h-32 resize-none pr-12 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
              disabled={isLoading}
            />
            <Button
              type="button"
              onClick={toggleVoiceRecognition}
              size="sm"
              variant="ghost"
              className={`absolute right-2 top-2 h-8 w-8 p-0 ${
                isListening 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-11 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
