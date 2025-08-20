import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AudioState {
  [messageId: string]: {
    isPlaying: boolean;
    isLoading: boolean;
    audio: HTMLAudioElement | null;
  };
}

export const useMessageAudio = (
  pauseBackgroundMusic: () => void,
  stopBackgroundMusic: () => void,
  backgroundMusicRef: React.RefObject<HTMLAudioElement>,
  musicVolume: number
) => {
  const { user } = useAuth();
  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const currentPlayingRef = useRef<string | null>(null);

  const stopCurrentAudio = useCallback(() => {
    if (currentPlayingRef.current) {
      const currentMessageId = currentPlayingRef.current;
      const audioState = audioStates[currentMessageId];
      
      if (audioState?.audio) {
        audioState.audio.pause();
        audioState.audio.currentTime = 0;
        if (audioState.audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioState.audio.src);
        }
      }
      
      setAudioStates(prev => ({
        ...prev,
        [currentMessageId]: {
          ...prev[currentMessageId],
          isPlaying: false,
          audio: null
        }
      }));
      
      currentPlayingRef.current = null;
      
      // Restore background music volume
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.volume = musicVolume;
      }
    }
  }, [audioStates, backgroundMusicRef, musicVolume]);

  const playMessageAudio = useCallback(async (message: Message) => {
    if (!user) return;

    // Stop any currently playing audio
    if (currentPlayingRef.current) {
      stopCurrentAudio();
    }

    // Set loading state
    setAudioStates(prev => ({
      ...prev,
      [message.id]: {
        ...prev[message.id],
        isLoading: true,
        isPlaying: false
      }
    }));

    try {
      console.log('Generating TTS for message:', message.id, 'Voice:', selectedVoice);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: message.text,
          voice: selectedVoice,
          userId: user.id
        }
      });

      if (error || !data?.audio) {
        throw new Error(error?.message ?? 'TTS failed');
      }

      // Convert base64 to audio blob
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up event listeners
      audio.addEventListener('play', () => {
        console.log('Message audio started playing:', message.id);
        currentPlayingRef.current = message.id;
        
        // Duck background music volume during TTS
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = 0.1;
        }
        
        setAudioStates(prev => ({
          ...prev,
          [message.id]: {
            ...prev[message.id],
            isPlaying: true,
            isLoading: false
          }
        }));
      });
      
      audio.addEventListener('ended', () => {
        console.log('Message audio ended:', message.id);
        
        // Restore background music volume
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = musicVolume;
        }
        
        // Clean up
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        
        setAudioStates(prev => ({
          ...prev,
          [message.id]: {
            ...prev[message.id],
            isPlaying: false,
            audio: null
          }
        }));
        
        currentPlayingRef.current = null;
      });
      
      audio.addEventListener('error', () => {
        console.error('Audio playback error for message:', message.id);
        toast.error('Audio playback failed');
        
        setAudioStates(prev => ({
          ...prev,
          [message.id]: {
            ...prev[message.id],
            isPlaying: false,
            isLoading: false,
            audio: null
          }
        }));
        
        currentPlayingRef.current = null;
      });

      // Store audio reference and play
      setAudioStates(prev => ({
        ...prev,
        [message.id]: {
          ...prev[message.id],
          audio: audio
        }
      }));

      await audio.play();
      
    } catch (error) {
      console.error('Error playing message audio:', error);
      toast.error('Failed to play audio');
      
      setAudioStates(prev => ({
        ...prev,
        [message.id]: {
          ...prev[message.id],
          isPlaying: false,
          isLoading: false,
          audio: null
        }
      }));
    }
  }, [user, selectedVoice, backgroundMusicRef, musicVolume, stopCurrentAudio]);

  const pauseMessageAudio = useCallback((messageId: string) => {
    const audioState = audioStates[messageId];
    if (audioState?.audio && audioState.isPlaying) {
      audioState.audio.pause();
      
      setAudioStates(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          isPlaying: false
        }
      }));
      
      // Restore background music volume when paused
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.volume = musicVolume;
      }
      
      currentPlayingRef.current = null;
    }
  }, [audioStates, backgroundMusicRef, musicVolume]);

  const isMessagePlaying = useCallback((messageId: string) => {
    return audioStates[messageId]?.isPlaying || false;
  }, [audioStates]);

  const isMessageLoading = useCallback((messageId: string) => {
    return audioStates[messageId]?.isLoading || false;
  }, [audioStates]);

  return {
    selectedVoice,
    setSelectedVoice,
    playMessageAudio,
    pauseMessageAudio,
    stopCurrentAudio,
    isMessagePlaying,
    isMessageLoading,
    currentPlayingMessageId: currentPlayingRef.current
  };
};