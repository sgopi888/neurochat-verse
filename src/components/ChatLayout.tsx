
import React, { useState } from 'react';
import ChatBot from './ChatBot';
import ChatSidebar from './ChatSidebar';
import UserSettings from './UserSettings';
import SuggestedQuestions from './SuggestedQuestions';
import LoadingIndicator from './LoadingIndicator';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatLayoutProps {
  messages: Message[];
  currentChatId: string | null;
  isLoading: boolean;
  suggestedQuestions: string[];
  showSuggestions: boolean;
  onSendMessage: (message: string) => void;
  onSuggestionClick: (question: string) => void;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  isPlaying: boolean;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  onPlayLatestResponse: () => void;
  onPauseAudio: () => void;
  musicName: string;
  musicVolume: number;
  onMusicUpload: (file: File) => void;
  onRemoveMusic: () => void;
  onVolumeChange: (volume: number) => void;
  isMobile: boolean;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  userEmail?: string;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onSignOut: () => void;
  // Video generation props
  isVideoGenerating: boolean;
  videoUrl: string | null;
  videoError: string | null;
  lastGeneratedAudioBlob: Blob | null;
  onGenerateVideo: () => void;
  onClearVideo: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  messages,
  currentChatId,
  isLoading,
  suggestedQuestions,
  showSuggestions,
  onSendMessage,
  onSuggestionClick,
  onChatSelect,
  onNewChat,
  isPlaying,
  selectedVoice,
  onVoiceChange,
  onPlayLatestResponse,
  onPauseAudio,
  musicName,
  musicVolume,
  onMusicUpload,
  onRemoveMusic,
  onVolumeChange,
  isMobile,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  userEmail,
  onCopy,
  onSpeak,
  onSignOut,
  isVideoGenerating,
  videoUrl,
  videoError,
  lastGeneratedAudioBlob,
  onGenerateVideo,
  onClearVideo
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadingIndicator = (
    <div className="flex justify-center py-4">
      <LoadingIndicator message="AI is thinking..." />
    </div>
  );

  const suggestedQuestionsComponent = showSuggestions && suggestedQuestions.length > 0 ? (
    <SuggestedQuestions 
      questions={suggestedQuestions} 
      onQuestionClick={onSuggestionClick}
    />
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-80 border-r border-gray-200 dark:border-gray-700">
          <ChatSidebar
            currentChatId={currentChatId}
            onChatSelect={onChatSelect}
            onNewChat={onNewChat}
            onSettingsClick={() => setIsSettingsOpen(true)}
            userEmail={userEmail}
          />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="absolute left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl">
            <ChatSidebar
              currentChatId={currentChatId}
              onChatSelect={onChatSelect}
              onNewChat={onNewChat}
              onSettingsClick={() => setIsSettingsOpen(true)}
              userEmail={userEmail}
              isMobile={true}
              onClose={() => onToggleMobileSidebar()}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatBot
          messages={messages}
          onSendMessage={onSendMessage}
          onCopy={onCopy}
          onSpeak={onSpeak}
          isLoading={isLoading}
          loadingIndicator={loadingIndicator}
          suggestedQuestions={suggestedQuestionsComponent}
          onSuggestionClick={onSuggestionClick}
          isMobile={isMobile}
          onToggleMobileSidebar={onToggleMobileSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
      </div>

      {/* Settings Modal */}
      <UserSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isPlaying={isPlaying}
        selectedVoice={selectedVoice}
        onVoiceChange={onVoiceChange}
        onPlayLatestResponse={onPlayLatestResponse}
        onPauseAudio={onPauseAudio}
        musicName={musicName}
        musicVolume={musicVolume}
        onMusicUpload={onMusicUpload}
        onRemoveMusic={onRemoveMusic}
        onVolumeChange={onVolumeChange}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isVideoGenerating={isVideoGenerating}
        videoUrl={videoUrl}
        videoError={videoError}
        lastGeneratedAudioBlob={lastGeneratedAudioBlob}
        onGenerateVideo={onGenerateVideo}
        onClearVideo={onClearVideo}
      />
    </div>
  );
};

export default ChatLayout;
