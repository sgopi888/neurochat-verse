
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface UserSettingsProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onRefreshChats?: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ 
  selectedVoice, 
  onVoiceChange,
  onRefreshChats 
}) => {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to clear chat history');
        return;
      }

      // Delete all chats for the current user
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Chat history cleared successfully');
      
      // Refresh the chat list if callback provided
      if (onRefreshChats) {
        onRefreshChats();
      }

    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast.error('Failed to clear chat history');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Voice Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="voice-select">Select Voice</Label>
          <Select value={selectedVoice} onValueChange={onVoiceChange}>
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Choose a voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
              <SelectItem value="echo">Echo (Male)</SelectItem>
              <SelectItem value="fable">Fable (British Male)</SelectItem>
              <SelectItem value="onyx">Onyx (Deep Male)</SelectItem>
              <SelectItem value="nova">Nova (Female)</SelectItem>
              <SelectItem value="shimmer">Shimmer (Soft Female)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-red-700">Data Management</h3>
        
        <div className="space-y-3">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start space-x-3">
              <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Clear Chat History</h4>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete all your chat conversations. This action cannot be undone.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      disabled={isClearing}
                    >
                      {isClearing ? 'Clearing...' : 'Clear All Chats'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your chat history and remove all conversations from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearHistory}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isClearing}
                      >
                        {isClearing ? 'Clearing...' : 'Yes, clear all chats'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
