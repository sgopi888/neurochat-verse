
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Music, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BackgroundMusicUploadProps {
  onMusicUpload: (audioFile: File) => void;
  currentMusicName?: string;
  onRemoveMusic: () => void;
}

const BackgroundMusicUpload: React.FC<BackgroundMusicUploadProps> = ({
  onMusicUpload,
  currentMusicName,
  onRemoveMusic
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    onMusicUpload(file);
    setIsOpen(false);
    toast.success('Background music uploaded successfully');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-8 h-8 p-0 rounded-full bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300 transition-all duration-200"
        >
          <Plus className="h-4 w-4 text-green-600" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-blue-600" />
            Background Music
          </DialogTitle>
          <DialogDescription>
            Upload an MP3 or audio file to play in the background during voice playback.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentMusicName && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium truncate">{currentMusicName}</span>
              </div>
              <Button
                onClick={onRemoveMusic}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <Button
              onClick={handleButtonClick}
              className="w-full flex items-center gap-2"
              variant={currentMusicName ? "outline" : "default"}
            >
              <Upload className="h-4 w-4" />
              {currentMusicName ? 'Replace Music' : 'Upload Music'}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <p className="text-xs text-gray-500 text-center">
              Supported formats: MP3, WAV, OGG (Max: 10MB)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundMusicUpload;
