
import { useState, useRef } from 'react';
import { TavusVideoService } from '../services/tavusVideoService';
import { toast } from 'sonner';

interface TavusVideoState {
  isGenerating: boolean;
  videoUrl: string | null;
  videoId: string | null;
  error: string | null;
}

export const useTavusVideo = () => {
  const [state, setState] = useState<TavusVideoState>({
    isGenerating: false,
    videoUrl: null,
    videoId: null,
    error: null
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const generateVideoFromAudio = async (audioBlob: Blob, script: string) => {
    try {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));
      
      console.log('Starting Tavus video generation with existing audio');
      
      const response = await TavusVideoService.generateVideo({
        audioBlob,
        script
      });

      setState(prev => ({ 
        ...prev, 
        videoId: response.videoId,
        videoUrl: response.videoUrl || null
      }));

      // Start polling for completion if video is processing
      if (response.status === 'processing') {
        startPolling(response.videoId);
      } else if (response.status === 'completed' && response.videoUrl) {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          videoUrl: response.videoUrl || null
        }));
        toast.success('Avatar video is ready!');
      }

    } catch (error) {
      console.error('Error generating video:', error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: error.message 
      }));
      toast.error('Failed to generate avatar video');
    }
  };

  const startPolling = (videoId: string) => {
    const poll = async () => {
      try {
        const response = await TavusVideoService.pollVideoStatus(videoId);
        
        if (response.status === 'completed' && response.videoUrl) {
          setState(prev => ({ 
            ...prev, 
            isGenerating: false,
            videoUrl: response.videoUrl || null
          }));
          toast.success('Avatar video is ready!');
          stopPolling();
        } else if (response.status === 'failed') {
          setState(prev => ({ 
            ...prev, 
            isGenerating: false,
            error: 'Video generation failed'
          }));
          toast.error('Avatar video generation failed');
          stopPolling();
        }
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    };

    pollingRef.current = setInterval(poll, 5000);
    
    setTimeout(() => {
      if (pollingRef.current) {
        stopPolling();
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          error: 'Video generation timeout'
        }));
        toast.error('Video generation took too long');
      }
    }, 300000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const clearVideo = () => {
    setState({
      isGenerating: false,
      videoUrl: null,
      videoId: null,
      error: null
    });
    stopPolling();
  };

  return {
    ...state,
    generateVideoFromAudio,
    clearVideo
  };
};
