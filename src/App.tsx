import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Auth from '@/components/Auth';
import LoadingIndicator from '@/components/LoadingIndicator';
import DisclaimerModal from '@/components/DisclaimerModal';
import ChatLayout from '@/components/ChatLayout';
import SimpleRAGTest from '@/components/SimpleRAGTest';
import { useAuth } from '@/hooks/useAuth';
import { useUserAgreement } from '@/hooks/useUserAgreement';
import { useChatManager } from '@/hooks/useChatManager';
import { useChatHistory } from '@/hooks/useChatHistory';
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

  // Chat message management
  const {
    messages,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    handleSendMessage,
    generateMeditationScript,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    chatMode,
    isGeneratingMeditation,
    canGenerateMeditation,
    canStopOperation,
    stopCurrentOperation,
    setShowSuggestions,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    allDisplayMessages,
    processingStep,
    chunksRetrieved,
    totalTokens,
    progress
  } = useChatManager();

  // Chat history management  
  const {
    chatSessions,
    isLoading: isLoadingHistory,
    deleteChat
  } = useChatHistory(currentChatId);

  // Audio management with background music
  const {
    isPlaying,
    selectedVoice,
    isAudioProcessing,
    handlePlayLatestResponse,
    handlePauseAudio,
    setSelectedVoice,
    stopCurrentAudio,
    // New individual message audio
    playMessageAudio,
    pauseMessageAudio,
    isMessagePlaying,
    isMessageLoading,
    // Background music
    musicName,
    musicVolume,
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange
  } = useAudioManager(allDisplayMessages);

  // Mobile management
  const {
    isMobile,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar
  } = useMobileManager();

  // App effects and utilities  
  const { handleCopy, handleSignOut } = useAppEffects(
    allDisplayMessages,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions,
    async () => stopCurrentAudio()
  );

  // Enhanced handlers that include mobile sidebar management
  const enhancedSendMessage = (text: string) => {
    closeMobileSidebar();
    
    // Auto-inject file content if available but keep user message clean
    if (fileContent && uploadedFile) {
      const excerpt = fileContent.length > 100 ? fileContent.substring(0, 100) + "..." : fileContent;
      const userDisplayText = `[File: ${uploadedFile.name}] ${excerpt}\n\n${text}`;
      const fullContextText = `[File: ${uploadedFile.name}]\n\n${fileContent}\n\n---\n\nUser query: ${text}`;
      
      // Update the user message after sending to show excerpt
      handleSendMessage(fullContextText);
      
      // Update the last user message to show excerpt after a small delay
      setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev];
          let lastUserMsgIndex = -1;
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].isUser) {
              lastUserMsgIndex = i;
              break;
            }
          }
          if (lastUserMsgIndex !== -1) {
            updated[lastUserMsgIndex] = {
              ...updated[lastUserMsgIndex],
              text: userDisplayText
            };
          }
          return updated;
        });
      }, 100);
      
      handleClearFile();
    } else {
      handleSendMessage(text);
    }
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

  // Enhanced speak handler that uses individual message TTS
  const handleSpeak = (messageId: string, message: any) => {
    playMessageAudio(message);
  };

  // Handle pause for individual messages
  const handlePauseMessageAudio = (messageId: string) => {
    pauseMessageAudio(messageId);
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
      messages={allDisplayMessages}
      currentChatId={currentChatId}
      isLoading={isLoading || isGeneratingMeditation}
      suggestedQuestions={suggestedQuestions}
      showSuggestions={showSuggestions}
      suggestedQuestionsList={suggestedQuestions}
      showSuggestedQuestions={showSuggestions}
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
      onPauseMessageAudio={handlePauseMessageAudio}
      isMessagePlaying={isMessagePlaying}
      isMessageLoading={isMessageLoading}
      onSignOut={enhancedSignOut}
      isMobile={isMobile}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onToggleMobileSidebar={toggleMobileSidebar}
      userEmail={user?.email}
      onFileContent={handleFileContent}
      onClearFile={handleClearFile}
      uploadedFile={uploadedFile}
      // Enhanced chat props
      chatMode={chatMode}
      canGenerateMeditation={canGenerateMeditation}
      isGeneratingMeditation={isGeneratingMeditation}
      onGenerateMeditation={generateMeditationScript}
      canStopOperation={canStopOperation}
      onStopOperation={stopCurrentOperation}
      // New unified chat props
      chatSessions={chatSessions}
      isLoadingHistory={isLoadingHistory}
      onDeleteChat={deleteChat}
      // Processing progress props
      processingStep={processingStep}
      chunksRetrieved={chunksRetrieved}
      totalTokens={totalTokens}
      progress={progress}
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
            <Route path="/rag-test" element={<SimpleRAGTest />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;