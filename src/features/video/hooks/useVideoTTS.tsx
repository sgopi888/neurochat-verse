
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoTTSState {
  isGenerating: boolean;
  audioBlob: Blob | null;
  audioText: string | null;
  error: string | null;
}

export const useVideoTTS = () => {
  const [state, setState] = useState<VideoTTSState>({
    isGenerating: false,
    audioBlob: null,
    audioText: null,
    error: null
  });

  const generateAudioForVideo = async (text: string, voice: string = 'Drew') => {
    try {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));
      
      console.log('Generating audio for video with ElevenLabs');
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate audio');
      }

      // Convert base64 to blob
      const audioBase64 = data.audio;
      const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

      setState(prev => ({
        ...prev,
        isGenerating: false,
        audioBlob,
        audioText: text
      }));

      return audioBlob;
    } catch (error) {
      console.error('Error generating video audio:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message
      }));
      toast.error('Failed to generate audio for video');
      throw error;
    }
  };

  const clearAudio = () => {
    setState({
      isGenerating: false,
      audioBlob: null,
      audioText: null,
      error: null
    });
  };

  return {
    ...state,
    generateAudioForVideo,
    clearAudio
  };
};
