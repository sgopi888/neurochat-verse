
import { useBackgroundMusic } from './useBackgroundMusic';
import { useTTSAudio } from './useTTSAudio';

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
    stopBackgroundMusic
  } = useBackgroundMusic();

  // TTS audio functionality
  const {
    isPlaying,
    selectedVoice,
    currentAudio,
    isAudioProcessing,
    lastGeneratedAudioBlob,
    lastGeneratedText,
    setSelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio
  } = useTTSAudio(messages, playBackgroundMusic, pauseBackgroundMusic, stopBackgroundMusic);

  // Enhanced music upload handler that syncs with TTS state
  const handleMusicUploadWithSync = (file: File) => {
    handleMusicUpload(file, isPlaying); // Pass current playing state
  };

  return {
    // TTS audio exports
    isPlaying,
    selectedVoice,
    currentAudio,
    isAudioProcessing,
    lastGeneratedAudioBlob,
    lastGeneratedText,
    setSelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio,
    // Background music exports
    musicName,
    musicVolume,
    isDefaultMusic,
    handleMusicUpload: handleMusicUploadWithSync,
    handleRemoveMusic,
    handleVolumeChange
  };
};
