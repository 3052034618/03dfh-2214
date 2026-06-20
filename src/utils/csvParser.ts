import Papa from 'papaparse';
import type { TemperatureRecord, GpsPoint, LoadingEvent, LoadingEventType } from '@/types';
import dayjs from 'dayjs';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  meta: {
    rowCount: number;
    validRowCount: number;
    startTime?: string;
    endTime?: string;
    headers?: string[];
  };
  errors: string[];
  warnings: string[];
}

interface CleanOptions {
  dedup?: boolean;
  removeOutliers?: boolean;
  minTemp?: number;
  maxTemp?: number;
}

async function parseCSVFile(file: File | string): Promise<{
  rows: any[];
  headers: string[];
  errors: string[];
  rawErrors: Papa.ParseError[];
}> {
  return new Promise((resolve) => {
    const allErrors: string[] = [];
    const rawErrors: Papa.ParseError[] = [];

    Papa.parse(file as any, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          rawErrors.push(...results.errors);
          results.errors.forEach((err: Papa.ParseError) => {
            if (err.code === 'TooFewFields' || err.code === 'TooManyFields') {
              allErrors.push(`第${err.row}行: 列数不匹配，可能存在格式错误`);
            } else if (err.code === 'FieldMismatch') {
              allErrors.push(`第${err.row}行: 字段数与表头不匹配`);
            } else if (err.code === 'MissingHeaders') {
              allErrors.push(`表头缺失: ${err.message}`);
            } else {
              allErrors.push(`解析错误: ${err.message} (行 ${err.row})`);
            }
          });
        }

        const rows = (results.data as any[]).filter((row) => {
          const values = Object.values(row);
          const hasAnyValue = values.some((v) => v !== null && v !== undefined && v !== '');
          return hasAnyValue;
        });

        const headers = results.meta.fields || [];
        resolve({ rows, headers, errors: allErrors, rawErrors });
      },
      error: (err) => {
        resolve({ rows: [], headers: [], errors: [`CSV解析失败: ${err.message}`], rawErrors: [] });
      },
    });
  });
}

function extractField(row: any, keys: string[]): any {
  const lowerKeys = keys.map((k) => k.toLowerCase());

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }

  for (const actualKey of Object.keys(row)) {
    const lowerActual = actualKey.toLowerCase().trim();
    if (lowerKeys.includes(lowerActual)) return row[actualKey];
    for (const lk of lowerKeys) {
      if (lowerActual.includes(lk) || lk.includes(lowerActual)) {
        if (row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
          return row[actualKey];
        }
      }
    }
  }

  return undefined;
}

function parseTimestamp(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().replace('T', ' ').substring(0, 19);
  }
  let str = String(value).trim();
  if (str.includes('/')) str = str.replace(/\//g, '-');
  if (str.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    str = str + ' 00:00:00';
  } else if (str.length === 16 && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(str)) {
    str = str + ':00';
  }
  const d = dayjs(str);
  if (d.isValid()) return d.format('YYYY-MM-DD HH:mm:ss');
  const d2 = dayjs(value);
  if (d2.isValid()) return d2.format('YYYY-MM-DD HH:mm:ss');
  return null;
}

function cleanTemperatureRecords(
  records: TemperatureRecord[],
  options: CleanOptions = {}
): { cleaned: TemperatureRecord[]; warnings: string[] } {
  const warnings: string[] = [];
  const {
    dedup = true,
    removeOutliers = true,
    minTemp = -40,
    maxTemp = 80,
  } = options;

  let cleaned = [...records];

  if (dedup) {
    const seen = new Map<string, TemperatureRecord>();
    let dupCount = 0;
    cleaned.forEach((r) => {
      const key = r.timestamp;
      if (seen.has(key)) {
        dupCount++;
        const existing = seen.get(key)!;
        if (r.temperature !== undefined && existing.temperature === undefined) {
          seen.set(key, r);
        }
      } else {
        seen.set(key, r);
      }
    });
    cleaned = Array.from(seen.values());
    if (dupCount > 0) {
      warnings.push(`发现 ${dupCount} 条重复时间点，已去重保留最新有效数据`);
    }
  }

  if (removeOutliers) {
    const before = cleaned.length;
    cleaned = cleaned.filter((r) => {
      if (r.temperature < minTemp || r.temperature > maxTemp) {
        warnings.push(
          `异常温度值 ${r.temperature}°C (时间 ${r.timestamp}) 已剔除，超出合理范围 [${minTemp}°C, ${maxTemp}°C]`
        );
        return false;
      }
      return true;
    });
    const removed = before - cleaned.length;
    if (removed > 0) {
      warnings.push(`共剔除 ${removed} 条温度异常值`);
    }
  }

  cleaned.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const timeGaps: string[] = [];
  for (let i = 1; i < cleaned.length; i++) {
    const diff =
      (new Date(cleaned[i].timestamp).getTime() - new Date(cleaned[i - 1].timestamp).getTime()) /
      60000;
    if (diff > 30) {
      timeGaps.push(
        `${cleaned[i - 1].timestamp} 至 ${cleaned[i].timestamp} 间隔 ${Math.round(diff)} 分钟`
      );
    }
  }
  if (timeGaps.length > 0) {
    warnings.push(`存在 ${timeGaps.length} 处时间间隔 > 30 分钟: ${timeGaps.slice(0, 3).join('; ')}${timeGaps.length > 3 ? '...' : ''}`);
  }

  return { cleaned, warnings };
}

function cleanGpsPoints(
  points: GpsPoint[],
  options: CleanOptions = {}
): { cleaned: GpsPoint[]; warnings: string[] } {
  const warnings: string[] = [];
  const { dedup = true } = options;

  let cleaned = [...points];

  if (dedup) {
    const seen = new Map<string, GpsPoint>();
    let dupCount = 0;
    cleaned.forEach((p) => {
      const key = p.timestamp;
      if (seen.has(key)) dupCount++;
      else seen.set(key, p);
    });
    cleaned = Array.from(seen.values());
    if (dupCount > 0) {
      warnings.push(`GPS发现 ${dupCount} 条重复时间点，已去重`);
    }
  }

  const before = cleaned.length;
  cleaned = cleaned.filter((p) => {
    if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
      warnings.push(`GPS坐标异常 (${p.lng}, ${p.lat}) 时间 ${p.timestamp} 已剔除`);
      return false;
    }
    return true;
  });
  if (before - cleaned.length > 0) {
    warnings.push(`共剔除 ${before - cleaned.length} 条GPS坐标异常值`);
  }

  cleaned.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { cleaned, warnings };
}

export async function parseTemperatureCSV(file: File | string): Promise<ParseResult<TemperatureRecord>> {
  const { rows, headers, errors } = await parseCSVFile(file);
  const allWarnings: string[] = [];
  const parseErrors: string[] = [...errors];

  if (headers.length === 0) {
    return {
      success: false,
      data: [],
      meta: { rowCount: 0, validRowCount: 0, headers },
      errors: ['无法识别CSV表头，请检查文件格式'],
      warnings: [],
    };
  }

  const tempKeys = ['temperature', 'temp', '温度', '冷藏温度', '车厢温度', '箱温'];
  const timeKeys = ['timestamp', 'time', '时间', '采集时间', '记录时间', '上报时间'];
  const humKeys = ['humidity', 'hum', '湿度', '箱湿'];

  const hasTempKey = headers.some(
    (h) => tempKeys.some((k) => h.toLowerCase().includes(k.toLowerCase()))
  );
  const hasTimeKey = headers.some(
    (h) => timeKeys.some((k) => h.toLowerCase().includes(k.toLowerCase()))
  );

  if (!hasTempKey) {
    parseErrors.push(`未找到温度列，识别表头: [${headers.join(', ')}]`);
  }
  if (!hasTimeKey) {
    parseErrors.push(`未找到时间列，识别表头: [${headers.join(', ')}]`);
  }

  const rawRecords: TemperatureRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const timestamp = extractField(row, timeKeys);
      const temp = extractField(row, tempKeys);
      const humidity = extractField(row, humKeys);

      if (!timestamp) {
        if (i < 5) allWarnings.push(`第${i + 2}行: 缺失时间，已跳过`);
        continue;
      }
      if (temp === undefined || temp === null) {
        if (i < 5) allWarnings.push(`第${i + 2}行: 缺失温度值，已跳过`);
        continue;
      }

      const parsedTime = parseTimestamp(timestamp);
      if (!parsedTime) {
        if (i < 5) allWarnings.push(`第${i + 2}行: 时间格式无法解析 [${String(timestamp)}]，已跳过`);
        continue;
      }

      const tempNum = typeof temp === 'number' ? temp : parseFloat(String(temp));
      if (isNaN(tempNum)) {
        if (i < 5) allWarnings.push(`第${i + 2}行: 温度值 [${temp}] 非数字，已跳过`);
        continue;
      }

      rawRecords.push({
        timestamp: parsedTime,
        temperature: Math.round(tempNum * 10) / 10,
        humidity:
          humidity !== undefined && humidity !== null && !isNaN(parseFloat(String(humidity)))
            ? Math.round(parseFloat(String(humidity)) * 10) / 10
            : undefined,
      });
    } catch (e) {
      parseErrors.push(`第${i + 2}行解析异常: ${(e as Error).message}`);
    }
  }

  const { cleaned, warnings: cleanWarnings } = cleanTemperatureRecords(rawRecords);
  allWarnings.push(...cleanWarnings);

  if (rawRecords.length === 0) {
    parseErrors.push('未解析到任何有效温度记录，请检查文件内容');
  }

  if (allWarnings.length > 5) {
    const extra = allWarnings.length - 5;
    allWarnings.splice(5, allWarnings.length - 5, `...还有 ${extra} 条警告`);
  }

  return {
    success: cleaned.length > 5,
    data: cleaned,
    meta: {
      rowCount: rows.length,
      validRowCount: cleaned.length,
      startTime: cleaned[0]?.timestamp,
      endTime: cleaned[cleaned.length - 1]?.timestamp,
      headers,
    },
    errors: parseErrors,
    warnings: allWarnings,
  };
}

export async function parseGpsCSV(file: File | string): Promise<ParseResult<GpsPoint>> {
  const { rows, headers, errors } = await parseCSVFile(file);
  const allWarnings: string[] = [];
  const parseErrors: string[] = [...errors];

  const latKeys = ['lat', 'latitude', '纬度', 'gps_lat', 'y坐标'];
  const lngKeys = ['lng', 'lon', 'longitude', '经度', 'gps_lng', 'x坐标'];
  const timeKeys = ['timestamp', 'time', '时间', '采集时间', '上报时间'];
  const speedKeys = ['speed', '速度', '车速'];
  const locKeys = ['location', 'address', '位置', '地点', '位置描述'];

  const hasLat = headers.some((h) => latKeys.some((k) => h.toLowerCase().includes(k.toLowerCase())));
  const hasLng = headers.some((h) => lngKeys.some((k) => h.toLowerCase().includes(k.toLowerCase())));
  if (!hasLat) parseErrors.push(`未找到纬度列，识别表头: [${headers.join(', ')}]`);
  if (!hasLng) parseErrors.push(`未找到经度列，识别表头: [${headers.join(', ')}]`);

  const rawPoints: GpsPoint[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const timestamp = extractField(row, timeKeys);
      const lat = extractField(row, latKeys);
      const lng = extractField(row, lngKeys);
      const speed = extractField(row, speedKeys);
      const location = extractField(row, locKeys);
      const x = extractField(row, ['x', 'map_x', 'coord_x', 'svgx']);
      const y = extractField(row, ['y', 'map_y', 'coord_y', 'svgy']);

      if (!timestamp || lat === undefined || lng === undefined) continue;

      const parsedTime = parseTimestamp(timestamp);
      const latNum = parseFloat(String(lat));
      const lngNum = parseFloat(String(lng));
      if (!parsedTime || isNaN(latNum) || isNaN(lngNum)) {
        if (i < 3) allWarnings.push(`第${i + 2}行: GPS数据格式异常，已跳过`);
        continue;
      }

      const xNum = x !== undefined && x !== null ? parseFloat(String(x)) : lngToSvgX(lngNum);
      const yNum = y !== undefined && y !== null ? parseFloat(String(y)) : latToSvgY(latNum);

      rawPoints.push({
        timestamp: parsedTime,
        lat: latNum,
        lng: lngNum,
        speed:
          speed !== undefined && speed !== null ? Math.round(parseFloat(String(speed)) * 10) / 10 : 0,
        locationName: String(location || '途径点'),
        x: Math.round(xNum * 10) / 10,
        y: Math.round(yNum * 10) / 10,
      });
    } catch (e) {
      if (i < 5) parseErrors.push(`第${i + 2}行GPS解析异常: ${(e as Error).message}`);
    }
  }

  const { cleaned, warnings: cleanWarnings } = cleanGpsPoints(rawPoints);
  allWarnings.push(...cleanWarnings);

  if (allWarnings.length > 5) {
    const extra = allWarnings.length - 5;
    allWarnings.splice(5, allWarnings.length - 5, `...还有 ${extra} 条警告`);
  }

  return {
    success: cleaned.length > 5,
    data: cleaned,
    meta: {
      rowCount: rows.length,
      validRowCount: cleaned.length,
      startTime: cleaned[0]?.timestamp,
      endTime: cleaned[cleaned.length - 1]?.timestamp,
      headers,
    },
    errors: parseErrors,
    warnings: allWarnings,
  };
}

export async function parseLoadingCSV(file: File | string): Promise<ParseResult<LoadingEvent>> {
  const { rows, headers, errors } = await parseCSVFile(file);
  const allWarnings: string[] = [];
  const parseErrors: string[] = [...errors];

  const typeKeys = ['type', 'event_type', '类型', '事件类型', '操作类型'];
  const startKeys = ['start_time', 'start', '开始时间', '装货开始', '卸货开始'];
  const endKeys = ['end_time', 'end', '结束时间', '装货结束', '卸货结束'];
  const locKeys = ['location', '地点', '位置', '仓库', '门店'];
  const durKeys = ['duration', 'duration_min', '时长', '持续分钟', '耗时'];

  const rawEvents: LoadingEvent[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const type = extractField(row, typeKeys);
      const startTime = extractField(row, startKeys);
      const endTime = extractField(row, endKeys);
      const location = extractField(row, locKeys);
      const duration = extractField(row, durKeys);

      if (!startTime || !endTime) continue;

      const parsedStart = parseTimestamp(String(startTime));
      const parsedEnd = parseTimestamp(String(endTime));
      if (!parsedStart || !parsedEnd) continue;

      const typeMap: Record<string, LoadingEventType> = {
        loading: 'loading',
        装货: 'loading',
        装车: 'loading',
        loading_start: 'loading',
        unloading: 'unloading',
        卸货: 'unloading',
        卸车: 'unloading',
        unloading_start: 'unloading',
        waiting: 'waiting',
        等待: 'waiting',
        等候: 'waiting',
        queue: 'queue',
        排队: 'queue',
        排队等候: 'queue',
      };

      let eventType: LoadingEventType = 'loading';
      if (type) {
        const lowerType = String(type).toLowerCase().trim();
        eventType = typeMap[lowerType] || typeMap[type as keyof typeof typeMap] || 'loading';
        if (!typeMap[lowerType] && !typeMap[type as keyof typeof typeMap]) {
          if (String(type).includes('装')) eventType = 'loading';
          else if (String(type).includes('卸')) eventType = 'unloading';
          else if (String(type).includes('等') || String(type).includes('wait')) eventType = 'waiting';
          else if (String(type).includes('排') || String(type).includes('queue')) eventType = 'queue';
        }
      }

      const durationMin =
        duration !== undefined && duration !== null
          ? parseInt(String(duration))
          : Math.max(1, dayjs(parsedEnd).diff(dayjs(parsedStart), 'minute'));

      rawEvents.push({
        type: eventType,
        startTime: parsedStart,
        endTime: parsedEnd,
        location: String(location || '装卸点'),
        durationMin,
      });
    } catch (e) {
      if (i < 5) parseErrors.push(`第${i + 2}行装卸解析异常: ${(e as Error).message}`);
    }
  }

  rawEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (rawEvents.length === 0) {
    allWarnings.push('未解析到装卸记录，后续分析将使用温度与GPS推断关键节点');
  }

  return {
    success: rawEvents.length > 0,
    data: rawEvents,
    meta: {
      rowCount: rows.length,
      validRowCount: rawEvents.length,
      headers,
    },
    errors: parseErrors,
    warnings: allWarnings,
  };
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
