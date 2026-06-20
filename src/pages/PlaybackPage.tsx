import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaybillStore } from '@/store/useWaybillStore';
import RouteMap from '@/components/playback/RouteMap';
import TemperatureChart from '@/components/playback/TemperatureChart';
import PlaybackControls from '@/components/playback/PlaybackControls';
import EventPanel from '@/components/playback/EventPanel';
import {
  Package,
  Truck,
  User,
  Building,
  AlertTriangle,
  ChevronDown,
  MapPin,
  Layers,
  List,
  ChevronsRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { Waybill, TemperatureRecord, GpsPoint, TripEvent, DriftIncident, LoadingEvent } from '@/types';

type ViewMode = 'waybill' | 'route';

interface RouteVirtualWaybill extends Waybill {
  isVirtual: boolean;
  segmentWaybills: Waybill[];
  segmentRanges: { waybillId: string; start: number; end: number }[];
}

export default function PlaybackPage() {
  const navigate = useNavigate();
  const waybills = useWaybillStore((state) => state.waybills);
  const selectedWaybillId = useWaybillStore((state) => state.selectedWaybillId);
  const playbackIndex = useWaybillStore((state) => state.playbackIndex);
  const isPlaying = useWaybillStore((state) => state.isPlaying);
  const playbackSpeed = useWaybillStore((state) => state.playbackSpeed);
  const setPlaybackIndex = useWaybillStore((state) => state.setPlaybackIndex);
  const setSelectedWaybill = useWaybillStore((state) => state.setSelectedWaybill);
  const setIsPlaying = useWaybillStore((state) => state.setIsPlaying);

  const [viewMode, setViewMode] = useState<ViewMode>('waybill');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const intervalRef = useRef<number | null>(null);

  const routes = useMemo(() => [...new Set(waybills.map((w) => w.route))], [waybills]);

  const routeWaybills = useMemo(() => {
    if (!selectedRoute) return [];
    return waybills
      .filter((w) => w.route === selectedRoute)
      .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [waybills, selectedRoute]);

  const virtualRouteWaybill = useMemo<RouteVirtualWaybill | null>(() => {
    if (viewMode !== 'route' || routeWaybills.length === 0) return null;

    const allTemps: TemperatureRecord[] = [];
    const allGps: GpsPoint[] = [];
    const allTripEvents: TripEvent[] = [];
    const allDrifts: DriftIncident[] = [];
    const allLoadingEvents: LoadingEvent[] = [];
    const segmentRanges: { waybillId: string; start: number; end: number }[] = [];
    let globalIndex = 0;

    let offsetX = 0;
    let maxX = 0;
    let baseY = 0;

    routeWaybills.forEach((wb) => {
      const len = wb.temperatureRecords.length;
      segmentRanges.push({ waybillId: wb.id, start: globalIndex, end: globalIndex + len - 1 });

      wb.temperatureRecords.forEach((t) => allTemps.push(t));
      wb.loadingEvents.forEach((e) => allLoadingEvents.push(e));

      wb.gpsPoints.forEach((p) => {
        allGps.push({
          ...p,
          x: p.x + offsetX,
          y: baseY,
        });
        maxX = Math.max(maxX, p.x + offsetX);
      });
      if (wb.gpsPoints.length > 0) {
        const lastX = Math.max(...wb.gpsPoints.map((p) => p.x));
        offsetX = lastX + 80;
      }

      wb.tripEvents.forEach((e) =>
        allTripEvents.push({
          ...e,
          positionIndex: e.positionIndex + globalIndex,
          id: `${e.id}_${globalIndex}`,
        })
      );
      wb.driftIncidents.forEach((d) =>
        allDrifts.push({
          ...d,
          startIndex: d.startIndex + globalIndex,
          endIndex: d.endIndex + globalIndex,
          id: `${d.id}_${globalIndex}`,
        })
      );

      globalIndex += len;
    });

    const totalLen = allTemps.length;
    const status: Waybill['status'] = allDrifts.some((d) =>
      routeWaybills.some((w) => w.id.startsWith('YB') && w.status === 'alert')
    )
      ? 'alert'
      : allDrifts.length > 0
      ? 'warning'
      : 'normal';

    const virtual: RouteVirtualWaybill = {
      id: `VR_${selectedRoute.replace(/[^\w]/g, '')}`,
      driver: routeWaybills.map((w) => w.driver).join(' / '),
      route: selectedRoute,
      carrier: [...new Set(routeWaybills.map((w) => w.carrier))].join('/'),
      store: routeWaybills.map((w) => w.store).join(' / '),
      cargoType: [...new Set(routeWaybills.map((w) => w.cargoType))].join('/'),
      departureTime: allTemps[0]?.timestamp || new Date().toISOString(),
      arrivalTime: allTemps[totalLen - 1]?.timestamp || new Date().toISOString(),
      tempThreshold: Math.min(...routeWaybills.map((w) => w.tempThreshold)),
      status,
      temperatureRecords: allTemps,
      gpsPoints: allGps,
      loadingEvents: allLoadingEvents,
      tripEvents: allTripEvents,
      driftIncidents: allDrifts,
      distanceKm: routeWaybills.reduce((s, w) => s + w.distanceKm, 0),
      vehiclePlate: routeWaybills.map((w) => w.vehiclePlate).join('/'),
      isVirtual: true,
      segmentWaybills: routeWaybills,
      segmentRanges,
    };

    return virtual;
  }, [viewMode, routeWaybills, selectedRoute]);

  const displayWaybill: Waybill | null = useMemo(() => {
    if (viewMode === 'route' && virtualRouteWaybill) return virtualRouteWaybill;
    return waybills.find((w) => w.id === selectedWaybillId) || waybills[0] || null;
  }, [viewMode, virtualRouteWaybill, waybills, selectedWaybillId]);

  const currentSegmentInfo = useMemo(() => {
    if (!virtualRouteWaybill || !displayWaybill) return null;
    if (!(displayWaybill as RouteVirtualWaybill).isVirtual) return null;
    const vr = displayWaybill as RouteVirtualWaybill;
    for (const seg of vr.segmentRanges) {
      if (playbackIndex >= seg.start && playbackIndex <= seg.end) {
        return {
          waybill: vr.segmentWaybills.find((w) => w.id === seg.waybillId),
          localIndex: playbackIndex - seg.start,
        };
      }
    }
    return null;
  }, [virtualRouteWaybill, displayWaybill, playbackIndex]);

  useEffect(() => {
    if (viewMode === 'route' && routes.length > 0 && !selectedRoute) {
      setSelectedRoute(routes[0]);
    }
    if (!selectedWaybillId && waybills.length > 0) {
      setSelectedWaybill(waybills[0].id);
    }
  }, [viewMode, routes, selectedRoute, selectedWaybillId, waybills, setSelectedWaybill]);

  useEffect(() => {
    if (!displayWaybill) return;

    if (isPlaying) {
      const interval = 1000 / playbackSpeed;
      intervalRef.current = window.setInterval(() => {
        setPlaybackIndex((prev) => {
          const total = displayWaybill!.temperatureRecords.length - 1;
          if (prev >= total) {
            setIsPlaying(false);
            return prev;
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
  }, [isPlaying, playbackSpeed, displayWaybill, setPlaybackIndex, setIsPlaying]);

  const handleWaybillChange = (id: string) => {
    setSelectedWaybill(id);
    setIsPlaying(false);
    setPlaybackIndex(0);
  };

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setIsPlaying(false);
    setPlaybackIndex(0);
  };

  if (!displayWaybill) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <p className="text-gray-500">请先导入运单数据</p>
      </div>
    );
  }

  const totalMinutes = displayWaybill.temperatureRecords.length - 1;
  const currentTime = dayjs(displayWaybill.departureTime)
    .add(playbackIndex, 'minute')
    .format('YYYY-MM-DD HH:mm:ss');

  const waybillsByRoute = routes.map((route) => ({
    route,
    waybills: waybills.filter((w) => w.route === route),
  }));

  const isVirtual = (displayWaybill as RouteVirtualWaybill).isVirtual;

  return (
    <div className="p-6 space-y-4 h-[calc(100vh-180px)] flex flex-col">
      {/* 顶部控制栏 */}
      <div className="bg-cold-surface/50 rounded-lg border border-cold-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 视角切换 */}
            <div className="flex bg-cold-bg rounded-lg border border-cold-border p-0.5">
              <button
                onClick={() => handleModeChange('waybill')}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'waybill'
                    ? 'bg-cold-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                单运单视角
              </button>
              <button
                onClick={() => handleModeChange('route')}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'route'
                    ? 'bg-cold-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                线路视角
              </button>
            </div>

            <div className="h-8 w-px bg-cold-border"></div>

            {viewMode === 'waybill' ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">当前运单</div>
                <select
                  value={displayWaybill.id}
                  onChange={(e) => handleWaybillChange(e.target.value)}
                  className="h-9 px-3 py-1 rounded text-sm bg-cold-bg border border-cold-border text-cold-accent font-mono font-bold focus:outline-none focus:border-cold-accent cursor-pointer"
                >
                  {waybillsByRoute.map((group) => (
                    <optgroup key={group.route} label={group.route}>
                      {group.waybills.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.id} · {w.driver} · {w.store}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-xs text-gray-500 mb-1">当前线路</div>
                <select
                  value={selectedRoute}
                  onChange={(e) => {
                    setSelectedRoute(e.target.value);
                    setPlaybackIndex(0);
                    setIsPlaying(false);
                  }}
                  className="h-9 px-3 py-1 rounded text-sm bg-cold-bg border border-cold-border text-cold-accent font-semibold focus:outline-none focus:border-cold-accent cursor-pointer"
                >
                  {routes.map((r) => (
                    <option key={r} value={r}>
                      {r} ({waybills.filter((w) => w.route === r).length} 车)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isVirtual && (
              <div className="flex items-center gap-2 text-xs text-cold-accent bg-cold-accent/10 px-2.5 py-1 rounded">
                <ChevronsRight className="w-3.5 h-3.5" />
                串起 {routeWaybills.length} 张运单
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">{isVirtual ? '司机组' : '司机'}</div>
                  <div className="text-sm text-gray-200 truncate max-w-[140px]">{displayWaybill.driver}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">货物</div>
                  <div className="text-sm text-gray-200 truncate max-w-[120px]">{displayWaybill.cargoType}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">{isVirtual ? '串联门店' : '门店'}</div>
                  <div className="text-sm text-gray-200 truncate max-w-[140px]">{displayWaybill.store}</div>
                </div>
              </div>
            </div>
            {displayWaybill.driftIncidents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-alert-red/10 border border-alert-red/30">
                <AlertTriangle className="w-4 h-4 text-alert-red" />
                <div>
                  <div className="text-xs text-gray-400">温漂事件</div>
                  <div className="text-sm font-bold text-alert-red">
                    {displayWaybill.driftIncidents.length} 次
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">承运商</div>
              <div className="text-sm text-gray-200">{displayWaybill.carrier}</div>
            </div>
          </div>
        </div>

        {isVirtual && currentSegmentInfo?.waybill && (
          <div className="mt-3 pt-3 border-t border-cold-border/50 flex items-center gap-3 text-xs">
            <span className="text-gray-500">当前段落:</span>
            <span className="px-2 py-0.5 rounded bg-cold-accent/10 text-cold-accent font-mono">
              {currentSegmentInfo.waybill.id}
            </span>
            <span className="text-gray-300">
              {currentSegmentInfo.waybill.driver} · {currentSegmentInfo.waybill.store}
            </span>
            <span className="text-gray-500 ml-auto">
              段内进度 {currentSegmentInfo.localIndex} /{' '}
              {currentSegmentInfo.waybill.temperatureRecords.length - 1}
            </span>
          </div>
        )}
      </div>

      {/* 主内容 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-9 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <RouteMap waybill={displayWaybill} currentIndex={playbackIndex} />
          </div>
          <div className="h-64">
            <TemperatureChart waybill={displayWaybill} currentIndex={playbackIndex} />
          </div>
        </div>

        <div className="col-span-3 min-h-0">
          <EventPanel waybill={displayWaybill} currentIndex={playbackIndex} />
        </div>
      </div>

      <PlaybackControls
        totalMinutes={totalMinutes}
        currentTime={currentTime}
        startTime={displayWaybill.departureTime}
      />
    </div>
  );
}
