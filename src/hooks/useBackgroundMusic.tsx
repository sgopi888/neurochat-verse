
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

const DEFAULT_MUSIC_URL = 'https://obgbnrasiyozdnmoixxx.supabase.co/storage/v1/object/public/music/piano.mp3';
const DEFAULT_MUSIC_NAME = 'Piano (Default)';

export const useBackgroundMusic = () => {
  const [musicName, setMusicName] = useState<string | undefined>(undefined);
  const [musicVolume, setMusicVolume] = useState<number>(0.3);
  const [isDefaultMusic, setIsDefaultMusic] = useState<boolean>(true);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  // Load saved volume from localStorage on mount and initialize default music
  useEffect(() => {
    // Load volume synchronously FIRST
    const savedVolume = localStorage.getItem('backgroundMusicVolume');
    let volumeToUse = 0.3; // default
    
    if (savedVolume) {
      volumeToUse = parseFloat(savedVolume);
      setMusicVolume(volumeToUse);
      console.log('Loaded volume from localStorage:', volumeToUse);
    }
    
    // Now load default music with the correct volume
    loadDefaultMusic(volumeToUse);
  }, []);

  // Separate effect to sync volume changes to existing audio
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = musicVolume;
      console.log('Updated existing audio volume to:', musicVolume);
    }
  }, [musicVolume]);

  const loadDefaultMusic = async (initialVolume: number = musicVolume) => {
    try {
      console.log('🎵 Loading default music with volume:', initialVolume);
      
      const audio = new Audio(DEFAULT_MUSIC_URL);
      audio.loop = true;
      audio.volume = initialVolume;
      audio.preload = 'auto';
      
      // Add more detailed logging
      audio.addEventListener('loadstart', () => {
        console.log('🎵 Audio loading started...');
      });
      
      audio.addEventListener('canplay', () => {
        console.log('🎵 Audio can start playing');
      });
      
      audio.addEventListener('error', (e) => {
        console.error('🎵 Audio loading error:', e);
        console.error('🎵 Audio error details:', audio.error);
      });
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 10000); // 10 second timeout
        
        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve(void 0);
        }, { once: true });
        
        audio.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(audio.error || new Error('Audio loading failed'));
        }, { once: true });
      });
      
      backgroundMusicRef.current = audio;
      setMusicName(DEFAULT_MUSIC_NAME);
      setIsDefaultMusic(true);
      
      console.log('🎵 Default piano music loaded successfully with volume:', audio.volume);
      console.log('🎵 Audio ready state:', audio.readyState);
      console.log('🎵 Audio duration:', audio.duration);
    } catch (error) {
      console.error('🎵 Error loading default music:', error);
      toast.error('Failed to load default background music: ' + error.message);
    }
  };

  const handleMusicUpload = (file: File, isCurrentlyPlaying?: boolean) => {
    try {
      console.log('Uploading new music file:', file.name);
      
      // Clean up previous audio
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        if (backgroundMusicRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(backgroundMusicRef.current.src);
        }
      }

      // Create new audio element from uploaded file
      const audioBlob = new Blob([file], { type: file.type });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.loop = true;
      audio.volume = musicVolume; // Use current volume state
      
      backgroundMusicRef.current = audio;
      setMusicName(file.name);
      setIsDefaultMusic(false);
      
      console.log('Background music uploaded:', file.name, 'with volume:', audio.volume);
      toast.success('Background music uploaded successfully');
      
      // 🔑 If currently playing, resume immediately with the new file
      if (isCurrentlyPlaying) {
        console.log('🎵 Resuming BGM with new track since TTS is currently playing');
        setTimeout(() => playBackgroundMusic(), 100); // Small delay for audio element to be ready
      }
    } catch (error) {
      console.error('Error uploading background music:', error);
      toast.error('Failed to upload background music');
    }
  };

  const handleRemoveMusic = () => {
    console.log('Removing custom music, reverting to default');
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      if (backgroundMusicRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundMusicRef.current.src);
      }
      backgroundMusicRef.current = null;
    }
    
    // Reset to default music
    setMusicName(undefined);
    setIsDefaultMusic(true);
    loadDefaultMusic(musicVolume); // Use current volume
    
    console.log('Background music removed, reverting to default');
    toast.success('Reverted to default background music');
  };

  const handleVolumeChange = (volume: number) => {
    console.log('Volume changing from', musicVolume, 'to', volume);
    setMusicVolume(volume);
    localStorage.setItem('backgroundMusicVolume', volume.toString());
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = volume;
      console.log('Updated audio element volume to:', volume);
    }
  };

  const playBackgroundMusic = async () => {
    if (backgroundMusicRef.current) {
      try {
        console.log('Attempting to play background music. Current volume:', backgroundMusicRef.current.volume);
        console.log('Audio element ready state:', backgroundMusicRef.current.readyState);
        console.log('Audio element source:', backgroundMusicRef.current.src);
        
        await backgroundMusicRef.current.play();
        console.log('Background music started playing successfully:', isDefaultMusic ? 'Default Piano' : musicName);
      } catch (error) {
        console.error('Error playing background music:', error);
        
        if (error.name === 'NotAllowedError') {
          console.log('Autoplay blocked by browser - this is normal until user interaction');
        } else {
          toast.error('Failed to play background music: ' + error.message);
        }
      }
    } else {
      console.error('No background music audio element available');
    }
  };

  const stopBackgroundMusic = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      console.log('Background music stopped');
    }
  };

  return {
    musicName,
    musicVolume,
    isDefaultMusic,
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange,
    playBackgroundMusic,
    stopBackgroundMusic
  };
};
