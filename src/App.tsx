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
    // Video generation exports
    isVideoGenerating,
    videoUrl,
    videoError,
    lastGeneratedAudioBlob,
    handleGenerateVideo,
    clearVideo
  } = useAudioManager(messages);

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
    // Close mobile sidebar when sending a message
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
    handleSendMessage(text);
  };

  // Enhanced handlers for mobile sidebar management
  const enhancedHandleNewChat = () => {
    handleNewChat();
    // Close mobile sidebar when starting new chat
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const enhancedHandleChatSelect = (chatId: string) => {
    handleChatSelect(chatId);
    // Close mobile sidebar when selecting a chat
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  // Enhanced handleSpeak that actually calls the audio function
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
      isVideoGenerating={isVideoGenerating}
      videoUrl={videoUrl}
      videoError={videoError}
      lastGeneratedAudioBlob={lastGeneratedAudioBlob}
      onGenerateVideo={handleGenerateVideo}
      onClearVideo={clearVideo}
    />
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
