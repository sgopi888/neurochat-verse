
import { useBackgroundMusic } from './useBackgroundMusic';
import { useTTSAudio } from './useTTSAudio';
import { useMessageAudio } from './useMessageAudio';

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

  // Legacy TTS audio functionality for backward compatibility
  const {
    isPlaying,
    selectedVoice: legacySelectedVoice,
    currentAudio,
    isAudioProcessing,
    lastGeneratedAudioBlob,
    lastGeneratedText,
    setSelectedVoice: setLegacySelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio
  } = useTTSAudio(messages, playBackgroundMusic, pauseBackgroundMusic, stopBackgroundMusic, backgroundMusicRef, musicVolume);

  // New individual message audio functionality
  const {
    selectedVoice,
    setSelectedVoice,
    playMessageAudio,
    pauseMessageAudio,
    stopCurrentAudio: stopCurrentMessageAudio,
    isMessagePlaying,
    isMessageLoading,
    currentPlayingMessageId
  } = useMessageAudio(pauseBackgroundMusic, stopBackgroundMusic, backgroundMusicRef, musicVolume);

  // Enhanced music upload handler that syncs with TTS state
  const handleMusicUploadWithSync = (file: File) => {
    handleMusicUpload(file, isPlaying); // Pass current playing state
  };

  return {
    // Legacy TTS audio exports (for backward compatibility)
    isPlaying,
    selectedVoice: legacySelectedVoice,
    currentAudio,
    isAudioProcessing,
    lastGeneratedAudioBlob,
    lastGeneratedText,
    setSelectedVoice: setLegacySelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio,
    
    // New individual message audio exports
    messageSelectedVoice: selectedVoice,
    setMessageSelectedVoice: setSelectedVoice,
    playMessageAudio,
    pauseMessageAudio,
    stopCurrentMessageAudio,
    isMessagePlaying,
    isMessageLoading,
    currentPlayingMessageId,
    
    // Background music exports
    musicName,
    musicVolume,
    isDefaultMusic,
    handleMusicUpload: handleMusicUploadWithSync,
    handleRemoveMusic,
    handleVolumeChange
  };
};
