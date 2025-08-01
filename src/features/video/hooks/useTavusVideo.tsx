
import { useState, useRef } from 'react';
import { TavusVideoService } from '../services/tavusVideoService';
import { toast } from 'sonner';

interface TavusVideoState {
  isGenerating: boolean;
  videoUrl: string | null;
  hostedUrl: string | null;
  videoId: string | null;
  error: string | null;
  currentStep: string;
}

export const useTavusVideo = () => {
  const [state, setState] = useState<TavusVideoState>({
    isGenerating: false,
    videoUrl: null,
    hostedUrl: null,
    videoId: null,
    error: null,
    currentStep: ''
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const generateVideoFromAudio = async (audioBlob: Blob, script: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isGenerating: true, 
        error: null,
        currentStep: 'Creating Video...'
      }));
      
      console.log('Starting Tavus video generation with existing audio');
      
      const response = await TavusVideoService.generateVideo({
        audioBlob,
        script
      });

      setState(prev => ({ 
        ...prev, 
        videoId: response.videoId,
        videoUrl: response.videoUrl || null,
        hostedUrl: response.hostedUrl || null,
        currentStep: 'Processing Video...'
      }));

      // Start polling for completion - check for both 'completed' and 'ready' like your test code
      if (response.status === 'processing') {
        startPolling(response.videoId);
      } else if (['completed', 'ready'].includes(response.status)) {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          videoUrl: response.videoUrl || null,
          hostedUrl: response.hostedUrl || null,
          currentStep: 'Video Ready!'
        }));
        toast.success('🎬 Avatar video is ready!');
      }

    } catch (error) {
      console.error('Error generating video:', error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: error.message,
        currentStep: 'Error occurred'
      }));
      toast.error('Failed to generate avatar video');
    }
  };

  const startPolling = (videoId: string) => {
    const startTime = Date.now();
    
    const poll = async () => {
      try {
        const response = await TavusVideoService.pollVideoStatus(videoId);
        console.log(`Status: ${response.status}`);
        
        // Check for completion states like your test code
        if (['completed', 'ready'].includes(response.status)) {
          const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
          setState(prev => ({ 
            ...prev, 
            isGenerating: false,
            videoUrl: response.videoUrl || null,
            hostedUrl: response.hostedUrl || null,
            currentStep: 'Video Ready!'
          }));
          toast.success(`🎬 Avatar video is ready! (${durationSec}s)`);
          stopPolling();
        } else if (response.status === 'failed') {
          setState(prev => ({ 
            ...prev, 
            isGenerating: false,
            error: 'Video generation failed',
            currentStep: 'Generation Failed'
          }));
          toast.error('❌ Avatar video generation failed');
          stopPolling();
        } else {
          // Update step for ongoing processing
          setState(prev => ({ 
            ...prev, 
            currentStep: `Processing Video... (${Math.floor((Date.now() - startTime) / 1000)}s)`
          }));
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        // Continue polling on error - might be temporary
      }
    };

    // Poll every 5 seconds like your test code
    pollingRef.current = setInterval(poll, 5000);
    
    // Extended timeout to 5 minutes to handle your 1-5 minute generation time
    setTimeout(() => {
      if (pollingRef.current) {
        stopPolling();
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          error: 'Video generation timeout (5 minutes)',
          currentStep: 'Generation Timeout'
        }));
        toast.error('Video generation took too long (5 minutes)');
      }
    }, 300000); // 5 minutes timeout
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
      hostedUrl: null,
      videoId: null,
      error: null,
      currentStep: ''
    });
    stopPolling();
  };

  return {
    ...state,
    generateVideoFromAudio,
    clearVideo
  };
};
