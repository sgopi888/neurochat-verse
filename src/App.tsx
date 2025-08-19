import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoadingIndicator from '@/components/LoadingIndicator';
import ChatLayout from '@/components/ChatLayout';
import { useChatManager } from '@/hooks/useChatManager';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useAppEffects } from '@/hooks/useAppEffects';
import { useVideoManager } from '@/features/video/hooks/useVideoManager';
import VideoPlayerPopup from '@/features/video/components/VideoPlayerPopup';

const queryClient = new QueryClient();

function AppContent() {
  // Work without authentication
  const userId = 'test-user-12345';
  const userEmail = 'test@example.com';
  
  // File upload state
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; type: 'pdf' | 'image' } | null>(null);
  const [fileContent, setFileContent] = React.useState<string>('');
  
  // Initialize chat management
  const {
    messages,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    handleSendMessage,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions,
  } = useChatManager();

  // Initialize audio management
  const {
    isPlaying,
    selectedVoice,
    setSelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio,
    musicName,
    musicVolume,
    
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange,
    isAudioProcessing
  } = useAudioManager(messages);

  // Initialize video management - now with enhanced progress tracking
  const {
    isVideoEnabled,
    isGenerating: isVideoGenerating,
    videoUrl,
    hostedUrl,
    videoError,
    currentStep,
    popupState,
    canGenerateVideo,
    handleGenerateVideo,
    clearVideo,
    setPopupState
  } = useVideoManager(messages);

  // Initialize app effects and utilities
  const {
    isMobile,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleCopy,
    handleSpeak,
    handleSignOut,
    toggleMobileSidebar
  } = useAppEffects(
    messages,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions,
    stopCurrentAudio
  );

  // Enhanced handleSendMessage that closes mobile sidebar
  const enhancedHandleSendMessage = (text: string) => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
    handleSendMessage(text);
  };

  // Enhanced handlers for mobile sidebar management
  const enhancedHandleNewChat = () => {
    handleNewChat();
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const enhancedHandleChatSelect = (chatId: string) => {
    handleChatSelect(chatId);
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const enhancedHandleSpeak = (text: string) => {
    handlePlayLatestResponse();
  };

  // File upload handlers
  const handleFileContent = (content: string, filename: string, type: 'pdf' | 'image') => {
    setFileContent(content);
    setUploadedFile({ name: filename, type });
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setFileContent('');
  };

  const getFileContextForMessage = (userInput: string) => {
    if (!fileContent) return userInput;
    return `File content (${uploadedFile?.name}):\n\n${fileContent}\n\nUser message: ${userInput}`;
  };

  return (
    <>
      <ChatLayout
        messages={messages}
        currentChatId={currentChatId}
        isLoading={isLoading}
        suggestedQuestions={suggestedQuestions}
        showSuggestions={showSuggestions}
        onSendMessage={enhancedHandleSendMessage}
        onSuggestionClick={handleSuggestionClick}
        onChatSelect={enhancedHandleChatSelect}
        onNewChat={enhancedHandleNewChat}
        isPlaying={isPlaying}
        isAudioProcessing={isAudioProcessing}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        onPlayLatestResponse={handlePlayLatestResponse}
        onPauseAudio={handlePauseAudio}
        musicName={musicName}
        musicVolume={musicVolume}
        onMusicUpload={handleMusicUpload}
        onRemoveMusic={handleRemoveMusic}
        onVolumeChange={handleVolumeChange}
        isMobile={isMobile}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={toggleMobileSidebar}
        userEmail={userEmail}
        onCopy={handleCopy}
        onSpeak={enhancedHandleSpeak}
        onSignOut={() => {}}
        uploadedFile={uploadedFile}
        onFileContent={handleFileContent}
        onClearFile={handleClearFile}
        getFileContextForMessage={getFileContextForMessage}
      />
      
      {/* Enhanced Video Player Popup */}
      {isVideoEnabled && (
        <VideoPlayerPopup
          videoUrl={videoUrl}
          hostedUrl={hostedUrl}
          isVisible={popupState !== 'hidden'}
          isMinimized={popupState === 'minimized'}
          onClose={() => {
            clearVideo();
            setPopupState('hidden');
          }}
          onMinimize={() => setPopupState('minimized')}
          onMaximize={() => setPopupState('playing')}
        />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;