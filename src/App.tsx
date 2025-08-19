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
import { useMobileManager } from '@/hooks/useMobileManager';

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { hasAgreed, showModal, handleAgree } = useUserAgreement();

  // File upload state
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; type: 'pdf' | 'image' } | null>(null);
  const [fileContent, setFileContent] = React.useState<string>('');

  // Chat management
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
    setShowSuggestions,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions
  } = useChatManager();

  // Audio management with background music
  const {
    isPlaying,
    selectedVoice,
    isAudioProcessing,
    handlePlayLatestResponse,
    handlePauseAudio,
    setSelectedVoice,
    stopCurrentAudio,
    musicName,
    musicVolume,
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange
  } = useAudioManager(messages);

  // Mobile management
  const {
    isMobile,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar
  } = useMobileManager();

  // App effects and utilities
  const { handleCopy, handleSignOut } = useAppEffects(
    messages,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions,
    stopCurrentAudio
  );

  // Enhanced handlers that include mobile sidebar management
  const enhancedSendMessage = (text: string) => {
    closeMobileSidebar();
    handleSendMessage(text);
  };

  const enhancedChatSelect = (chatId: string) => {
    closeMobileSidebar();
    handleChatSelect(chatId);
  };

  const enhancedNewChat = () => {
    closeMobileSidebar();
    handleNewChat();
  };

  const enhancedSuggestionClick = (question: string) => {
    setShowSuggestions(false);
    enhancedSendMessage(question);
  };

  const enhancedSignOut = async () => {
    await handleSignOut();
    handleNewChat();
    closeMobileSidebar();
  };

  // Enhanced speak handler that uses TTS
  const handleSpeak = (text: string) => {
    // This will trigger the latest response audio play
    handlePlayLatestResponse();
  };

  // File upload handlers
  const handleFileContent = (content: string, filename: string, type: 'pdf' | 'image') => {
    setFileContent(content);
    setUploadedFile({ name: filename, type });
  };

  const handleClearFile = () => {
    setFileContent('');
    setUploadedFile(null);
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
      onSendMessage={enhancedSendMessage}
      onSuggestionClick={enhancedSuggestionClick}
      onChatSelect={enhancedChatSelect}
      onNewChat={enhancedNewChat}
      isPlaying={isPlaying}
      isAudioProcessing={isAudioProcessing}
      selectedVoice={selectedVoice}
      onPlayLatestResponse={handlePlayLatestResponse}
      onPauseAudio={handlePauseAudio}
      onVoiceChange={setSelectedVoice}
      musicName={musicName}
      musicVolume={musicVolume}
      onMusicUpload={handleMusicUpload}
      onRemoveMusic={handleRemoveMusic}
      onVolumeChange={handleVolumeChange}
      onCopy={handleCopy}
      onSpeak={handleSpeak}
      onSignOut={enhancedSignOut}
      isMobile={isMobile}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobileSidebar={toggleMobileSidebar}
      userEmail={user?.email}
      onFileContent={handleFileContent}
      onClearFile={handleClearFile}
      uploadedFile={uploadedFile}
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