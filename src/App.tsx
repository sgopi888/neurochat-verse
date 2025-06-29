
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Auth from '@/components/Auth';
import LoadingIndicator from '@/components/LoadingIndicator';
import DisclaimerModal from '@/components/DisclaimerModal';
import ChatLayout from '@/components/ChatLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserAgreement } from '@/hooks/useUserAgreement';
import { useChatManager } from '@/hooks/useChatManager';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useAppEffects } from '@/hooks/useAppEffects';
import { useVideoManager } from '@/features/video/hooks/useVideoManager';
import VideoPlayerPopup from '@/features/video/components/VideoPlayerPopup';

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { hasAgreed, showModal, handleAgree } = useUserAgreement();
  
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

  // Initialize video management
  const {
    isVideoEnabled,
    isGenerating: isVideoGenerating,
    videoUrl,
    videoError,
    popupState,
    canGenerateVideo,
    handleGenerateVideo,
    clearVideo,
    setPopupState
  } = useVideoManager(messages, lastGeneratedAudioBlob, lastGeneratedText);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator message="Loading application..." />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!hasAgreed) {
    return <DisclaimerModal isOpen={showModal} onAgree={handleAgree} />;
  }

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
        userEmail={user?.email}
        onCopy={handleCopy}
        onSpeak={enhancedHandleSpeak}
        onSignOut={handleSignOut}
        // Video props
        isVideoEnabled={isVideoEnabled}
        canGenerateVideo={canGenerateVideo}
        onGenerateVideo={handleGenerateVideo}
        isVideoGenerating={isVideoGenerating}
      />
      
      {/* Video Player Popup */}
      {isVideoEnabled && (
        <VideoPlayerPopup
          videoUrl={videoUrl}
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
