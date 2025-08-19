
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

export const useTTSAudio = (
  messages: Message[],
  playBackgroundMusic: () => Promise<void>,
  stopBackgroundMusic: () => void
) => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const [lastGeneratedAudioBlob, setLastGeneratedAudioBlob] = useState<Blob | null>(null);
  const [lastGeneratedText, setLastGeneratedText] = useState<string>('');

  // Enhanced audio management refs
  const audioLock = useRef(false);
  const audioAbort = useRef<AbortController | null>(null);
  const audioQueue = useRef<Promise<void>>(Promise.resolve());
  const playListener = useRef<(e: Event) => void>();
  const endListener = useRef<(e: Event) => void>();
  const errListener = useRef<(e: Event) => void>();
  const backgroundMusicStarted = useRef(false);

  // Enhanced audio cleanup function
  const stopCurrentAudio = async () => {
    // Stop background music when stopping TTS
    stopBackgroundMusic();
    backgroundMusicStarted.current = false;
    
    if (audioAbort.current) {
      audioAbort.current.abort();
      audioAbort.current = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (playListener.current) currentAudio.removeEventListener('play', playListener.current);
      if (endListener.current) currentAudio.removeEventListener('ended', endListener.current);
      if (errListener.current) currentAudio.removeEventListener('error', errListener.current);
      if (currentAudio.src.startsWith('blob:')) URL.revokeObjectURL(currentAudio.src);
    }
    setCurrentAudio(null);
    setIsPlaying(false);
    audioLock.current = false;
    setIsAudioProcessing(false);
  };

  // Debounced play function with enhanced synchronization
  const debouncedPlayLatestResponse = debounce(async () => {
    if (audioLock.current) return;
    audioLock.current = true;
    setIsAudioProcessing(true);

    // Start background music immediately when user clicks play
    if (!backgroundMusicStarted.current) {
      console.log('Starting background music immediately on play button click');
      await playBackgroundMusic();
      backgroundMusicStarted.current = true;
    }

    // Queue audio processing to ensure sequential execution
    await audioQueue.current;
    audioQueue.current = audioQueue.current.then(async () => {
      await stopCurrentAudio(); // Ensure cleanup

      const last = messages.filter(m => !m.isUser).pop();
      if (!last) {
        toast.error('No AI response to play');
        audioLock.current = false;
        setIsAudioProcessing(false);
        return;
      }

      try {
        audioAbort.current = new AbortController();
        console.log('Calling TTS with voice:', selectedVoice, 'and text length:', last.text.length);
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: {
            text: last.text,
            voice: selectedVoice,
            userId: user?.id
          }
        });

        // Check if request was aborted
        if (audioAbort.current?.signal.aborted) {
          return;
        }

        if (error || !data?.audio) {
          throw new Error(error?.message ?? 'TTS failed');
        }

        // Convert base64 to audio blob
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' });
        
        // Store the audio blob and text for video generation
        setLastGeneratedAudioBlob(audioBlob);
        setLastGeneratedText(last.text);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set up event listeners with refs for proper cleanup
        playListener.current = async () => {
          setIsPlaying(true);
          console.log('TTS audio started playing, background music already running');
        };
        
        endListener.current = () => stopCurrentAudio();
        
        errListener.current = () => {
          console.error('Audio playback error');
          toast.error('Playback error');
          stopCurrentAudio();
        };

        audio.addEventListener('play', playListener.current);
        audio.addEventListener('ended', endListener.current);
        audio.addEventListener('error', errListener.current);

        setCurrentAudio(audio);
        await audio.play();
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error playing audio:', error);
          toast.error('Failed to play audio');
          // Make sure to stop background music on error
          stopCurrentAudio();
        }
      } finally {
        if (!audioAbort.current?.signal.aborted) {
          audioLock.current = false;
          setIsAudioProcessing(false);
        }
      }
    });
  }, 300);

  const handlePlayLatestResponse = () => {
    console.log('Play button clicked - starting background music immediately');
    setIsPlaying(true); // Immediately update UI state
    debouncedPlayLatestResponse();
  };

  const handlePauseAudio = () => {
    console.log('Pause button pressed');
    stopCurrentAudio();
  };

  return {
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
  };
};
