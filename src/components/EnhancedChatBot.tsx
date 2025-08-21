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

  const { settings } = useAdvancedSettings();

  const handleWebSearch = async () => {
    if (!settings.enableWeb) {
      toast.error('Web search is not enabled');
      return;
    }
    
    try {
      // Trigger web-enhanced meditation generation
      const lastUserMessage = props.messages.filter(m => m.isUser).pop();
      if (lastUserMessage) {
        const response = await AdvancedGPTService.webEnhancedMeditation(
          lastUserMessage.text,
          props.messages,
          settings
        );
        
        if (response.success) {
          toast.success('Found fresh insights from web search');
          // Handle structured response here
          const structured = AdvancedGPTService.parseStructuredResponse(response.data);
          if (structured) {
            console.log('Web search results:', structured);
          }
        }
      }
    } catch (error) {
      console.error('Web search error:', error);
      toast.error('Web search failed');
    }
  };

  const handleCodeAnalysis = async (bpmData?: number[]) => {
    if (!settings.enableCode) {
      toast.error('Code interpreter is not enabled');
      return;
    }

    // If no BPM data provided, use sample data for demonstration
    const sampleBpm = bpmData || [72, 75, 73, 76, 74, 72, 77, 75, 73, 74];
    
    try {
      const response = await AdvancedGPTService.bpmAnalysis(sampleBpm, settings);
      
      if (response.success) {
        toast.success('BPM analysis completed');
        console.log('BPM analysis results:', response.data);
      }
    } catch (error) {
      console.error('Code analysis error:', error);
      toast.error('Code analysis failed');
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
          onWebSearch={handleWebSearch}
          onCodeAnalysis={handleCodeAnalysis}
        />
      </div>
    </div>
  );
};

export default EnhancedChatBot;