
import React from 'react';
import { Loader2, Upload, Video, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoProgressProps {
  currentStep: string;
  isGenerating: boolean;
  error?: string | null;
}

const VideoProgress: React.FC<VideoProgressProps> = ({ 
  currentStep, 
  isGenerating, 
  error 
}) => {
  if (!isGenerating && !error && !currentStep) {
    return null;
  }

  const getIcon = () => {
    if (error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (currentStep === 'Video Ready!') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (currentStep.includes('Creating')) {
      return <Upload className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (currentStep.includes('Processing')) {
      return <Video className="h-5 w-5 text-purple-500 animate-spin" />;
    }
    return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  };

  const getProgressText = () => {
    if (error) return `Error: ${error}`;
    if (currentStep) return currentStep;
    return 'Generating...';
  };

  const getBorderColor = () => {
    if (error) return 'border-red-200';
    if (currentStep === 'Video Ready!') return 'border-green-200';
    return 'border-blue-200';
  };

  const getBgColor = () => {
    if (error) return 'bg-red-50';
    if (currentStep === 'Video Ready!') return 'bg-green-50';
    return 'bg-blue-50';
  };

  return (
    <div className={`flex items-center justify-center p-4 rounded-lg border ${getBorderColor()} ${getBgColor()} transition-all duration-300`}>
      <div className="flex items-center space-x-3">
        <div className="relative">
          {getIcon()}
          {isGenerating && (
            <div className="absolute inset-0 animate-ping">
              <div className="h-5 w-5 rounded-full bg-blue-500 opacity-20"></div>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">
            {getProgressText()}
          </span>
          {isGenerating && (
            <span className="text-xs text-gray-500">
              This may take up to 5 minutes...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoProgress;
