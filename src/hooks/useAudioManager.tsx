import React, { useState, useRef, useEffect } from 'react';
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

export const useAudioManager = (messages: Message[]) => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);

  // Background music state
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null);
  const [musicName, setMusicName] = useState<string>('');
  const [musicVolume, setMusicVolume] = useState<number>(0.7); // Default 70% volume
  const musicUrlRef = useRef<string | null>(null);

  // Enhanced audio management refs
  const audioLock = useRef(false);
  const audioAbort = useRef<AbortController | null>(null);
  const audioQueue = useRef<Promise<void>>(Promise.resolve());
  const playListener = useRef<(e: Event) => void>();
  const endListener = useRef<(e: Event) => void>();
  const errListener = useRef<(e: Event) => void>();

  // Background music functions
  const handleMusicUpload = (file: File) => {
    // Clean up previous audio
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.src = '';
    }
    if (musicUrlRef.current) {
      URL.revokeObjectURL(musicUrlRef.current);
    }

    // Create new audio from file
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = musicVolume; // Use current volume setting
    
    // Store references
    musicUrlRef.current = url;
    setBackgroundMusic(audio);
    setMusicName(file.name);
  };

  const handleRemoveMusic = () => {
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.src = '';
      setBackgroundMusic(null);
    }
    if (musicUrlRef.current) {
      URL.revokeObjectURL(musicUrlRef.current);
      musicUrlRef.current = null;
    }
    setMusicName('');
  };

  const handleVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume);
    if (backgroundMusic) {
      backgroundMusic.volume = newVolume;
    }
    // Persist volume to localStorage
    localStorage.setItem('musicVolume', newVolume.toString());
  };

  // Initialize volume from localStorage on component mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      setMusicVolume(volume);
      if (backgroundMusic) {
        backgroundMusic.volume = volume;
      }
    }
  }, [backgroundMusic]);

  const playBackgroundMusic = async () => {
    if (backgroundMusic && musicVolume > 0) {
      try {
        backgroundMusic.currentTime = 0; // Start from beginning
        backgroundMusic.volume = musicVolume; // Ensure correct volume
        await backgroundMusic.play();
      } catch (error) {
        console.error('Error playing background music:', error);
      }
    }
  };

  const stopBackgroundMusic = () => {
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  };

  // Enhanced audio cleanup function
  const stopCurrentAudio = async () => {
    // Stop background music when stopping TTS
    stopBackgroundMusic();
    
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
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set up event listeners with refs for proper cleanup
        playListener.current = async () => {
          setIsPlaying(true);
          // Start background music when TTS starts playing
          await playBackgroundMusic();
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
        }
      } finally {
        if (!audioAbort.current?.signal.aborted) {
          audioLock.current = false;
          setIsAudioProcessing(false);
        }
      }
    });
  }, 300);

  // Update handler call
  const handlePlayLatestResponse = () => {
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
    setSelectedVoice,
    handlePlayLatestResponse,
    handlePauseAudio,
    stopCurrentAudio,
    // Background music functions
    musicName,
    musicVolume,
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange
  };
};
