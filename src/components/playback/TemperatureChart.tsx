import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { useWaybillStore } from '@/store/useWaybillStore';
import dayjs from 'dayjs';
import type { Waybill } from '@/types';

interface TemperatureChartProps {
  waybill: Waybill;
  currentIndex: number;
}

export default function TemperatureChart({ waybill, currentIndex }: TemperatureChartProps) {
  const chartData = useMemo(() => {
    return waybill.temperatureRecords
      .filter((_, i) => i % 5 === 0 || i === waybill.temperatureRecords.length - 1)
      .map((record, idx) => {
        const realIndex = idx * 5;
        const isDrift = waybill.driftIncidents.some(
          (inc) => realIndex >= inc.startIndex && realIndex <= inc.endIndex
        );
        return {
          time: dayjs(record.timestamp).format('HH:mm'),
          temperature: record.temperature,
          index: realIndex,
          isDrift,
          display: isDrift ? record.temperature : null,
        };
      });
  }, [waybill]);

  const visibleData = useMemo(() => {
    return chartData.filter((d) => d.index <= currentIndex);
  }, [chartData, currentIndex]);

  const currentTemp = useMemo(() => {
    const realIdx = Math.min(currentIndex, waybill.temperatureRecords.length - 1);
    return waybill.temperatureRecords[realIdx]?.temperature ?? 0;
  }, [waybill, currentIndex]);

  const tempColor = useMemo(() => {
    const diff = currentTemp - waybill.tempThreshold;
    if (diff > 2) return '#E63946';
    if (diff > 0) return '#F4A261';
    return '#4CC9F0';
  }, [currentTemp, waybill.tempThreshold]);

  const minTemp = Math.min(...waybill.temperatureRecords.map((r) => r.temperature)) - 2;
  const maxTemp = Math.max(...waybill.temperatureRecords.map((r) => r.temperature)) + 2;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-cold-surface/95 border border-cold-border rounded-lg px-3 py-2 text-sm shadow-xl">
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className="font-mono text-lg" style={{ color: data.isDrift ? '#E63946' : '#4CC9F0' }}>
            {data.temperature.toFixed(1)}℃
          </p>
          {data.isDrift && (
            <p className="text-xs text-alert-red mt-0.5">⚠ 超温</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-cold-bg/80 rounded-lg border border-cold-border overflow-hidden h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-cold-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cold-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-200">温度变化曲线</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">当前温度</p>
            <p className="font-mono text-xl font-bold" style={{ color: tempColor }}>
              {currentTemp.toFixed(1)}℃
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">阈值</p>
            <p className="font-mono text-sm text-gray-300">{waybill.tempThreshold}℃</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CC9F0" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4CC9F0" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E63946" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#E63946" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
            <XAxis
              dataKey="time"
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1E3A5F' }}
            />
            <YAxis
              domain={[minTemp, maxTemp]}
              stroke="#64748B"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1E3A5F' }}
              tickFormatter={(v) => `${v}℃`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 温度区域 */}
            <Area
              type="monotone"
              dataKey="temperature"
              stroke="none"
              fill="url(#tempGradient)"
            />

            {/* 超温区域红色覆盖 */}
            <Area
              type="monotone"
              dataKey="display"
              stroke="none"
              fill="url(#driftGradient)"
            />

            {/* 温度线 */}
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#4CC9F0"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#56B8DC', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* 阈值线 */}
            <ReferenceLine
              y={waybill.tempThreshold}
              stroke="#F4A261"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `阈值 ${waybill.tempThreshold}℃`,
                position: 'insideTopRight',
                fill: '#F4A261',
                fontSize: 11,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
