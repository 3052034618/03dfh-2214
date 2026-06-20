import { useMemo } from 'react';
import { useWaybillStore } from '@/store/useWaybillStore';
import { MapPin, Coffee, AlertTriangle, Package, Clock } from 'lucide-react';
import type { Waybill } from '@/types';
import { renderToStaticMarkup } from 'react-dom/server';

interface RouteMapProps {
  waybill: Waybill;
  currentIndex: number;
}

export default function RouteMap({ waybill, currentIndex }: RouteMapProps) {
  const points = waybill.gpsPoints;
  const currentPoint = points[Math.min(currentIndex, points.length - 1)];

  const routeData = useMemo(() => {
    if (points.length === 0) return { pathD: '', minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - 30;
    const maxX = Math.max(...xs) + 30;
    const minY = Math.min(...ys) - 30;
    const maxY = Math.max(...ys) + 30;

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { pathD, minX, maxX, minY, maxY };
  }, [points]);

  const progressPath = useMemo(() => {
    if (points.length === 0 || currentIndex <= 0) return '';
    const current = Math.min(currentIndex, points.length - 1);
    return points
      .slice(0, current + 1)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }, [points, currentIndex]);

  const keyPointPositions = useMemo(() => {
    const positions: { x: number; y: number; type: string; label: string }[] = [];

    waybill.loadingEvents.forEach((event) => {
      const time = new Date(event.startTime).getTime();
      const nearestPoint = points.reduce((nearest, p) => {
        const diff = Math.abs(new Date(p.timestamp).getTime() - time);
        const nearestDiff = Math.abs(new Date(nearest.timestamp).getTime() - time);
        return diff < nearestDiff ? p : nearest;
      }, points[0]);

      if (event.type === 'loading') {
        positions.push({ x: nearestPoint.x, y: nearestPoint.y, type: 'loading', label: event.location });
      } else if (event.type === 'unloading') {
        positions.push({ x: nearestPoint.x, y: nearestPoint.y, type: 'unloading', label: event.location });
      } else if (event.type === 'waiting' || event.type === 'queue') {
        positions.push({ x: nearestPoint.x, y: nearestPoint.y, type: 'waiting', label: `${event.location} ${event.durationMin}分` });
      }
    });

    waybill.tripEvents.forEach((event) => {
      const idx = Math.min(event.positionIndex, points.length - 1);
      const point = points[idx] || points[0];
      const type = event.type === 'service_area' ? 'service' : event.type === 'parking' ? 'parking' : 'other';
      positions.push({ x: point.x, y: point.y, type, label: event.description.substring(0, 12) });
    });

    waybill.driftIncidents.forEach((incident) => {
      const idx = Math.min(incident.startIndex, points.length - 1);
      const point = points[idx] || points[0];
      positions.push({ x: point.x, y: point.y, type: 'drift', label: `超温${incident.durationMin}分` });
    });

    return positions;
  }, [waybill, points]);

  const viewWidth = routeData.maxX - routeData.minX;
  const viewHeight = routeData.maxY - routeData.minY;

  return (
    <div className="bg-cold-bg/80 rounded-lg border border-cold-border overflow-hidden h-full">
      <div className="px-4 py-2.5 border-b border-cold-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cold-accent" />
          <span className="text-sm font-semibold text-gray-200">运输路线</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-mono">{waybill.distanceKm} km</span>
          <span className="mx-2 text-gray-600">·</span>
          <span>{waybill.route}</span>
        </div>
      </div>

      <div className="relative p-2 h-[calc(100%-44px)]">
        <svg
          viewBox={`${routeData.minX} ${routeData.minY} ${viewWidth} ${viewHeight}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 背景网格 */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(30,58,95,0.3)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B5E7A" />
              <stop offset="100%" stopColor="#3D8FB0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x={routeData.minX} y={routeData.minY} width={viewWidth} height={viewHeight} fill="url(#grid)" />

          {/* 完整路线（底色） */}
          <path
            d={routeData.pathD}
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 已行驶路线 */}
          <path
            d={progressPath}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* 关键节点标记 */}
          {keyPointPositions.map((pos, idx) => {
            const colors: Record<string, string> = {
              loading: '#56B8DC',
              unloading: '#2A9D8F',
              waiting: '#F4A261',
              service: '#3D8FB0',
              parking: '#F4A261',
              drift: '#E63946',
              other: '#888',
            };
            return (
              <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r="7" fill={colors[pos.type] || '#888'} stroke="#0A1929" strokeWidth="2" />
                <text y="-12" textAnchor="middle" fill="#CBD5E1" fontSize="10" className="font-sans">
                  {pos.label}
                </text>
              </g>
            );
          })}

          {/* 起点 */}
          {points.length > 0 && (
            <g transform={`translate(${points[0].x}, ${points[0].y})`}>
              <circle r="8" fill="#2A9D8F" stroke="#0A1929" strokeWidth="2" />
              <text y="-12" textAnchor="middle" fill="#2A9D8F" fontSize="10" fontWeight="bold">
                起点
              </text>
            </g>
          )}

          {/* 终点 */}
          {points.length > 0 && (
            <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
              <circle r="8" fill="#E63946" stroke="#0A1929" strokeWidth="2" />
              <text y="-12" textAnchor="middle" fill="#E63946" fontSize="10" fontWeight="bold">
                终点
              </text>
            </g>
          )}

          {/* 当前车辆位置 - 脉冲动画 */}
          {currentPoint && (
            <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
              <circle r="14" fill="rgba(86, 184, 220, 0.3)">
                <animate attributeName="r" values="10;20;10" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#56B8DC" stroke="#fff" strokeWidth="2" filter="url(#glow)" />
            </g>
          )}
        </svg>

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-cold-surface/90 backdrop-blur-sm rounded-lg p-2 border border-cold-border text-xs">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-cold-accent"></div>
              <span>当前位置</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-alert-red"></div>
              <span>温漂点</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-warning-amber"></div>
              <span>停车/等待</span>
            </div>
          </div>
        </div>

        {/* 当前位置信息 */}
        {currentPoint && (
          <div className="absolute top-4 right-4 bg-cold-surface/90 backdrop-blur-sm rounded-lg p-2.5 border border-cold-border text-xs min-w-[140px]">
            <div className="text-gray-400 mb-1">当前位置</div>
            <div className="text-gray-200 font-medium">{currentPoint.locationName}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-gray-500">速度</span>
              <span className="font-mono text-cold-accent">{currentPoint.speed} km/h</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
