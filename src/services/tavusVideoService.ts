
import { supabase } from '@/integrations/supabase/client';

interface TavusVideoRequest {
  audioBlob: Blob;
  script: string;
  replicaId?: string;
}

interface TavusVideoResponse {
  videoId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
}

export class TavusVideoService {
  private static readonly REPLICA_ID = 'r6ae5b6efc9d';

  static async generateVideo(request: TavusVideoRequest): Promise<TavusVideoResponse> {
    try {
      // Convert audio blob to base64
      const audioBase64 = await this.blobToBase64(request.audioBlob);
      
      console.log('Generating Tavus video with existing audio');
      
      const { data, error } = await supabase.functions.invoke('generate-tavus-video', {
        body: {
          audioBase64,
          script: request.script,
          replicaId: request.replicaId || this.REPLICA_ID
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate video');
      }

      return {
        videoId: data.videoId,
        status: data.status,
        videoUrl: data.videoUrl
      };
    } catch (error) {
      console.error('Error generating Tavus video:', error);
      throw error;
    }
  }

  static async pollVideoStatus(videoId: string): Promise<TavusVideoResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('poll-tavus-video', {
        body: { videoId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to check video status');
      }

      return {
        videoId,
        status: data.status,
        videoUrl: data.videoUrl
      };
    } catch (error) {
      console.error('Error polling video status:', error);
      throw error;
    }
  }

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
