import { useEffect, useRef } from 'react';
import { useWaybillStore } from '@/store/useWaybillStore';
import RouteMap from '@/components/playback/RouteMap';
import TemperatureChart from '@/components/playback/TemperatureChart';
import PlaybackControls from '@/components/playback/PlaybackControls';
import EventPanel from '@/components/playback/EventPanel';
import { Package, Truck, User, Building, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

export default function PlaybackPage() {
  const waybills = useWaybillStore((state) => state.waybills);
  const selectedWaybillId = useWaybillStore((state) => state.selectedWaybillId);
  const playbackIndex = useWaybillStore((state) => state.playbackIndex);
  const isPlaying = useWaybillStore((state) => state.isPlaying);
  const playbackSpeed = useWaybillStore((state) => state.playbackSpeed);
  const setPlaybackIndex = useWaybillStore((state) => state.setPlaybackIndex);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);

  const intervalRef = useRef<number | null>(null);

  const selectedWaybill = waybills.find((w) => w.id === selectedWaybillId) || waybills[0];

  useEffect(() => {
    if (!selectedWaybill && waybills.length > 0) {
      setSelectedWaybill(waybills[0].id);
    }
  }, [waybills, selectedWaybill, setSelectedWaybill]);

  useEffect(() => {
    if (!selectedWaybill) return;

    if (isPlaying) {
      const interval = 1000 / playbackSpeed;
      intervalRef.current = window.setInterval(() => {
        setPlaybackIndex((prev) => {
          const total = selectedWaybill.temperatureRecords.length - 1;
          if (prev >= total) {
            return 0;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, selectedWaybill, setPlaybackIndex]);

  if (!selectedWaybill) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <p className="text-gray-500">请先导入运单数据</p>
      </div>
    );
  }

  const totalMinutes = selectedWaybill.temperatureRecords.length - 1;
  const currentTime = dayjs(selectedWaybill.departureTime)
    .add(playbackIndex, 'minute')
    .format('YYYY-MM-DD HH:mm:ss');

  return (
    <div className="p-6 space-y-4 h-[calc(100vh-180px)] flex flex-col">
      {/* 运单信息栏 */}
      <div className="bg-cold-surface/50 rounded-lg border border-cold-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">运单号</div>
              <div className="font-mono text-lg font-bold text-cold-accent">
                {selectedWaybill.id}
              </div>
            </div>
            <div className="h-10 w-px bg-cold-border"></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">司机</div>
                  <div className="text-sm text-gray-200">{selectedWaybill.driver}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">货物</div>
                  <div className="text-sm text-gray-200">{selectedWaybill.cargoType}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">门店</div>
                  <div className="text-sm text-gray-200">{selectedWaybill.store}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedWaybill.driftIncidents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-alert-red/10 border border-alert-red/30">
                <AlertTriangle className="w-4 h-4 text-alert-red" />
                <div>
                  <div className="text-xs text-gray-400">温漂事件</div>
                  <div className="text-sm font-bold text-alert-red">
                    {selectedWaybill.driftIncidents.length} 次
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">承运商</div>
              <div className="text-sm text-gray-200">{selectedWaybill.carrier}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* 左侧 - 路线图和温度图 */}
        <div className="col-span-9 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <RouteMap waybill={selectedWaybill} currentIndex={playbackIndex} />
          </div>
          <div className="h-64">
            <TemperatureChart waybill={selectedWaybill} currentIndex={playbackIndex} />
          </div>
        </div>

        {/* 右侧 - 事件面板 */}
        <div className="col-span-3 min-h-0">
          <EventPanel waybill={selectedWaybill} currentIndex={playbackIndex} />
        </div>
      </div>

      {/* 底部控制栏 */}
      <PlaybackControls
        totalMinutes={totalMinutes}
        currentTime={currentTime}
        startTime={selectedWaybill.departureTime}
      />
    </div>
  );
}
