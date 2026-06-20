import { Play, Pause, SkipBack, SkipForward, FastForward, Gauge } from 'lucide-react';
import { useWaybillStore } from '@/store/useWaybillStore';
import dayjs from 'dayjs';

interface PlaybackControlsProps {
  totalMinutes: number;
  currentTime: string;
  startTime: string;
}

export default function PlaybackControls({ totalMinutes, currentTime, startTime }: PlaybackControlsProps) {
  const playbackIndex = useWaybillStore((state) => state.playbackIndex);
  const isPlaying = useWaybillStore((state) => state.isPlaying);
  const playbackSpeed = useWaybillStore((state) => state.playbackSpeed);
  const setIsPlaying = useWaybillStore((state) => state.setIsPlaying);
  const setPlaybackSpeed = useWaybillStore((state) => state.setPlaybackSpeed);
  const setPlaybackIndex = useWaybillStore((state) => state.setPlaybackIndex);

  const progress = totalMinutes > 0 ? (playbackIndex / totalMinutes) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newIndex = Math.max(0, Math.min(Math.floor(percent * totalMinutes), totalMinutes));
    setPlaybackIndex(newIndex);
  };

  const handleSkipBack = () => {
    setPlaybackIndex(Math.max(0, playbackIndex - 30));
  };

  const handleSkipForward = () => {
    setPlaybackIndex(Math.min(totalMinutes, playbackIndex + 30));
  };

  const speedOptions = [0.5, 1, 2, 4];

  const formatTime = (index: number) => {
    return dayjs(startTime).add(index, 'minute').format('HH:mm:ss');
  };

  return (
    <div className="bg-cold-surface/70 backdrop-blur-sm border border-cold-border rounded-lg p-4">
      <div className="flex items-center gap-6">
        {/* 时间显示 */}
        <div className="text-center min-w-[120px]">
          <div className="font-mono text-2xl font-bold text-white">
            {formatTime(playbackIndex)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">当前时间</div>
        </div>

        {/* 播放控制按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipBack}
            className="w-9 h-9 flex items-center justify-center rounded border border-cold-border text-gray-400 hover:text-white hover:bg-cold-mid/50 transition-colors"
            title="后退30秒"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`
              w-12 h-12 flex items-center justify-center rounded-full transition-all
              ${isPlaying
                ? 'bg-alert-red hover:bg-red-500 text-white shadow-lg shadow-alert-red/30'
                : 'bg-cold-accent hover:bg-cold-light text-white shadow-lg shadow-cold-accent/30'
              }
            `}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={handleSkipForward}
            className="w-9 h-9 flex items-center justify-center rounded border border-cold-border text-gray-400 hover:text-white hover:bg-cold-mid/50 transition-colors"
            title="快进30秒"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* 进度条 */}
        <div className="flex-1">
          <div
            className="relative h-2 bg-cold-bg rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cold-mid to-cold-accent rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 8px)` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-500 font-mono">
            <span>{formatTime(0)}</span>
            <span>{formatTime(totalMinutes)}</span>
          </div>
        </div>

        {/* 倍速控制 */}
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-gray-500" />
          <div className="flex bg-cold-bg rounded border border-cold-border overflow-hidden">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`
                  px-2.5 py-1 text-xs font-mono transition-colors
                  ${playbackSpeed === speed
                    ? 'bg-cold-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-cold-surface'
                  }
                `}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
