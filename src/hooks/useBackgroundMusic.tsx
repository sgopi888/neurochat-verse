
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
    const savedVolume = localStorage.getItem('backgroundMusicVolume');
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      setMusicVolume(volume);
    }
    
    // Load default piano music from Supabase storage
    loadDefaultMusic();
  }, []);

  const loadDefaultMusic = async () => {
    try {
      const audio = new Audio(DEFAULT_MUSIC_URL);
      audio.loop = true;
      audio.volume = musicVolume;
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
      });
      
      backgroundMusicRef.current = audio;
      setMusicName(DEFAULT_MUSIC_NAME);
      setIsDefaultMusic(true);
      
      console.log('Default piano music loaded from Supabase storage');
    } catch (error) {
      console.error('Error loading default music:', error);
      toast.error('Failed to load default background music');
    }
  };

  const handleMusicUpload = (file: File) => {
    try {
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
      audio.volume = musicVolume;
      
      backgroundMusicRef.current = audio;
      setMusicName(file.name);
      setIsDefaultMusic(false);
      
      console.log('Background music uploaded:', file.name);
      toast.success('Background music uploaded successfully');
    } catch (error) {
      console.error('Error uploading background music:', error);
      toast.error('Failed to upload background music');
    }
  };

  const handleRemoveMusic = () => {
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
    loadDefaultMusic();
    
    console.log('Background music removed, reverting to default');
    toast.success('Reverted to default background music');
  };

  const handleVolumeChange = (volume: number) => {
    setMusicVolume(volume);
    localStorage.setItem('backgroundMusicVolume', volume.toString());
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = volume;
    }
    console.log('Background music volume changed to:', volume);
  };

  const playBackgroundMusic = async () => {
    if (backgroundMusicRef.current) {
      try {
        await backgroundMusicRef.current.play();
        console.log('Background music started playing:', isDefaultMusic ? 'Default Piano' : musicName);
      } catch (error) {
        console.error('Error playing background music:', error);
      }
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
