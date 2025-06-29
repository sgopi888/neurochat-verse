
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

  const canGenerateVideo = Boolean(lastGeneratedAudioBlob && lastGeneratedText);

  const handleGenerateVideo = () => {
    if (lastGeneratedAudioBlob && lastGeneratedText) {
      generateVideoFromAudio(lastGeneratedAudioBlob, lastGeneratedText);
      setPopupState('playing');
    }
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
