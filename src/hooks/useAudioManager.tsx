
import { useBackgroundMusic } from './useBackgroundMusic';
import { useUnifiedAudio } from './useUnifiedAudio';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const useAudioManager = (messages: Message[]) => {
  // Background music functionality
  const {
    musicName,
    musicVolume,
    isDefaultMusic,
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange,
    playBackgroundMusic,
    pauseBackgroundMusic,
    stopBackgroundMusic,
    backgroundMusicRef
  } = useBackgroundMusic();

  // 🎵 Unified audio system - handles both play script and bubble audio with BGM sync
  const {
    selectedVoice,
    setSelectedVoice,
    handlePlayLatestResponse,
    playMessageAudio,
    pauseMessageAudio,
    pauseCurrentAudio,
    resumeCurrentAudio,
    stopCurrentAudio,
    isMessagePlaying,
    isMessageLoading,
    isGlobalPlaying,
    isGlobalProcessing,
    currentPlayingMessageId,
    // Legacy compatibility
    isPlaying,
    isAudioProcessing,
    currentAudio,
    handlePauseAudio
  } = useUnifiedAudio(messages, playBackgroundMusic, pauseBackgroundMusic, stopBackgroundMusic, backgroundMusicRef, musicVolume);

  // Enhanced music upload handler that syncs with TTS state
  const handleMusicUploadWithSync = (file: File) => {
    handleMusicUpload(file, isPlaying); // Pass current playing state
  };

  return {
    // 🎵 Unified audio exports - all audio now synchronized with BGM
    isPlaying,
    selectedVoice,
    currentAudio,
    isAudioProcessing,
    setSelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    pauseCurrentAudio,
    resumeCurrentAudio,
    stopCurrentAudio,
    
    // Individual message audio (now unified)
    playMessageAudio,
    pauseMessageAudio,
    isMessagePlaying,
    isMessageLoading,
    currentPlayingMessageId,
    
    // Global state queries
    isGlobalPlaying,
    isGlobalProcessing,
    
    // Background music exports
    musicName,
    musicVolume,
    isDefaultMusic,
    handleMusicUpload: handleMusicUploadWithSync,
    handleRemoveMusic,
    handleVolumeChange
  };
};
