
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
      hostedUrl: null,
      videoError: null,
      currentStep: '',
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
    hostedUrl,
    error: videoError,
    currentStep,
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
      console.log('Starting video generation process - matching test code approach');
      
      // Step 1: Generate audio using ElevenLabs
      const audioBlob = await generateAudioForVideo(latestAiMessage.text);
      
      // Step 2: Generate video using the generated audio (matching your test code)
      await generateVideoFromAudio(audioBlob, latestAiMessage.text);
      
      // Step 3: Show video popup when ready
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
    hostedUrl,
    videoError,
    currentStep: isAudioGenerating ? 'Generating Audio...' : currentStep,
    popupState,
    canGenerateVideo,
    handleGenerateVideo,
    clearVideo,
    setPopupState
  };
};
