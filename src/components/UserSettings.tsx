
import { Settings, Moon, Sun, Volume2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ProfilePicture from './ProfilePicture';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Chat {
  id: string;
  title: string;
  is_article: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSettingsProps {
  userEmail?: string;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
  avatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onChatRefresh: () => void;
}

const UserSettings = ({ 
  userEmail, 
  selectedVoice, 
  onVoiceChange,
  onThemeToggle,
  currentTheme,
  avatarUrl,
  onAvatarUpdate,
  chats,
  currentChatId,
  onNewChat,
  onChatRefresh
}: UserSettingsProps) => {
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { user } = useAuth();

  const deleteAllChats = async () => {
    if (!user) return;
    
    setIsDeletingAll(true);
    
    try {
      console.log('Deleting all chats for user:', user.id);
      
      const { error } = await supabase
        .from('chat_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) {
        console.error('Error deleting all chats:', error);
        toast.error('Failed to delete chat history');
      } else {
        console.log('All chats deleted successfully');
        toast.success('Chat history deleted. Data will be permanently removed after 90 days for security purposes.');
        onNewChat();
        onChatRefresh();
        setShowDeleteAllDialog(false);
      }
    } catch (error) {
      console.error('Error in deleteAllChats:', error);
      toast.error('Failed to delete chat history');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Settings</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize your experience
            </p>
          </div>
          
          <Separator />
          
          {/* Profile Picture Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              Profile Picture
            </Label>
            <ProfilePicture
              userEmail={userEmail}
              avatarUrl={avatarUrl}
              onAvatarUpdate={onAvatarUpdate}
            />
          </div>

          <Separator />
          
          {/* Theme Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              Theme
            </Label>
            <Button
              onClick={onThemeToggle}
              variant="outline"
              size="sm"
              className="w-full justify-start bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            >
              {currentTheme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Switch to Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Switch to Dark Mode
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              <Volume2 className="h-4 w-4 inline mr-1" />
              Voice Selection
            </Label>
            <Select value={selectedVoice} onValueChange={(value: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => onVoiceChange(value)}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <SelectItem value="James" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  James (Professional)
                </SelectItem>
                <SelectItem value="Cassidy" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cassidy (Friendly)
                </SelectItem>
                <SelectItem value="Drew" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  Drew (Confident)
                </SelectItem>
                <SelectItem value="Lavender" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  Lavender (Soothing)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Clear History */}
          {chats.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Chat Management
              </Label>
              <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All History
                  </Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center dark:text-white">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      Delete All Chat History
                    </DialogTitle>
                    <DialogDescription className="dark:text-gray-400 space-y-2">
                      <p>This will remove all your chat history from your account.</p>
                      <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <strong>Security Notice:</strong> For security and compliance purposes, your chat data will be retained in our secure systems for 90 days before permanent deletion. This allows for account recovery and security investigations if needed.
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        During the 90-day period, the data is not accessible through your account but remains stored for security purposes only.
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteAllDialog(false)}
                      disabled={isDeletingAll}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={deleteAllChats}
                      disabled={isDeletingAll}
                    >
                      {isDeletingAll ? 'Deleting...' : 'Delete All History'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {userEmail && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">
                  Account
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {userEmail}
                </p>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserSettings;
