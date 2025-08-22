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
  probingMessages?: Message[]; // Made optional for backward compatibility
}

interface EnhancedChatBotProps {
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
  suggestedQuestionsList?: string[];
  showSuggestedQuestions?: boolean;
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
  canStopOperation?: boolean;
  onStopOperation?: () => void;
  processingStep?: string;
  chunksRetrieved?: number;
  totalTokens?: number;
  progress?: number;
  // RAG props
  isRagEnabled?: boolean;
  onRagToggle?: () => void;
  ragSteps?: any[];
  isRagProcessing?: boolean;
}

const EnhancedChatBot: React.FC<EnhancedChatBotProps> = (props) => {
  const { 
    chatMode, 
    canGenerateMeditation, 
    isGeneratingMeditation, 
    onGenerateMeditation,
    canStopOperation,
    onStopOperation,
    onPauseMessageAudio,
    isMessagePlaying,
    isMessageLoading,
    processingStep,
  chunksRetrieved,
  totalTokens,
  progress,
  // RAG props
  isRagEnabled,
  onRagToggle,
  ragSteps,
  isRagProcessing,
    suggestedQuestionsList,
    showSuggestedQuestions,
    ...chatBotProps 
  } = props;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ChatBot 
          {...chatBotProps} 
          chatMode={chatMode}
          canGenerateMeditation={canGenerateMeditation}
          isGeneratingMeditation={isGeneratingMeditation}
          onGenerateMeditation={onGenerateMeditation}
          canStopOperation={canStopOperation}
          onStopOperation={onStopOperation}
          onPauseMessageAudio={onPauseMessageAudio}
          isMessagePlaying={isMessagePlaying}
          isMessageLoading={isMessageLoading}
          processingStep={processingStep}
        chunksRetrieved={chunksRetrieved}
        totalTokens={totalTokens}
        progress={progress}
        // RAG props
        isRagEnabled={isRagEnabled}
        onRagToggle={onRagToggle}
        ragSteps={ragSteps}
        isRagProcessing={isRagProcessing}
          suggestedQuestionsList={suggestedQuestionsList}
          showSuggestedQuestions={showSuggestedQuestions}
        />
      </div>
    </div>
  );
};

export default EnhancedChatBot;