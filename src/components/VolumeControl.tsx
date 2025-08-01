
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  disabled = false
}) => {
  const volumePercentage = Math.round(volume * 100);
  const isMuted = volume === 0;

  const toggleMute = () => {
    onVolumeChange(isMuted ? 0.7 : 0);
  };

  const handleSliderChange = (values: number[]) => {
    onVolumeChange(values[0] / 100);
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Button
        onClick={toggleMute}
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        disabled={disabled}
      >
        {isMuted ? (
          <VolumeX className="h-3 w-3 text-gray-500" />
        ) : (
          <Volume2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <Slider
          value={[volumePercentage]}
          onValueChange={handleSliderChange}
          max={100}
          min={0}
          step={5}
          className="w-full"
          disabled={disabled}
        />
      </div>
      
      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[2rem] text-right">
        {volumePercentage}%
      </span>
    </div>
  );
};

export default VolumeControl;
