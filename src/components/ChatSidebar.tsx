import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, LogOut, Play, Pause, Volume2, Music, MessageSquare, Plus, User } from 'lucide-react';
import BackgroundMusicUpload from './BackgroundMusicUpload';
import VolumeControl from './VolumeControl';
import UserSettings from './UserSettings';
import PlayVideoButton from '@/features/video/components/PlayVideoButton';
import VideoProgress from '@/features/video/components/VideoProgress';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onSignOut: () => void;
  userEmail?: string;
  messages: Message[];
  onPlayLatestResponse: () => void;
  onPauseAudio: () => void;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  isPlaying: boolean;
  isAudioProcessing?: boolean;
  musicName: string;
  musicVolume: number;
  onMusicUpload: (file: File) => void;
  onRemoveMusic: () => void;
  onVolumeChange: (volume: number) => void;
  // Video props
  isVideoEnabled?: boolean;
  canGenerateVideo?: boolean;
  onGenerateVideo?: () => void;
  isVideoGenerating?: boolean;
  videoCurrentStep?: string;
  videoError?: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  onNewChat,
  onSignOut,
  userEmail,
  messages,
  onPlayLatestResponse,
  onPauseAudio,
  selectedVoice,
  onVoiceChange,
  isPlaying,
  isAudioProcessing = false,
  musicName,
  musicVolume,
  onMusicUpload,
  onRemoveMusic,
  onVolumeChange,
  isVideoEnabled = false,
  canGenerateVideo = false,
  onGenerateVideo = () => {},
  isVideoGenerating = false,
  videoCurrentStep = '',
  videoError = null
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleVideoClick = () => {
    if (!canGenerateVideo) {
      toast.error('No AI response available to generate video');
      return;
    }
    onGenerateVideo();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            NeuroHeart AI
          </h2>
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Audio Controls */}
      <div className="p-4 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Volume2 className="h-4 w-4 mr-2" />
              Audio Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Voice</label>
              <Select value={selectedVoice} onValueChange={onVoiceChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
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
              size="sm"
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Script
                </>
              )}
            </Button>

            {/* Enhanced Video Button with Progress */}
            {isVideoEnabled && (
              <div className="space-y-2">
                <PlayVideoButton
                  onClick={handleVideoClick}
                  disabled={false}
                  isGenerating={isVideoGenerating}
                  canGenerate={canGenerateVideo}
                />
                
                {/* Video Progress Display */}
                <VideoProgress
                  currentStep={videoCurrentStep}
                  isGenerating={isVideoGenerating}
                  error={videoError}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Background Music */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Music className="h-4 w-4 mr-2" />
              Background Music
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BackgroundMusicUpload
              musicName={musicName}
              onMusicUpload={onMusicUpload}
              onRemoveMusic={onRemoveMusic}
            />
            <VolumeControl
              volume={musicVolume}
              onVolumeChange={onVolumeChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* User Info */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {userEmail || 'Guest'}
            </span>
          </div>
          <Button
            onClick={onSignOut}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Modal */}
      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isPlaying={isPlaying}
        selectedVoice={selectedVoice}
        onVoiceChange={onVoiceChange}
        onPlayLatestResponse={onPlayLatestResponse}
        onPauseAudio={onPauseAudio}
        musicName={musicName}
        musicVolume={musicVolume}
        onMusicUpload={onMusicUpload}
        onRemoveMusic={onRemoveMusic}
        onVolumeChange={onVolumeChange}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />
    </div>
  );
};

export default ChatSidebar;
