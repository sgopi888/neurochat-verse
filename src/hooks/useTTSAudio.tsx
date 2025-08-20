
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
  pauseBackgroundMusic: () => void,
  stopBackgroundMusic: () => void,
  backgroundMusicRef: React.RefObject<HTMLAudioElement>,
  musicVolume: number
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

  // Stop both TTS and BGM together (synchronized)
  const stopCurrentAudio = async () => {
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
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    audioLock.current = false;
    setIsAudioProcessing(false);
    
    // Always stop BGM when TTS stops (synchronized behavior)
    stopBackgroundMusic();
  };

  // Debounced play function with enhanced synchronization
  const debouncedPlayLatestResponse = debounce(async () => {
    if (audioLock.current) return;
    audioLock.current = true;
    setIsAudioProcessing(true);

    // BGM is already started by handlePlayLatestResponse, just continue with TTS

    // Queue audio processing to ensure sequential execution
    await audioQueue.current;
    audioQueue.current = audioQueue.current.then(async () => {
      // Only stop the last TTS audio, not background music
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (playListener.current) currentAudio.removeEventListener('play', playListener.current);
        if (endListener.current) currentAudio.removeEventListener('ended', endListener.current);
        if (errListener.current) currentAudio.removeEventListener('error', errListener.current);
        if (currentAudio.src.startsWith('blob:')) {
          URL.revokeObjectURL(currentAudio.src);
        }
        setCurrentAudio(null);
      }

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
          console.log('TTS audio started playing');
          
          // 🔑 Duck background music volume during TTS for better audio separation
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.volume = 0.1; // Lower BGM volume during TTS
            console.log('🔇 Lowered BGM volume to 0.1 during TTS');
          }
        };
        
        endListener.current = () => {
          console.log('⏹️ TTS ended - stopping both TTS and BGM together');
          
          // 🔑 Restore background music volume after TTS ends
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.volume = musicVolume; // Restore original volume
            console.log('🔊 Restored BGM volume to', musicVolume);
          }
          
          // Clean up TTS audio and stop BGM (synchronized)
          if (currentAudio) {
            if (currentAudio.src.startsWith('blob:')) {
              URL.revokeObjectURL(currentAudio.src);
            }
            setCurrentAudio(null);
          }
          setIsPlaying(false);
          audioLock.current = false;
          stopBackgroundMusic(); // Stop BGM when TTS ends
        };
        
        errListener.current = () => {
          console.error('Audio playback error');
          toast.error('Playback error');
          stopCurrentAudio();
        };

        audio.addEventListener('play', playListener.current);
        audio.addEventListener('ended', endListener.current);
        audio.addEventListener('error', errListener.current);

        setCurrentAudio(audio);
        
        // 🔑 Force TTS to play with better error handling
        try {
          await audio.play();
          console.log('✅ TTS audio started successfully');
        } catch (playError) {
          console.error('❌ TTS playback failed:', playError);
          toast.error('Failed to play narration');
          throw playError;
        }
        
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error playing audio:', error);
            toast.error('Failed to play audio');
            // Only clean up TTS on error, leave background music alone
            if (currentAudio) {
              if (currentAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(currentAudio.src);
              }
              setCurrentAudio(null);
            }
            setIsPlaying(false);
            audioLock.current = false;
          }
        } finally {
          if (!audioAbort.current?.signal.aborted) {
            setIsAudioProcessing(false);
          }
        }
    });
  }, 300);

  const handlePlayLatestResponse = async () => {
    console.log('▶️ Play button clicked - starting/resuming both TTS and BGM');
    setIsPlaying(true); // Immediately update UI state
    
    // Always ensure BGM plays when clicking play (resume or restart)
    await playBackgroundMusic();
    
    debouncedPlayLatestResponse();
  };

  const handlePauseAudio = () => {
    console.log('⏸️ Pause button pressed - pausing both TTS and BGM');
    if (currentAudio) {
      currentAudio.pause();
    }
    pauseBackgroundMusic(); // Pause (don't stop) BGM so it can resume
    setIsPlaying(false);
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
