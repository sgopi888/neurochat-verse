
import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';

interface VideoGenerationControlsProps {
  isVideoGenerating: boolean;
  videoUrl: string | null;
  videoError: string | null;
  lastGeneratedAudioBlob: Blob | null;
  onGenerateVideo: () => void;
  onClearVideo: () => void;
}

const VideoGenerationControls: React.FC<VideoGenerationControlsProps> = ({
  isVideoGenerating,
  videoUrl,
  videoError,
  lastGeneratedAudioBlob,
  onGenerateVideo,
  onClearVideo
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Video Generation Button */}
      <Button
        onClick={onGenerateVideo}
        disabled={!lastGeneratedAudioBlob || isVideoGenerating}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isVideoGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Avatar Video...
          </>
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            Generate Avatar Video
          </>
        )}
      </Button>

      {/* Video Error Display */}
      {videoError && (
        <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
          Error: {videoError}
        </div>
      )}

      {/* Video Player */}
      {videoUrl && (
        <div className="space-y-2">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg shadow-md"
            style={{ maxHeight: '300px' }}
          >
            Your browser does not support the video tag.
          </video>
          <Button
            onClick={onClearVideo}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Clear Video
          </Button>
        </div>
      )}

      {/* Help Text */}
      {!lastGeneratedAudioBlob && (
        <p className="text-sm text-gray-500 text-center">
          Play an AI response first to generate avatar video
        </p>
      )}
    </div>
  );
};

export default VideoGenerationControls;
