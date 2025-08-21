import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChunksResponse {
  success: boolean;
  chunks: string[];
  error?: string;
  metadata?: any;
}

export const useChunksRetrieval = () => {
  const [isRetrieving, setIsRetrieving] = useState(false);
  const { toast } = useToast();

  const retrieveChunks = async (
    chatHistory: Message[], 
    userMessage: string
  ): Promise<string[]> => {
    setIsRetrieving(true);
    
    try {
      console.log('Retrieving chunks for message:', userMessage);
      
      // Call the chunks-retrieval edge function
      const { data, error } = await supabase.functions.invoke('chunks-retrieval', {
        body: {
          chatHistory: chatHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          })),
          userMessage
        }
      });

      if (error) {
        console.error('Chunks retrieval error:', error);
        toast({
          title: "Chunks Retrieval Failed",
          description: "Could not retrieve relevant knowledge chunks",
          variant: "destructive",
        });
        return [];
      }

      const response = data as ChunksResponse;
      
      if (!response.success) {
        console.warn('Chunks retrieval returned error:', response.error);
        return [];
      }

      const chunks = response.chunks || [];
      console.log('Retrieved chunks:', chunks.length, 'items');
      
      if (chunks.length > 0) {
        toast({
          title: "Knowledge Retrieved",
          description: `Found ${chunks.length} relevant knowledge chunks`,
        });
      }
      
      return chunks;
      
    } catch (error) {
      console.error('Chunks retrieval failed:', error);
      toast({
        title: "Error",
        description: "Failed to retrieve knowledge chunks",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsRetrieving(false);
    }
  };

  return {
    retrieveChunks,
    isRetrieving
  };
};