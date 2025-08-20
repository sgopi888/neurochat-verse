import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Menu, Settings } from 'lucide-react';
import MessageBubble from './MessageBubble';
import FileUpload from './FileUpload';

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
  onSpeak: (messageId: string, message: any) => void;
  onPauseMessageAudio?: (messageId: string) => void;
  isMessagePlaying?: (messageId: string) => boolean;
  isMessageLoading?: (messageId: string) => boolean;
  isLoading?: boolean;
  loadingIndicator?: React.ReactNode;
  suggestedQuestions?: React.ReactNode;
  onSuggestionClick?: (question: string) => void;
  isMobile?: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  // File upload props
  onFileContent: (content: string, filename: string, type: 'pdf' | 'image') => void;
  onClearFile: () => void;
  uploadedFile: { name: string; type: 'pdf' | 'image' } | null;
  // Enhanced chat props
  chatMode?: any;
  canGenerateMeditation?: boolean;
  isGeneratingMeditation?: boolean;
  onGenerateMeditation?: () => void;
  canStopOperation?: boolean;
  onStopOperation?: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({
  messages,
  onSendMessage,
  onCopy,
  onSpeak,
  onPauseMessageAudio,
  isMessagePlaying,
  isMessageLoading,
  isLoading = false,
  loadingIndicator,
  suggestedQuestions,
  onSuggestionClick,
  isMobile = false,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  onFileContent,
  onClearFile,
  uploadedFile,
  chatMode,
  canGenerateMeditation,
  isGeneratingMeditation,
  onGenerateMeditation
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
    setInput('');
    if (onSuggestionClick) {
      onSuggestionClick(question);
    }
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

  const clonedSuggestedQuestions = suggestedQuestions && React.isValidElement(suggestedQuestions)
    ? React.cloneElement(suggestedQuestions as React.ReactElement<any>, {
        onQuestionClick: handleSuggestionClick
      })
    : suggestedQuestions;

  // Updated welcome questions as specified
  const welcomeMeditationQuestions = [
    "Help me with my stress today",
    "Conduct an emotional healing session",
    "Guide me through a relaxation process",
    "Meditation for better sleep"
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-card to-accent/10">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile hamburger menu - Only visible on mobile and when sidebar is closed */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMobileSidebar}
                  className="p-2 h-8 w-8"
                  disabled={isLoading}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}

              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  NeuroHeart.AI Meditative Process Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your personal wellness companion
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Fixed height container with internal scrolling */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to your Meditative Process Generator
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              I'm here to create personalized meditation scripts for you. Choose a duration that feels right for your current needs.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {welcomeMeditationQuestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-card/60 hover:bg-card border-border text-left justify-start max-w-xs hover:border-primary/50 transition-all duration-200"
                  disabled={isLoading}
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
            onPauseAudio={onPauseMessageAudio}
            isPlaying={isMessagePlaying?.(message.id)}
            isLoadingAudio={isMessageLoading?.(message.id)}
          />
        ))}

        {isLoading && loadingIndicator}

        {/* Only show suggestions when not loading and not on mobile with sidebar open */}
        {!isLoading && (!isMobile || !isMobileSidebarOpen) && clonedSuggestedQuestions}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 flex-shrink-0">
        {/* Generate Meditation Button - Show when ready */}
        {chatMode?.mode === 'probing' && chatMode.probingMessages.length > 0 && canGenerateMeditation && (
          <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Ready to create your meditation?</p>
                <p className="text-xs text-muted-foreground">Based on our conversation, I can now generate a personalized meditation script for you.</p>
              </div>
              <Button
                onClick={onGenerateMeditation}
                disabled={isGeneratingMeditation}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground border-0"
              >
                {isGeneratingMeditation ? 'Creating...' : 'Generate Meditation'}
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to create a meditation script for you..."
              className="min-h-[44px] max-h-32 resize-none pr-16 bg-card border-border focus:border-primary"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <FileUpload
                onFileContent={onFileContent}
                onClearFile={onClearFile}
                uploadedFile={uploadedFile}
                disabled={isLoading}
              />
              <Button
                type="button"
                onClick={toggleVoiceRecognition}
                size="sm"
                variant="ghost"
                className={`h-8 w-8 p-0 ${
                  isListening
                    ? 'text-destructive hover:text-destructive/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={isLoading}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-11 px-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;