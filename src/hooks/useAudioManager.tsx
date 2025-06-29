
import { useBackgroundMusic } from './useBackgroundMusic';
import { useTTSAudio } from './useTTSAudio';
import { useTavusVideo } from './useTavusVideo';

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
  } = useTTSAudio(messages, playBackgroundMusic, stopBackgroundMusic);

  // Tavus video functionality
  const {
    isGenerating: isVideoGenerating,
    videoUrl,
    videoId,
    error: videoError,
    generateVideoFromAudio,
    clearVideo
  } = useTavusVideo();

  // Generate video using the existing audio
  const handleGenerateVideo = () => {
    if (lastGeneratedAudioBlob && lastGeneratedText) {
      generateVideoFromAudio(lastGeneratedAudioBlob, lastGeneratedText);
    } else {
      console.error('No audio available for video generation');
    }
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
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange,
    // Tavus video exports
    isVideoGenerating,
    videoUrl,
    videoId,
    videoError,
    handleGenerateVideo,
    clearVideo
  };
};
