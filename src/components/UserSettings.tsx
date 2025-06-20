
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, User, Volume2, Palette } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

interface UserSettingsProps {
  userEmail?: string;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userEmail,
  selectedVoice,
  onVoiceChange,
  onThemeToggle,
  currentTheme
}) => {
  const voiceDescriptions = {
    James: 'Deep, professional male voice',
    Cassidy: 'Clear, friendly female voice',
    Drew: 'Warm, conversational male voice',
    Lavender: 'Calm, soothing female voice'
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center dark:text-white">
            <User className="h-5 w-5 mr-2" />
            User Settings
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Customize your experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:text-white">Account</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userEmail || 'Not signed in'}
              </p>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Voice Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium dark:text-white">Voice Selection</Label>
            </div>
            <Select value={selectedVoice} onValueChange={onVoiceChange}>
              <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {Object.entries(voiceDescriptions).map(([voice, description]) => (
                  <SelectItem key={voice} value={voice} className="dark:hover:bg-gray-700">
                    <div>
                      <div className="font-medium">{voice}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Currently selected: {selectedVoice} - {voiceDescriptions[selectedVoice]}
            </p>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Theme Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4 text-purple-600" />
              <Label className="text-sm font-medium dark:text-white">Appearance</Label>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm dark:text-white">Dark Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={currentTheme === 'dark'}
                onCheckedChange={onThemeToggle}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettings;
