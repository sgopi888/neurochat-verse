
import { VIDEO_CONFIG } from '../config/videoConfig';
import { useTavusVideo } from './useTavusVideo';
import { useVideoTTS } from './useVideoTTS';
import { useState } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const useVideoManager = (messages: Message[]) => {
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
    isGenerating: isVideoGenerating,
    videoUrl,
    error: videoError,
    generateVideoFromAudio,
    clearVideo: clearTavusVideo
  } = useTavusVideo();

  const {
    isGenerating: isAudioGenerating,
    generateAudioForVideo,
    clearAudio
  } = useVideoTTS();

  // Show video button when there's a latest AI response (last non-user message)
  const latestAiMessage = messages.filter(m => !m.isUser).pop();
  const canGenerateVideo = Boolean(latestAiMessage);

  const handleGenerateVideo = async () => {
    if (!latestAiMessage) return;

    try {
      console.log('Starting independent video generation process');
      
      // Step 1: Generate audio using ElevenLabs (independent from Play Script)
      const audioBlob = await generateAudioForVideo(latestAiMessage.text);
      
      // Step 2: Generate video using the generated audio
      await generateVideoFromAudio(audioBlob, latestAiMessage.text);
      
      // Step 3: Show video popup
      setPopupState('playing');
      
    } catch (error) {
      console.error('Error in video generation process:', error);
    }
  };

  const clearVideo = () => {
    clearTavusVideo();
    clearAudio();
    setPopupState('hidden');
  };

  const isGenerating = isAudioGenerating || isVideoGenerating;

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
