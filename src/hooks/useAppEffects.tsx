
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const useAppEffects = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>,
  setSuggestedQuestions: React.Dispatch<React.SetStateAction<string[]>>,
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>,
  stopCurrentAudio: () => Promise<void>
) => {
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Set the document title
  useEffect(() => {
    document.title = 'Neuroheart.AI Mindfulness Coach';
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        alert('Command palette not implemented yet!');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSpeak = (text: string) => {
    // This will be handled by the parent component's handlePlayLatestResponse
  };

  const handleSignOut = async () => {
    try {
      // Stop any playing audio before signing out
      await stopCurrentAudio();
      
      await supabase.auth.signOut();
      setMessages([]);
      setCurrentChatId(null);
      setSuggestedQuestions([]);
      setShowSuggestions(false);
      setIsMobileSidebarOpen(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const toggleMobileSidebar = () => {
    console.log('Toggling mobile sidebar. Current state:', isMobileSidebarOpen);
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return {
    isMobile,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleCopy,
    handleSpeak,
    handleSignOut,
    toggleMobileSidebar
  };
};
