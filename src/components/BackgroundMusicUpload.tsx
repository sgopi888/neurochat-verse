import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Music, Trash2, RotateCcw } from 'lucide-react';

interface BackgroundMusicUploadProps {
  musicName?: string;
  isCustomMusic?: boolean;
  onMusicUpload: (file: File) => void;
  onRemoveMusic: () => void;
  disabled?: boolean;
}

const BackgroundMusicUpload: React.FC<BackgroundMusicUploadProps> = ({
  musicName,
  isCustomMusic = false,
  onMusicUpload,
  onRemoveMusic,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onMusicUpload(file);
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    return `${truncated}.${extension}`;
  };

  // Display name logic - show "Default Piano" for default, actual filename for custom
  const getDisplayName = () => {
    if (!musicName) return '';
    if (isCustomMusic) {
      return truncateFileName(musicName);
    } else {
      return 'Default Piano';
    }
  };

  // Display subtitle logic
  const getDisplaySubtitle = () => {
    if (!musicName) return '';
    if (isCustomMusic) {
      return 'Custom Upload';
    } else {
      return 'Default Piano'; // Changed from showing the full filename
    }
  };

  return (
    <div className="space-y-3">

      {!musicName ? (
        <Button
          onClick={handleFileSelect}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="w-full justify-start bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Background Music
        </Button>
      ) : (
        <div className={`rounded-lg p-3 border ${
          isCustomMusic 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Music className={`h-4 w-4 flex-shrink-0 ${
                isCustomMusic 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-green-600 dark:text-green-400'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${
                  isCustomMusic 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-green-700 dark:text-green-300'
                }`} title={musicName}>
                  {getDisplayName()}
                </span>
                <span className={`text-xs ${
                  isCustomMusic 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {getDisplaySubtitle()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                onClick={handleFileSelect}
                disabled={disabled}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Upload different music"
              >
                <Upload className="h-3 w-3" />
              </Button>
              {isCustomMusic && (
                <Button
                  onClick={onRemoveMusic}
                  disabled={disabled}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  title="Reset to default piano music"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!musicName && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Supported formats: MP3, WAV, OGG, M4A (Max 50MB)
        </p>
      )}
      
      {musicName && !isCustomMusic && (
        <p className="text-xs text-green-600 dark:text-green-400">
          🎹 Default piano music is chosen. Upload your own to replace it.
        </p>
      )}
    </div>
  );
};

export default BackgroundMusicUpload;