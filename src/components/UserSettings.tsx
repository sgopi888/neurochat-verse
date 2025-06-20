
import { Settings, Moon, Sun, Volume2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface UserSettingsProps {
  userEmail?: string;
  selectedVoice: 'Rachel' | 'Cassidy';
  onVoiceChange: (voice: 'Rachel' | 'Cassidy') => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
}

const UserSettings = ({ 
  userEmail, 
  selectedVoice, 
  onVoiceChange,
  onThemeToggle,
  currentTheme
}: UserSettingsProps) => {
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
            <Select value={selectedVoice} onValueChange={(value: 'Rachel' | 'Cassidy') => onVoiceChange(value)}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <SelectItem value="Rachel" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  Rachel (Professional)
                </SelectItem>
                <SelectItem value="Cassidy" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cassidy (Casual)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

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
