import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Music, RotateCcw, Pause, Play } from 'lucide-react';

interface BackgroundMusicUploadProps {
  musicName?: string;                 // optional label to show
  isCustomMusic?: boolean;            // whether current music is custom
  onMusicUpload: (file: File) => void;// you can keep this to inform parent if needed
  onRemoveMusic: () => void;          // reset to default (UI + parent)
  disabled?: boolean;
  defaultSrc: string;                 // <-- REQUIRED: default piano MP3 URL
  autoPlay?: boolean;                 // default true
  loop?: boolean;                     // default true
  volume?: number;                    // 0..1 default 0.4
}

const BackgroundMusicUpload: React.FC<BackgroundMusicUploadProps> = ({
  musicName,
  isCustomMusic = false,
  onMusicUpload,
  onRemoveMusic,
  disabled = false,
  defaultSrc,
  autoPlay = true,
  loop = true,
  volume = 0.4
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [needUserTap, setNeedUserTap] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // create/revoke object URL for uploaded file
  useEffect(() => {
    if (!file) { setFileUrl(null); return; }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  // current src (custom file takes precedence)
  const src = useMemo(() => (fileUrl ? fileUrl : defaultSrc), [fileUrl, defaultSrc]);

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (f) {
      setFile(f);            // local playback
      onMusicUpload(f);      // let parent know if it needs to persist
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setFile(null);
    onRemoveMusic();
  };

  // ensure volume/loop are applied
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = loop;
    audioRef.current.volume = Math.min(1, Math.max(0, volume));
  }, [loop, volume]);

  // try to play when src changes (after a user gesture, or show “Enable sound”)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const tryPlay = async () => {
      try {
        if (autoPlay) {
          await el.play();
          setIsPlaying(true);
          setNeedUserTap(false);
        }
      } catch {
        // browser blocked autoplay—require user tap
        setNeedUserTap(true);
        setIsPlaying(false);
      }
    };
    el.load(); // reload on src change
    tryPlay();
  }, [src, autoPlay]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setIsPlaying(true);
        setNeedUserTap(false);
      } catch {
        setNeedUserTap(true);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - (extension?.length ?? 0) - 4) + '...';
    return `${truncated}.${extension}`;
  };

  const getDisplayName = () => {
    if (file) return truncateFileName(file.name);
    if (!musicName) return '';
    return isCustomMusic ? truncateFileName(musicName) : 'Background Music';
  };

  const getDisplaySubtitle = () => {
    if (file) return 'Custom Upload';
    if (!musicName) return '';
    return isCustomMusic ? 'Custom Upload' : 'Default Piano';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Music className="h-4 w-4" />
          Background Music
        </label>
        <div className="flex items-center gap-1">
          <Button onClick={togglePlay} disabled={disabled} variant="ghost" size="sm" className="h-7 px-2">
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {!file && !musicName ? (
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
          (file || isCustomMusic)
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Music className={`h-4 w-4 flex-shrink-0 ${
                (file || isCustomMusic) ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${
                  (file || isCustomMusic) ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'
                }`} title={getDisplayName()}>
                  {getDisplayName()}
                </span>
                <span className={`text-xs ${
                  (file || isCustomMusic) ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {getDisplaySubtitle()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button onClick={handleFileSelect} disabled={disabled} variant="ghost" size="sm" className="h-7 w-7 p-0" title="Upload different music">
                <Upload className="h-3 w-3" />
              </Button>
              {(file || isCustomMusic) && (
                <Button onClick={handleReset} disabled={disabled} variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        title="Reset to default piano music">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          {needUserTap && (
            <div className="mt-2">
              <Button onClick={togglePlay} size="sm" className="h-8">
                Enable sound
              </Button>
            </div>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

      {!file && !musicName && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Supported: MP3, WAV, OGG, M4A (Max 50MB)</p>
      )}

      <audio ref={audioRef} src={src} preload="auto" />
    </div>
  );
};

export default BackgroundMusicUpload;
