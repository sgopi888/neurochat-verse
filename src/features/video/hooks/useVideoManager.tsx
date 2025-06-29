
import { VIDEO_CONFIG } from '../config/videoConfig';
import { useTavusVideo } from './useTavusVideo';
import { useState } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const useVideoManager = (
  messages: Message[],
  lastGeneratedAudioBlob: Blob | null,
  lastGeneratedText: string
) => {
  const [popupState, setPopupState] = useState<'hidden' | 'playing' | 'minimized'>('hidden');
  
  // Return disabled state if video feature is turned off
  if (!VIDEO_CONFIG.enabled) {
    return {
      isVideoEnabled: false,
      isGenerating: false,
      videoUrl: null,
      videoError: null,
      popupState: 'hidden',
      canGenerateVideo: false,
      handleGenerateVideo: () => {},
      clearVideo: () => {},
      setPopupState: () => {}
    };
  }

  const {
    isGenerating,
    videoUrl,
    error: videoError,
    generateVideoFromAudio,
    clearVideo: clearTavusVideo
  } = useTavusVideo();

  // Show video button when there's a latest AI response (last non-user message)
  const latestAiMessage = messages.filter(m => !m.isUser).pop();
  const canGenerateVideo = Boolean(latestAiMessage);

  const handleGenerateVideo = async () => {
    if (!latestAiMessage) return;

    // If we have both audio and text, generate video directly
    if (lastGeneratedAudioBlob && lastGeneratedText) {
      generateVideoFromAudio(lastGeneratedAudioBlob, lastGeneratedText);
      setPopupState('playing');
      return;
    }

    // If we don't have audio, we need to generate it first
    // This should trigger the TTS generation first
    console.log('No audio available - need to generate audio first');
    // For now, we'll show an error message asking user to generate audio first
    // In a future enhancement, we could automatically trigger TTS generation
  };

  const clearVideo = () => {
    clearTavusVideo();
    setPopupState('hidden');
  };

  return {
    isVideoEnabled: true,
    isGenerating,
    videoUrl,
    videoError,
    popupState,
    canGenerateVideo,
    handleGenerateVideo,
    clearVideo,
    setPopupState
  };
};
