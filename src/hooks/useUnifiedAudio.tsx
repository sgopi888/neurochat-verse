import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  audio: HTMLAudioElement | null;
}

export const useUnifiedAudio = (
  messages: Message[],
  playBackgroundMusic: () => Promise<void>,
  pauseBackgroundMusic: () => void,
  stopBackgroundMusic: () => void,
  backgroundMusicRef: React.RefObject<HTMLAudioElement>,
  musicVolume: number
) => {
  const { user } = useAuth();
  
  // Unified state for all audio
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const [globalAudioState, setGlobalAudioState] = useState({
    isPlaying: false,
    isProcessing: false,
    currentMessageId: null as string | null,
    currentAudio: null as HTMLAudioElement | null
  });

  // Per-message audio states
  const [messageAudioStates, setMessageAudioStates] = useState<Record<string, AudioState>>({});

  // Audio management refs
  const audioLock = useRef(false);
  const audioAbort = useRef<AbortController | null>(null);
  const currentPlayListener = useRef<(e: Event) => void>();
  const currentEndListener = useRef<(e: Event) => void>();
  const currentErrorListener = useRef<(e: Event) => void>();

  // 🎵 UNIFIED AUDIO CONTROLLER - All audio goes through this
  const playAudioWithBGM = async (text: string, messageId?: string) => {
    // Stop any currently playing audio
    stopCurrentAudio();
    
    audioLock.current = true;
    setGlobalAudioState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      currentMessageId: messageId || null 
    }));

    // Update message-specific loading state if applicable
    if (messageId) {
      setMessageAudioStates(prev => ({
        ...prev,
        [messageId]: { isPlaying: false, isLoading: true, audio: null }
      }));
    }

    try {
      // 🎵 Always start background music first
      await playBackgroundMusic();
      console.log('🎵 BGM started for', messageId ? `message ${messageId}` : 'play script');

      // Generate TTS audio
      audioAbort.current = new AbortController();
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice: selectedVoice,
          userId: user?.id
        }
      });

      if (audioAbort.current?.signal.aborted) return;

      if (error || !data?.audio) {
        throw new Error(error?.message ?? 'TTS failed');
      }

      // Create audio element
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // 🎵 Set up unified event listeners
      currentPlayListener.current = () => {
        console.log('🎵 TTS started playing for', messageId ? `message ${messageId}` : 'play script');
        
        // Duck background music volume during TTS
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = 0.1;
          console.log('🔇 Ducked BGM volume to 0.1');
        }

        // Update global and message-specific states
        setGlobalAudioState(prev => ({ 
          ...prev, 
          isPlaying: true, 
          isProcessing: false,
          currentAudio: audio
        }));

        if (messageId) {
          setMessageAudioStates(prev => ({
            ...prev,
            [messageId]: { isPlaying: true, isLoading: false, audio }
          }));
        }
      };

      currentEndListener.current = () => {
        console.log('🎵 TTS ended for', messageId ? `message ${messageId}` : 'play script');
        
        // Restore background music volume
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = musicVolume;
          console.log('🔊 Restored BGM volume to', musicVolume);
        }

        // Clean up and stop BGM (synchronized ending)
        cleanupCurrentAudio();
        stopBackgroundMusic();
      };

      currentErrorListener.current = () => {
        console.error('🎵 TTS error for', messageId ? `message ${messageId}` : 'play script');
        toast.error('Audio playback error');
        cleanupCurrentAudio();
        stopBackgroundMusic();
      };

      audio.addEventListener('play', currentPlayListener.current);
      audio.addEventListener('ended', currentEndListener.current);
      audio.addEventListener('error', currentErrorListener.current);

      // Start playback
      await audio.play();
      console.log('✅ TTS + BGM synchronized playback started');

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Unified audio error:', error);
        toast.error('Failed to play audio');
        cleanupCurrentAudio();
        stopBackgroundMusic();
      }
    }
  };

  // 🧹 Clean up current audio
  const cleanupCurrentAudio = () => {
    const { currentAudio } = globalAudioState;
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      
      // Remove event listeners
      if (currentPlayListener.current) currentAudio.removeEventListener('play', currentPlayListener.current);
      if (currentEndListener.current) currentAudio.removeEventListener('ended', currentEndListener.current);
      if (currentErrorListener.current) currentAudio.removeEventListener('error', currentErrorListener.current);
      
      // Revoke blob URL
      if (currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudio.src);
      }
    }

    // Reset all states
    setGlobalAudioState({
      isPlaying: false,
      isProcessing: false,
      currentMessageId: null,
      currentAudio: null
    });

    // Reset all message states
    setMessageAudioStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(id => {
        newStates[id] = { isPlaying: false, isLoading: false, audio: null };
      });
      return newStates;
    });

    audioLock.current = false;
  };

  // 🛑 Stop current audio (for stop button)
  const stopCurrentAudio = () => {
    if (audioAbort.current) {
      audioAbort.current.abort();
      audioAbort.current = null;
    }
    
    cleanupCurrentAudio();
    stopBackgroundMusic();
  };

  // ⏸️ Pause current audio
  const pauseCurrentAudio = () => {
    if (globalAudioState.currentAudio) {
      globalAudioState.currentAudio.pause();
    }
    pauseBackgroundMusic(); // Pause BGM too
    
    setGlobalAudioState(prev => ({ ...prev, isPlaying: false }));
    
    // Update message state if applicable
    if (globalAudioState.currentMessageId) {
      setMessageAudioStates(prev => ({
        ...prev,
        [globalAudioState.currentMessageId!]: { 
          ...prev[globalAudioState.currentMessageId!], 
          isPlaying: false 
        }
      }));
    }
  };

  // ▶️ Resume current audio
  const resumeCurrentAudio = async () => {
    if (globalAudioState.currentAudio) {
      await playBackgroundMusic(); // Resume BGM first
      await globalAudioState.currentAudio.play();
    }
  };

  // 🎵 Play latest AI response (play script button)
  const debouncedPlayLatestResponse = debounce(async () => {
    const lastAiMessage = messages.filter(m => !m.isUser).pop();
    if (!lastAiMessage) {
      toast.error('No AI response to play');
      return;
    }
    
    await playAudioWithBGM(lastAiMessage.text, 'latest');
  }, 300);

  const handlePlayLatestResponse = () => {
    console.log('▶️ Play Script button clicked');
    debouncedPlayLatestResponse();
  };

  // 🎵 Play specific message (bubble button)
  const playMessageAudio = async (message: Message) => {
    console.log('▶️ Play bubble button clicked for message:', message.id);
    await playAudioWithBGM(message.text, message.id);
  };

  // 🎵 Pause specific message (bubble button)
  const pauseMessageAudio = (messageId: string) => {
    console.log('⏸️ Pause bubble button clicked for message:', messageId);
    if (globalAudioState.currentMessageId === messageId) {
      pauseCurrentAudio();
    }
  };

  // 🎵 Query functions for UI
  const isMessagePlaying = (messageId: string): boolean => {
    return globalAudioState.currentMessageId === messageId && globalAudioState.isPlaying;
  };

  const isMessageLoading = (messageId: string): boolean => {
    return messageAudioStates[messageId]?.isLoading || 
           (globalAudioState.currentMessageId === messageId && globalAudioState.isProcessing);
  };

  const isGlobalPlaying = (): boolean => {
    return globalAudioState.isPlaying;
  };

  const isGlobalProcessing = (): boolean => {
    return globalAudioState.isProcessing;
  };

  return {
    // Voice selection
    selectedVoice,
    setSelectedVoice,
    
    // Unified audio controls
    handlePlayLatestResponse,
    playMessageAudio,
    pauseMessageAudio,
    pauseCurrentAudio,
    resumeCurrentAudio,
    stopCurrentAudio,
    
    // State queries
    isMessagePlaying,
    isMessageLoading,
    isGlobalPlaying,
    isGlobalProcessing,
    currentPlayingMessageId: globalAudioState.currentMessageId,
    
    // Legacy compatibility
    isPlaying: globalAudioState.isPlaying,
    isAudioProcessing: globalAudioState.isProcessing,
    currentAudio: globalAudioState.currentAudio,
    handlePauseAudio: pauseCurrentAudio
  };
};