import type {
  Waybill,
  TemperatureRecord,
  GpsPoint,
  LoadingEvent,
  TripEvent,
  DriftIncident,
  ResponsibleStage,
} from '@/types';
import dayjs from 'dayjs';

export interface WaybillBuildInput {
  waybillId: string;
  tempRecords: TemperatureRecord[];
  gpsPoints: GpsPoint[];
  loadingEvents: LoadingEvent[];
  route?: string;
  carrier?: string;
  driver?: string;
  store?: string;
  cargoType?: string;
  tempThreshold?: number;
}

const routePatterns: Record<string, { keyword: string; route: string; carrier: string; store: string }[]> = {
  '武汉-宜昌线': [
    { keyword: '宜昌', route: '武汉-宜昌线', carrier: '顺丰冷链', store: '万达广场店' },
  ],
  '武汉-黄石线': [
    { keyword: '黄石', route: '武汉-黄石线', carrier: '京东冷链', store: '黄石旗舰店' },
  ],
  '武汉-咸宁线': [
    { keyword: '咸宁', route: '武汉-咸宁线', carrier: '顺丰冷链', store: '咸宁中心店' },
  ],
};

const driversPool = ['张建国', '李明辉', '王志强', '刘大勇', '赵春雷', '孙海波'];
const cargoPool = ['速冻食品', '生鲜蔬菜', '乳制品', '肉类', '冷饮'];
const carriersPool = ['顺丰冷链', '京东冷链', '圆通冷链', '中通冷链'];

export function buildWaybill(input: WaybillBuildInput): Waybill {
  const { waybillId, tempRecords, gpsPoints, loadingEvents } = input;

  let route = input.route || '';
  let carrier = input.carrier || '';
  let store = input.store || '';
  let driver = input.driver || '';
  let cargoType = input.cargoType || '';
  let tempThreshold = input.tempThreshold;

  const sampleLocation = gpsPoints[0]?.locationName + ' ' + gpsPoints[gpsPoints.length - 1]?.locationName;

  for (const [, patterns] of Object.entries(routePatterns)) {
    for (const p of patterns) {
      if (sampleLocation.includes(p.keyword) || waybillId.includes(p.keyword)) {
        if (!route) route = p.route;
        if (!carrier) carrier = p.carrier;
        if (!store) store = p.store;
      }
    }
  }

  if (!route) route = '武汉-城际线';
  if (!carrier) carrier = carriersPool[Math.floor(Math.random() * carriersPool.length)];
  if (!store) store = '配送中心店';
  if (!driver) driver = driversPool[Math.floor(Math.random() * driversPool.length)];
  if (!cargoType) cargoType = cargoPool[Math.floor(Math.random() * cargoPool.length)];
  if (tempThreshold === undefined || tempThreshold === null) {
    if (cargoType === '速冻食品' || cargoType === '肉类' || cargoType === '冷饮') tempThreshold = -18;
    else if (cargoType === '乳制品') tempThreshold = 6;
    else tempThreshold = 4;
  }

  const startTime = tempRecords[0]?.timestamp || gpsPoints[0]?.timestamp || new Date().toISOString();
  const endTime =
    tempRecords[tempRecords.length - 1]?.timestamp ||
    gpsPoints[gpsPoints.length - 1]?.timestamp ||
    new Date().toISOString();

  const distanceKm = Math.round(calculateDistance(gpsPoints) * 10) / 10 || 150 + Math.random() * 200;
  const vehiclePlate = `鄂A·${String(Math.floor(1000 + Math.random() * 9000))}冷`;

  const { tripEvents, driftIncidents } = analyzeTemperatureAndEvents(
    tempRecords,
    gpsPoints,
    loadingEvents,
    tempThreshold,
    waybillId,
    startTime
  );

  let status: Waybill['status'] = 'normal';
  if (driftIncidents.length > 0) {
    const hasAlert = driftIncidents.some(
      (d) => d.maxTemp - tempThreshold > 2 || d.durationMin > 40
    );
    status = hasAlert ? 'alert' : 'warning';
  }

  return {
    id: waybillId,
    driver,
    route,
    carrier,
    store,
    cargoType,
    departureTime: startTime,
    arrivalTime: endTime,
    tempThreshold,
    status,
    temperatureRecords: tempRecords,
    gpsPoints: normalizeGpsCoords(gpsPoints),
    loadingEvents,
    tripEvents,
    driftIncidents,
    distanceKm,
    vehiclePlate,
  };
}

function calculateDistance(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const R = 6371;
    const dLat = ((points[i].lat - points[i - 1].lat) * Math.PI) / 180;
    const dLng = ((points[i].lng - points[i - 1].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((points[i - 1].lat * Math.PI) / 180) *
        Math.cos((points[i].lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

function normalizeGpsCoords(points: GpsPoint[]): GpsPoint[] {
  if (points.length === 0) return [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = 700 / rangeX;
  const scaleY = 300 / rangeY;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = 60 + (800 - 120 - rangeX * scale) / 2;
  const offsetY = 50 + (400 - 100 - rangeY * scale) / 2;

  return points.map((p) => ({
    ...p,
    x: Math.round((p.x - minX) * scale + offsetX) * 10 / 10,
    y: Math.round((p.y - minY) * scale + offsetY) * 10 / 10,
  }));
}

function analyzeTemperatureAndEvents(
  tempRecords: TemperatureRecord[],
  gpsPoints: GpsPoint[],
  loadingEvents: LoadingEvent[],
  threshold: number,
  waybillId: string,
  startTime: string
): { tripEvents: TripEvent[]; driftIncidents: DriftIncident[] } {
  const tripEvents: TripEvent[] = [];
  const driftIncidents: DriftIncident[] = [];
  const total = tempRecords.length;

  if (total === 0) return { tripEvents, driftIncidents };

  let tripCounter = 0;
  const makeTripId = () => `evt_${waybillId}_${++tripCounter}`;

  let driftCounter = 0;
  const makeDriftId = () => `drift_${waybillId}_${++driftCounter}`;

  let i = 0;
  while (i < total) {
    if (tempRecords[i].temperature > threshold + 0.5) {
      let j = i;
      while (j < total && tempRecords[j].temperature > threshold + 0.2) {
        j++;
      }
      const durationMin = j - i;
      if (durationMin >= 5) {
        const segment = tempRecords.slice(i, j);
        const maxTemp = Math.max(...segment.map((t) => t.temperature));
        const avgTemp =
          segment.reduce((s, t) => s + t.temperature, 0) / segment.length;

        const progress = i / total;
        let responsibleStage: ResponsibleStage = '其他';
        let suggestion = '建议核查冷链设备状态，排查温控异常原因';

        if (progress < 0.25) {
          responsibleStage = '装货等待';
          suggestion = '装货阶段温控异常，建议检查装货月台预冷、装车效率、车厢门开启时长';
        } else if (progress > 0.75) {
          responsibleStage = '临近卸货排队';
          suggestion = '临近目的地温度超标，建议优化卸货预约机制、减少排队等待、必要时启用备电制冷';
        } else {
          const nearParking = detectNearbyParking(gpsPoints, i, total);
          if (nearParking) {
            responsibleStage = '途中停车';
            suggestion = '途中停车引发温度回升，建议控制停车时长，长时间停靠需启用备用制冷或移至阴凉区域';
          }
        }

        driftIncidents.push({
          id: makeDriftId(),
          waybillId,
          startTime: tempRecords[i].timestamp,
          endTime: tempRecords[j - 1].timestamp,
          durationMin,
          maxTemp: Math.round(maxTemp * 10) / 10,
          avgTemp: Math.round(avgTemp * 10) / 10,
          responsibleStage,
          suggestion,
          startIndex: i,
          endIndex: j - 1,
        });

        if (responsibleStage === '途中停车' || progress > 0.2 && progress < 0.8) {
          const gpsIdx = Math.floor((i / total) * gpsPoints.length);
          const gpsPoint = gpsPoints[gpsIdx];
          const tempBefore = tempRecords[Math.max(0, i - 1)]?.temperature || threshold;
          const tempAfter = maxTemp;
          tripEvents.push({
            id: makeTripId(),
            timestamp: tempRecords[i].timestamp,
            type: progress > 0.35 && progress < 0.55 ? 'service_area' : 'parking',
            description: progress > 0.35 && progress < 0.55
              ? '高速服务区停靠，车辆熄火，温度开始缓慢上升'
              : `途中停车 ${durationMin} 分钟，温度回升 ${Math.round((maxTemp - threshold) * 10) / 10}℃`,
            durationMin,
            tempBefore: Math.round(tempBefore * 10) / 10,
            tempAfter: Math.round(tempAfter * 10) / 10,
            positionIndex: i,
          });
        }
      }
      i = j;
    } else {
      i++;
    }
  }

  loadingEvents.forEach((ev) => {
    const isWaiting = ev.type === 'waiting' || ev.type === 'queue';
    const idx = Math.max(
      0,
      Math.min(
        total - 1,
        Math.floor((dayjs(ev.startTime).diff(dayjs(startTime), 'minute') / Math.max(1, total)) * total)
      )
    );
    if (isWaiting && ev.durationMin > 15) {
      tripEvents.push({
        id: makeTripId(),
        timestamp: ev.startTime,
        type: ev.type === 'queue' ? 'traffic_jam' : 'door_open',
        description:
          ev.type === 'queue'
            ? `卸货区排队等待 ${ev.durationMin} 分钟`
            : `装货等待 ${ev.durationMin} 分钟，车厢门频繁开启`,
        durationMin: ev.durationMin,
        tempBefore: tempRecords[idx]?.temperature || threshold,
        tempAfter: tempRecords[Math.min(idx + ev.durationMin, total - 1)]?.temperature || threshold,
        positionIndex: idx,
      });
    }
  });

  return { tripEvents, driftIncidents };
}

function detectNearbyParking(gpsPoints: GpsPoint[], tempIndex: number, totalTemp: number): boolean {
  const gpsIdx = Math.floor((tempIndex / totalTemp) * gpsPoints.length);
  const window = gpsPoints.slice(Math.max(0, gpsIdx - 5), Math.min(gpsPoints.length, gpsIdx + 10));
  if (window.length < 3) return false;
  const avgSpeed = window.reduce((s, p) => s + p.speed, 0) / window.length;
  return avgSpeed < 10;
}
