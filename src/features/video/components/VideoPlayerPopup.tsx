
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, ExternalLink } from 'lucide-react';
import { VIDEO_CONFIG } from '../config/videoConfig';

interface VideoPlayerPopupProps {
  videoUrl: string | null;
  hostedUrl?: string | null;
  isVisible: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

const VideoPlayerPopup: React.FC<VideoPlayerPopupProps> = ({
  videoUrl,
  hostedUrl,
  isVisible,
  isMinimized,
  onClose,
  onMinimize,
  onMaximize
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoUrl && videoRef.current && VIDEO_CONFIG.autoPlay) {
      videoRef.current.play().catch(console.error);
    }
  }, [videoUrl]);

  if (!isVisible || (!videoUrl && !hostedUrl)) {
    return null;
  }

  const displayUrl = videoUrl || hostedUrl;

  const popupClasses = `
    fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
    transition-all duration-300 ease-in-out
    ${VIDEO_CONFIG.popupPosition === 'bottom-right' ? 'bottom-4 right-4' : ''}
    ${isMinimized ? 'w-16 h-12' : `w-[${VIDEO_CONFIG.maxWidth}px] max-w-sm`}
  `;

  return (
    <div className={popupClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {isMinimized ? '' : '🎬 Avatar Video'}
        </span>
        <div className="flex items-center gap-1">
          {/* External link button for hosted URL */}
          {!isMinimized && hostedUrl && (
            <Button
              onClick={() => window.open(hostedUrl, '_blank')}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          {!isMinimized && (
            <Button
              onClick={onMinimize}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
          {isMinimized && (
            <Button
              onClick={onMaximize}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Video Content */}
      {!isMinimized && (
        <div className="p-2">
          <video
            ref={videoRef}
            src={displayUrl}
            controls
            className="w-full rounded"
            style={{ maxHeight: VIDEO_CONFIG.maxHeight }}
          >
            Your browser does not support the video tag.
          </video>
          {hostedUrl && (
            <div className="mt-2 text-center">
              <Button
                onClick={() => window.open(hostedUrl, '_blank')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in Tavus
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayerPopup;
