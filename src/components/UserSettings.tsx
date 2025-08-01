
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Settings, Volume2, Music } from 'lucide-react';
import BackgroundMusicUpload from './BackgroundMusicUpload';
import VolumeControl from './VolumeControl';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  onPlayLatestResponse: () => void;
  onPauseAudio: () => void;
  musicName: string;
  musicVolume: number;
  onMusicUpload: (file: File) => void;
  onRemoveMusic: () => void;
  onVolumeChange: (volume: number) => void;
  userEmail?: string;
  onSignOut: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({
  isOpen,
  onClose,
  isPlaying,
  selectedVoice,
  onVoiceChange,
  onPlayLatestResponse,
  onPauseAudio,
  musicName,
  musicVolume,
  onMusicUpload,
  onRemoveMusic,
  onVolumeChange,
  userEmail,
  onSignOut
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Audio Controls Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <Volume2 className="h-4 w-4 mr-2" />
              Audio Controls
            </h3>
            
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
              <Select value={selectedVoice} onValueChange={onVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="James">James</SelectItem>
                  <SelectItem value="Cassidy">Cassidy</SelectItem>
                  <SelectItem value="Drew">Drew</SelectItem>
                  <SelectItem value="Lavender">Lavender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Play/Pause Button */}
            <Button
              onClick={isPlaying ? onPauseAudio : onPlayLatestResponse}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Audio
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Latest Response
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Background Music Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center">
              <Music className="h-4 w-4 mr-2" />
              Background Music
            </h3>
            
            <BackgroundMusicUpload
              currentMusicName={musicName}
              onMusicUpload={onMusicUpload}
              onRemoveMusic={onRemoveMusic}
            />
            
            <VolumeControl
              volume={musicVolume}
              onVolumeChange={onVolumeChange}
            />
          </div>

          <Separator />

          {/* User Account Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Account</h3>
            {userEmail && (
              <p className="text-sm text-gray-600">{userEmail}</p>
            )}
            <Button onClick={onSignOut} variant="outline" className="w-full">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;
