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
  // Initialize chat management (no auth required)
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
    setShowSuggestions
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
    lastGeneratedAudioBlob,
    lastGeneratedText
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
        userEmail="guest@example.com"
        onCopy={handleCopy}
        onSpeak={enhancedHandleSpeak}
        onSignOut={handleSignOut}
        // Enhanced video props
        isVideoEnabled={isVideoEnabled}
        canGenerateVideo={canGenerateVideo}
        onGenerateVideo={handleGenerateVideo}
        isVideoGenerating={isVideoGenerating}
        videoCurrentStep={currentStep}
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
