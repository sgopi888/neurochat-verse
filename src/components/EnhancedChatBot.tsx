import React from 'react';
import ChatBot from './ChatBot';
import { useAdvancedSettings } from '@/hooks/useAdvancedSettings';
import { AdvancedGPTService } from '@/services/advancedGptService';
import { toast } from 'sonner';

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
    ...chatBotProps 
  } = props;

  const { settings, updateSettings } = useAdvancedSettings();

  const handleWebToggle = () => {
    updateSettings({ enableWeb: !settings.enableWeb });
    if (!settings.enableWeb) {
      toast.success('Web search enabled');
    } else {
      toast.info('Web search disabled');
    }
  };

  const handleCodeToggle = () => {
    updateSettings({ enableCode: !settings.enableCode });
    if (!settings.enableCode) {
      toast.success('Code interpreter enabled');
    } else {
      toast.info('Code interpreter disabled');
    }
  };

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
          enableWeb={settings.enableWeb && settings.useAdvancedMode}
          enableCode={settings.enableCode && settings.useAdvancedMode}
          onWebToggle={handleWebToggle}
          onCodeToggle={handleCodeToggle}
        />
      </div>
    </div>
  );
};

export default EnhancedChatBot;