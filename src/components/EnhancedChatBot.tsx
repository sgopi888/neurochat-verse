import React from 'react';
import ChatBot from './ChatBot';
import MeditationGenerator from './MeditationGenerator';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMode {
  mode: 'probing' | 'generating';
  probingMessages: Message[];
}

interface EnhancedChatBotProps {
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
  onFileContent: (content: string, filename: string, type: 'pdf' | 'image') => void;
  onClearFile: () => void;
  uploadedFile: { name: string; type: 'pdf' | 'image' } | null;
  chatMode?: ChatMode;
  canGenerateMeditation?: boolean;
  isGeneratingMeditation?: boolean;
  onGenerateMeditation?: () => void;
}

const EnhancedChatBot: React.FC<EnhancedChatBotProps> = (props) => {
  const { chatMode, canGenerateMeditation, isGeneratingMeditation, onGenerateMeditation, ...chatBotProps } = props;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <ChatBot {...chatBotProps} />
      </div>
      
      {/* Show meditation generator when in probing mode with messages */}
      {chatMode?.mode === 'probing' && chatMode.probingMessages.length > 0 && (
        <div className="border-t border-border bg-card/50 p-4">
          <MeditationGenerator
            canGenerate={canGenerateMeditation || false}
            isGenerating={isGeneratingMeditation || false}
            onGenerate={onGenerateMeditation || (() => {})}
            probingMessageCount={chatMode.probingMessages.length}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedChatBot;