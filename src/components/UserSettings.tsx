
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, User, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';

interface UserSettingsProps {
  userEmail?: string;
  selectedVoice: 'Rachel' | 'Cassidy';
  onVoiceChange: (voice: 'Rachel' | 'Cassidy') => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userEmail,
  selectedVoice,
  onVoiceChange
}) => {
  const { theme, toggleTheme } = useTheme();
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordUpdate = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center dark:text-white">
            <User className="h-5 w-5 mr-2" />
            User Settings
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Manage your account preferences and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="sm"
                className="capitalize"
              >
                {theme}
              </Button>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Voice</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">AI Voice</span>
              <select
                value={selectedVoice}
                onChange={(e) => onVoiceChange(e.target.value as 'Rachel' | 'Cassidy')}
                className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="Rachel">Rachel</option>
                <option value="Cassidy">Cassidy</option>
              </select>
            </div>
          </div>

          {/* Memory Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Privacy</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversation History</span>
              <Button
                onClick={() => setMemoryEnabled(!memoryEnabled)}
                variant={memoryEnabled ? "default" : "outline"}
                size="sm"
              >
                {memoryEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>

          {/* Account Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Account</h3>
            
            {userEmail && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Signed in as: <span className="font-medium">{userEmail}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={!newPassword.trim()}
                  size="sm"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettings;
