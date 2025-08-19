import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, LogOut, Play, Pause, Volume2, Music, MessageSquare, Plus, User, Trash2, Clock, Loader2 } from 'lucide-react';
import BackgroundMusicUpload from './BackgroundMusicUpload';
import VolumeControl from './VolumeControl';
import UserSettings from './UserSettings';
import PlayVideoButton from '@/features/video/components/PlayVideoButton';
import VideoProgress from '@/features/video/components/VideoProgress';
import { useChatHistory } from '@/hooks/useChatHistory';
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
  const { chatSessions, isLoading: isLoadingHistory, deleteChat } = useChatHistory(currentChatId);

  const handleVideoClick = () => {
    if (!canGenerateVideo) {
      toast.error('No AI response available to generate video');
      return;
    }
    onGenerateVideo();
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId);
      if (chatId === currentChatId) {
        onNewChat();
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            NeuroHeart AI
          </h2>
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-primary/20"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Audio Controls */}
        <div className="p-3 pb-2">
          <Card className="bg-card/50 border-border/50 scale-90 transform origin-top">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs flex items-center">
                <Volume2 className="h-3 w-3 mr-2" />
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
                disabled={isAudioProcessing}
              >
                {isAudioProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isPlaying ? (
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
        </div>

        {/* Background Music */}
        <div className="p-3 pt-0">
          <Card className="bg-card/50 border-border/50 scale-90 transform origin-top">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs flex items-center">
                <Music className="h-3 w-3 mr-2" />
                Background Music
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BackgroundMusicUpload
                musicName={musicName}
                onMusicUpload={onMusicUpload}
                onRemoveMusic={onRemoveMusic}
                defaultSrc="https://obgbnrasiyozdnmoixxx.supabase.co/storage/v1/object/public/music/piano.mp3"
              />
              <VolumeControl
                volume={musicVolume}
                onVolumeChange={onVolumeChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Chat History */}
        <div className="p-3 pt-0 flex-1 min-h-0">
          <Card className="bg-card/50 border-border/50 h-full flex flex-col scale-90 transform origin-top">
            <CardHeader className="pb-2 flex-shrink-0 px-3 pt-3">
              <CardTitle className="text-xs flex items-center">
                <MessageSquare className="h-3 w-3 mr-2" />
                Chat History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-1">
              {isLoadingHistory ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : chatSessions.length === 0 ? (
                <div className="text-xs text-muted-foreground">No chat history yet</div>
              ) : (
                chatSessions.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      chat.id === currentChatId 
                        ? 'bg-primary/20 border border-primary/50' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onChatSelect(chat.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" title={chat.title}>
                        {chat.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(chat.updated_at)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      title="Delete chat"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-border bg-gradient-to-r from-primary/5 to-accent/5 flex-shrink-0">
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