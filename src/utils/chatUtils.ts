
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const deleteChatWithErrorHandling = async (chatId: string): Promise<boolean> => {
  try {
    console.log(`Attempting to delete chat: ${chatId}`);
    
    // First, try to delete related messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);

    if (messagesError) {
      console.error('Error deleting messages for chat:', messagesError);
      // Continue with chat deletion even if message deletion fails
    } else {
      console.log('Messages deleted successfully for chat:', chatId);
    }

    // Then delete the chat itself
    const { error: chatError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (chatError) {
      console.error('Error deleting chat:', chatError);
      toast.error(`Failed to delete chat: ${chatError.message}`);
      return false;
    }

    console.log('Chat deleted successfully:', chatId);
    toast.success('Chat deleted successfully');
    return true;

  } catch (error) {
    console.error('Unexpected error during chat deletion:', error);
    toast.error('Failed to delete chat due to unexpected error');
    return false;
  }
};
