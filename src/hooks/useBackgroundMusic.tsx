
import { useState, useRef, useCallback } from 'react';

export const useBackgroundMusic = () => {
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState<string>('');
  const musicUrlRef = useRef<string | null>(null);

  const handleMusicUpload = useCallback((file: File) => {
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
    audio.volume = 0.7; // 70% volume as requested
    
    // Store references
    musicUrlRef.current = url;
    setBackgroundMusic(audio);
    setMusicFile(file);
    setMusicName(file.name);
  }, [backgroundMusic]);

  const handleRemoveMusic = useCallback(() => {
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.src = '';
      setBackgroundMusic(null);
    }
    if (musicUrlRef.current) {
      URL.revokeObjectURL(musicUrlRef.current);
      musicUrlRef.current = null;
    }
    setMusicFile(null);
    setMusicName('');
  }, [backgroundMusic]);

  const playBackgroundMusic = useCallback(async () => {
    if (backgroundMusic) {
      try {
        backgroundMusic.currentTime = 0; // Start from beginning
        await backgroundMusic.play();
      } catch (error) {
        console.error('Error playing background music:', error);
      }
    }
  }, [backgroundMusic]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }, [backgroundMusic]);

  return {
    backgroundMusic,
    musicName,
    handleMusicUpload,
    handleRemoveMusic,
    playBackgroundMusic,
    stopBackgroundMusic
  };
};
