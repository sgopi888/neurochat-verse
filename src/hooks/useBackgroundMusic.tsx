
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useBackgroundMusic = () => {
  const [musicName, setMusicName] = useState<string | undefined>(undefined);
  const [musicVolume, setMusicVolume] = useState<number>(0.3);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  // Load saved volume from localStorage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('backgroundMusicVolume');
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      setMusicVolume(volume);
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.volume = volume;
      }
    }
  }, []);

  const handleMusicUpload = (file: File) => {
    try {
      // Clean up previous audio
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        if (backgroundMusicRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(backgroundMusicRef.current.src);
        }
      }

      // Create new audio element
      const audioBlob = new Blob([file], { type: file.type });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.loop = true;
      audio.volume = musicVolume;
      
      backgroundMusicRef.current = audio;
      setMusicName(file.name);
      
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
    setMusicName(undefined);
    console.log('Background music removed');
    toast.success('Background music removed');
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
    if (backgroundMusicRef.current && musicName) {
      try {
        await backgroundMusicRef.current.play();
        console.log('Background music started playing');
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
    handleMusicUpload,
    handleRemoveMusic,
    handleVolumeChange,
    playBackgroundMusic,
    stopBackgroundMusic
  };
};
