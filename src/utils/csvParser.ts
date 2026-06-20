import Papa from 'papaparse';
import type { TemperatureRecord, GpsPoint, LoadingEvent, LoadingEventType } from '@/types';
import dayjs from 'dayjs';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  meta: { rowCount: number; startTime?: string; endTime?: string };
  errors: string[];
}

export async function parseTemperatureCSV(file: File | string): Promise<ParseResult<TemperatureRecord>> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const text = typeof file === 'string' ? file : undefined;

    Papa.parse(file as any, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const records: TemperatureRecord[] = [];
        for (const row of results.data as any[]) {
          try {
            const timestamp = extractField(row, ['timestamp', 'time', '时间', '采集时间', '记录时间']);
            const temp = extractField(row, ['temperature', 'temp', '温度', '冷藏温度', '车厢温度']);
            const humidity = extractField(row, ['humidity', 'hum', '湿度']);

            if (!timestamp || temp === undefined || temp === null) continue;

            const parsedTime = parseTimestamp(timestamp);
            if (!parsedTime) continue;

            const tempNum = typeof temp === 'number' ? temp : parseFloat(String(temp));
            if (isNaN(tempNum)) continue;

            records.push({
              timestamp: parsedTime,
              temperature: Math.round(tempNum * 10) / 10,
              humidity: humidity !== undefined && humidity !== null && !isNaN(parseFloat(String(humidity)))
                ? Math.round(parseFloat(String(humidity)) * 10) / 10
                : undefined,
            });
          } catch (e) {
            errors.push(`行解析错误: ${JSON.stringify(row).substring(0, 50)}`);
          }
        }

        records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        resolve({
          success: records.length > 0,
          data: records,
          meta: {
            rowCount: records.length,
            startTime: records[0]?.timestamp,
            endTime: records[records.length - 1]?.timestamp,
          },
          errors,
        });
      },
      error: (err) => {
        resolve({ success: false, data: [], meta: { rowCount: 0 }, errors: [err.message] });
      },
    });
  });
}

export async function parseGpsCSV(file: File | string): Promise<ParseResult<GpsPoint>> {
  return new Promise((resolve) => {
    const errors: string[] = [];

    Papa.parse(file as any, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const points: GpsPoint[] = [];
        for (const row of results.data as any[]) {
          try {
            const timestamp = extractField(row, ['timestamp', 'time', '时间', '采集时间']);
            const lat = extractField(row, ['lat', 'latitude', '纬度', 'gps_lat']);
            const lng = extractField(row, ['lng', 'lon', 'longitude', '经度', 'gps_lng']);
            const speed = extractField(row, ['speed', '速度', '车速']);
            const location = extractField(row, ['location', 'address', '位置', '地点']);
            const x = extractField(row, ['x', 'map_x', 'coord_x']);
            const y = extractField(row, ['y', 'map_y', 'coord_y']);

            if (!timestamp || lat === undefined || lng === undefined) continue;

            const parsedTime = parseTimestamp(timestamp);
            const latNum = parseFloat(String(lat));
            const lngNum = parseFloat(String(lng));
            if (!parsedTime || isNaN(latNum) || isNaN(lngNum)) continue;

            const xNum = x !== undefined && x !== null ? parseFloat(String(x)) : lngToSvgX(lngNum);
            const yNum = y !== undefined && y !== null ? parseFloat(String(y)) : latToSvgY(latNum);

            points.push({
              timestamp: parsedTime,
              lat: latNum,
              lng: lngNum,
              speed: speed !== undefined && speed !== null ? Math.round(parseFloat(String(speed)) * 10) / 10 : 0,
              locationName: String(location || '途径点'),
              x: Math.round(xNum * 10) / 10,
              y: Math.round(yNum * 10) / 10,
            });
          } catch (e) {
            errors.push(`GPS 行解析错误`);
          }
        }

        points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        resolve({
          success: points.length > 0,
          data: points,
          meta: {
            rowCount: points.length,
            startTime: points[0]?.timestamp,
            endTime: points[points.length - 1]?.timestamp,
          },
          errors,
        });
      },
      error: (err) => {
        resolve({ success: false, data: [], meta: { rowCount: 0 }, errors: [err.message] });
      },
    });
  });
}

export async function parseLoadingCSV(file: File | string): Promise<ParseResult<LoadingEvent>> {
  return new Promise((resolve) => {
    const errors: string[] = [];

    Papa.parse(file as any, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const events: LoadingEvent[] = [];
        for (const row of results.data as any[]) {
          try {
            const type = extractField(row, ['type', 'event_type', '类型', '事件类型']);
            const startTime = extractField(row, ['start_time', 'start', '开始时间', '装货开始', '卸货开始']);
            const endTime = extractField(row, ['end_time', 'end', '结束时间', '装货结束', '卸货结束']);
            const location = extractField(row, ['location', '地点', '位置']);
            const duration = extractField(row, ['duration', 'duration_min', '时长', '持续分钟']);

            if (!startTime || !endTime) continue;

            const parsedStart = parseTimestamp(String(startTime));
            const parsedEnd = parseTimestamp(String(endTime));
            if (!parsedStart || !parsedEnd) continue;

            const typeMap: Record<string, LoadingEventType> = {
              loading: 'loading', 装货: 'loading',
              unloading: 'unloading', 卸货: 'unloading',
              waiting: 'waiting', 等待: 'waiting',
              queue: 'queue', 排队: 'queue',
            };
            const eventType = typeMap[String(type || 'loading')?.toLowerCase()] ||
              (String(type).includes('装') ? 'loading' : String(type).includes('卸') ? 'unloading' : 'loading');

            const durationMin = duration !== undefined && duration !== null
              ? parseInt(String(duration))
              : dayjs(parsedEnd).diff(dayjs(parsedStart), 'minute');

            events.push({
              type: eventType,
              startTime: parsedStart,
              endTime: parsedEnd,
              location: String(location || '装卸点'),
              durationMin,
            });
          } catch (e) {
            errors.push(`装卸行解析错误`);
          }
        }

        events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        resolve({
          success: events.length > 0,
          data: events,
          meta: { rowCount: events.length },
          errors,
        });
      },
      error: (err) => {
        resolve({ success: false, data: [], meta: { rowCount: 0 }, errors: [err.message] });
      },
    });
  });
}

function extractField(row: any, keys: string[]): any {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    const lowerKey = key.toLowerCase();
    for (const actualKey of Object.keys(row)) {
      if (actualKey.toLowerCase() === lowerKey) return row[actualKey];
    }
  }
  return undefined;
}

function parseTimestamp(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().replace('T', ' ').substring(0, 19);
  }
  const str = String(value).trim();
  const d = dayjs(str);
  if (d.isValid()) return d.format('YYYY-MM-DD HH:mm:ss');
  return null;
}

function lngToSvgX(lng: number): number {
  const normalized = lng - 114;
  return 50 + normalized * 7500;
}

function latToSvgY(lat: number): number {
  const normalized = 31 - lat;
  return 200 + normalized * 10000;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
