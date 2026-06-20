import dayjs from 'dayjs';
import type {
  Waybill,
  TemperatureRecord,
  GpsPoint,
  LoadingEvent,
  TripEvent,
  DriftIncident,
  ImportedFile,
} from '@/types';

const genTempRecords = (
  baseDate: string,
  baseTemp: number,
  pattern: 'normal' | 'drift_middle' | 'drift_start' | 'drift_end'
): TemperatureRecord[] => {
  const records: TemperatureRecord[] = [];
  const totalMinutes = 300;

  for (let i = 0; i <= totalMinutes; i += 1) {
    let temp = baseTemp;
    const progress = i / totalMinutes;

    if (pattern === 'normal') {
      temp = baseTemp + Math.sin(i * 0.05) * 0.3 + (Math.random() - 0.5) * 0.2;
    } else if (pattern === 'drift_middle') {
      if (i >= 100 && i <= 180) {
        const driftProgress = (i - 100) / 80;
        const driftAmount = 4 * Math.sin(driftProgress * Math.PI);
        temp = baseTemp + driftAmount + (Math.random() - 0.5) * 0.3;
      } else {
        temp = baseTemp + Math.sin(i * 0.05) * 0.2 + (Math.random() - 0.5) * 0.2;
      }
    } else if (pattern === 'drift_start') {
      if (i < 60) {
        temp = baseTemp + 3 - 3 * (i / 60) + (Math.random() - 0.5) * 0.3;
      } else {
        temp = baseTemp + Math.sin(i * 0.05) * 0.2 + (Math.random() - 0.5) * 0.2;
      }
    } else if (pattern === 'drift_end') {
      if (i >= 230) {
        const driftProgress = (i - 230) / 70;
        temp = baseTemp + driftProgress * 5 + (Math.random() - 0.5) * 0.3;
      } else {
        temp = baseTemp + Math.sin(i * 0.05) * 0.2 + (Math.random() - 0.5) * 0.2;
      }
    }

    records.push({
      timestamp: dayjs(baseDate).add(i, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      temperature: Math.round(temp * 10) / 10,
      humidity: 85 + Math.random() * 10,
    });
  }

  return records;
};

const genGpsPoints = (
  baseDate: string,
  routePath: { x: number; y: number; name: string }[]
): GpsPoint[] => {
  const points: GpsPoint[] = [];
  const totalMinutes = 300;

  for (let i = 0; i <= totalMinutes; i += 1) {
    const progress = i / totalMinutes;
    const segmentIdx = Math.floor(progress * (routePath.length - 1));
    const segmentProgress = (progress * (routePath.length - 1)) % 1;

    const current = routePath[Math.min(segmentIdx, routePath.length - 1)];
    const next = routePath[Math.min(segmentIdx + 1, routePath.length - 1)];

    const x = current.x + (next.x - current.x) * segmentProgress;
    const y = current.y + (next.y - current.y) * segmentProgress;

    let speed = 60 + Math.random() * 30;
    if (i >= 120 && i <= 162) {
      speed = 0;
    }
    if (i >= 250 && i <= 270) {
      speed = 5 + Math.random() * 8;
    }

    points.push({
      timestamp: dayjs(baseDate).add(i, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      lat: 30 + y * 0.01,
      lng: 114 + x * 0.01,
      speed: Math.round(speed * 10) / 10,
      locationName: i < 10 ? '冷链仓储中心' : current.name,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  }

  return points;
};

const routeAPath = [
  { x: 50, y: 380, name: '起点仓库' },
  { x: 120, y: 340, name: '城北区' },
  { x: 200, y: 280, name: '北三环' },
  { x: 280, y: 220, name: '高速入口' },
  { x: 380, y: 180, name: '江汉服务区' },
  { x: 480, y: 160, name: '高速中段' },
  { x: 580, y: 180, name: '宜昌出口' },
  { x: 680, y: 240, name: '发展大道' },
  { x: 750, y: 300, name: '西陵二路' },
  { x: 800, y: 350, name: '万达广场店' },
];

const routeBPath = [
  { x: 50, y: 380, name: '起点仓库' },
  { x: 130, y: 350, name: '城东区' },
  { x: 220, y: 300, name: '光谷大道' },
  { x: 320, y: 260, name: '武鄂高速' },
  { x: 420, y: 230, name: '葛店服务区' },
  { x: 520, y: 210, name: '鄂州段' },
  { x: 620, y: 200, name: '黄石出口' },
  { x: 700, y: 230, name: '杭州东路' },
  { x: 770, y: 280, name: '团城山' },
  { x: 820, y: 340, name: '黄石旗舰店' },
];

const routeCPath = [
  { x: 50, y: 200, name: '起点仓库' },
  { x: 140, y: 180, name: '汉阳区' },
  { x: 240, y: 170, name: '三环线' },
  { x: 340, y: 180, name: '白沙洲' },
  { x: 440, y: 200, name: '江夏服务区' },
  { x: 540, y: 230, name: '京港澳高速' },
  { x: 640, y: 270, name: '咸宁北' },
  { x: 720, y: 310, name: '银泉大道' },
  { x: 780, y: 350, name: '温泉路' },
  { x: 820, y: 380, name: '咸宁中心店' },
];

const baseDate1 = '2026-06-20 06:00:00';
const baseDate2 = '2026-06-20 05:30:00';
const baseDate3 = '2026-06-20 07:00:00';

const waybills: Waybill[] = [
  {
    id: 'YB20260620001',
    driver: '张建国',
    route: '武汉-宜昌线',
    carrier: '顺丰冷链',
    store: '万达广场店',
    cargoType: '速冻食品',
    departureTime: baseDate1,
    arrivalTime: dayjs(baseDate1).add(300, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    tempThreshold: -18,
    status: 'alert',
    temperatureRecords: genTempRecords(baseDate1, -20, 'drift_middle'),
    gpsPoints: genGpsPoints(baseDate1, routeAPath),
    loadingEvents: [
      {
        type: 'loading',
        startTime: dayjs(baseDate1).subtract(45, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate1).format('YYYY-MM-DD HH:mm:ss'),
        location: '冷链仓储中心A区',
        durationMin: 45,
      },
      {
        type: 'waiting',
        startTime: dayjs(baseDate1).subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate1).format('YYYY-MM-DD HH:mm:ss'),
        location: '装货月台',
        durationMin: 30,
      },
      {
        type: 'unloading',
        startTime: dayjs(baseDate1).add(290, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate1).add(320, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        location: '万达广场店卸货区',
        durationMin: 30,
      },
    ],
    tripEvents: [
      {
        id: 'evt001',
        timestamp: dayjs(baseDate1).add(120, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        type: 'service_area',
        description: '江汉服务区停靠，车辆熄火，车厢门关闭',
        durationMin: 42,
        tempBefore: -20.1,
        tempAfter: -16.8,
        positionIndex: 120,
      },
      {
        id: 'evt002',
        timestamp: dayjs(baseDate1).add(250, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        type: 'traffic_jam',
        description: '临近目的地遇到车流排队等待',
        durationMin: 20,
        tempBefore: -19.8,
        tempAfter: -19.2,
        positionIndex: 250,
      },
    ],
    driftIncidents: [
      {
        id: 'drift001',
        waybillId: 'YB20260620001',
        startTime: dayjs(baseDate1).add(125, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate1).add(175, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        durationMin: 50,
        maxTemp: -15.8,
        avgTemp: -17.2,
        responsibleStage: '途中停车',
        suggestion: '建议服务区停靠时间控制在30分钟以内，或配备备用制冷机组',
        startIndex: 125,
        endIndex: 175,
      },
    ],
    distanceKm: 328,
    vehiclePlate: '鄂A·8826冷',
  },
  {
    id: 'YB20260620002',
    driver: '李明辉',
    route: '武汉-黄石线',
    carrier: '京东冷链',
    store: '黄石旗舰店',
    cargoType: '生鲜蔬菜',
    departureTime: baseDate2,
    arrivalTime: dayjs(baseDate2).add(300, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    tempThreshold: 4,
    status: 'warning',
    temperatureRecords: genTempRecords(baseDate2, 2, 'drift_start'),
    gpsPoints: genGpsPoints(baseDate2, routeBPath),
    loadingEvents: [
      {
        type: 'loading',
        startTime: dayjs(baseDate2).subtract(60, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate2).format('YYYY-MM-DD HH:mm:ss'),
        location: '生鲜分拣中心',
        durationMin: 60,
      },
      {
        type: 'waiting',
        startTime: dayjs(baseDate2).subtract(50, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate2).subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        location: '装货区排队',
        durationMin: 30,
      },
    ],
    tripEvents: [
      {
        id: 'evt003',
        timestamp: dayjs(baseDate2).add(0, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        type: 'door_open',
        description: '装货后车厢门关闭延迟，等待发车',
        durationMin: 15,
        tempBefore: 2.0,
        tempAfter: 4.8,
        positionIndex: 0,
      },
    ],
    driftIncidents: [
      {
        id: 'drift002',
        waybillId: 'YB20260620002',
        startTime: dayjs(baseDate2).add(0, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate2).add(55, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        durationMin: 55,
        maxTemp: 5.2,
        avgTemp: 3.8,
        responsibleStage: '装货等待',
        suggestion: '装货完成后立即关闭车厢门，建议月台配备快速装卸设备',
        startIndex: 0,
        endIndex: 55,
      },
    ],
    distanceKm: 285,
    vehiclePlate: '鄂A·3715冷',
  },
  {
    id: 'YB20260620003',
    driver: '王志强',
    route: '武汉-咸宁线',
    carrier: '顺丰冷链',
    store: '咸宁中心店',
    cargoType: '乳制品',
    departureTime: baseDate3,
    arrivalTime: dayjs(baseDate3).add(300, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    tempThreshold: 6,
    status: 'alert',
    temperatureRecords: genTempRecords(baseDate3, 3, 'drift_end'),
    gpsPoints: genGpsPoints(baseDate3, routeCPath),
    loadingEvents: [
      {
        type: 'loading',
        startTime: dayjs(baseDate3).subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate3).format('YYYY-MM-DD HH:mm:ss'),
        location: '乳品仓B区',
        durationMin: 30,
      },
      {
        type: 'queue',
        startTime: dayjs(baseDate3).add(240, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate3).add(290, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        location: '咸宁中心店卸货区',
        durationMin: 50,
      },
    ],
    tripEvents: [
      {
        id: 'evt004',
        timestamp: dayjs(baseDate3).add(240, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        type: 'parking',
        description: '到达门店前排队等待卸货，车辆怠速',
        durationMin: 50,
        tempBefore: 3.2,
        tempAfter: 7.8,
        positionIndex: 240,
      },
    ],
    driftIncidents: [
      {
        id: 'drift003',
        waybillId: 'YB20260620003',
        startTime: dayjs(baseDate3).add(245, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs(baseDate3).add(300, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        durationMin: 55,
        maxTemp: 8.1,
        avgTemp: 5.9,
        responsibleStage: '临近卸货排队',
        suggestion: '建议与门店协调预约卸货时间，减少排队等待；或增加车厢保温层',
        startIndex: 245,
        endIndex: 300,
      },
    ],
    distanceKm: 195,
    vehiclePlate: '鄂A·6602冷',
  },
  {
    id: 'YB20260620004',
    driver: '刘大勇',
    route: '武汉-宜昌线',
    carrier: '圆通冷链',
    store: '宜昌CBD店',
    cargoType: '速冻食品',
    departureTime: '2026-06-20 08:00:00',
    arrivalTime: '2026-06-20 13:00:00',
    tempThreshold: -18,
    status: 'normal',
    temperatureRecords: genTempRecords('2026-06-20 08:00:00', -20, 'normal'),
    gpsPoints: genGpsPoints('2026-06-20 08:00:00', routeAPath),
    loadingEvents: [
      {
        type: 'loading',
        startTime: '2026-06-20 07:20:00',
        endTime: '2026-06-20 08:00:00',
        location: '冷链仓储中心B区',
        durationMin: 40,
      },
    ],
    tripEvents: [],
    driftIncidents: [],
    distanceKm: 328,
    vehiclePlate: '鄂A·9981冷',
  },
];

const importedFiles: ImportedFile[] = [
  {
    id: 'file001',
    name: 'temp_YB20260620001.csv',
    type: 'temperature',
    size: 45200,
    uploadTime: '2026-06-20 18:30:00',
    waybillId: 'YB20260620001',
  },
  {
    id: 'file002',
    name: 'gps_YB20260620001.csv',
    type: 'gps',
    size: 62100,
    uploadTime: '2026-06-20 18:30:02',
    waybillId: 'YB20260620001',
  },
  {
    id: 'file003',
    name: 'loading_20260620.xlsx',
    type: 'loading',
    size: 12800,
    uploadTime: '2026-06-20 18:30:05',
  },
  {
    id: 'file004',
    name: 'temp_YB20260620002.csv',
    type: 'temperature',
    size: 38900,
    uploadTime: '2026-06-20 18:31:10',
    waybillId: 'YB20260620002',
  },
  {
    id: 'file005',
    name: 'gps_YB20260620002.gpx',
    type: 'gps',
    size: 51200,
    uploadTime: '2026-06-20 18:31:12',
    waybillId: 'YB20260620002',
  },
  {
    id: 'file006',
    name: 'temp_YB20260620003.csv',
    type: 'temperature',
    size: 41000,
    uploadTime: '2026-06-20 18:32:00',
    waybillId: 'YB20260620003',
  },
  {
    id: 'file007',
    name: 'gps_YB20260620003.csv',
    type: 'gps',
    size: 55800,
    uploadTime: '2026-06-20 18:32:02',
    waybillId: 'YB20260620003',
  },
  {
    id: 'file008',
    name: 'temp_YB20260620004.csv',
    type: 'temperature',
    size: 39500,
    uploadTime: '2026-06-20 18:33:00',
    waybillId: 'YB20260620004',
  },
  {
    id: 'file009',
    name: 'gps_YB20260620004.csv',
    type: 'gps',
    size: 48700,
    uploadTime: '2026-06-20 18:33:02',
    waybillId: 'YB20260620004',
  },
];

export const getMockWaybills = (): Waybill[] => waybills;
export const getMockImportedFiles = (): ImportedFile[] => importedFiles;
export const getStores = (): string[] => [
  '万达广场店',
  '黄石旗舰店',
  '咸宁中心店',
  '宜昌CBD店',
];
export const getRoutes = (): string[] => ['武汉-宜昌线', '武汉-黄石线', '武汉-咸宁线'];
export const getCarriers = (): string[] => ['顺丰冷链', '京东冷链', '圆通冷链'];
export const getDrivers = (): string[] => ['张建国', '李明辉', '王志强', '刘大勇'];
export const getCargoTypes = (): string[] => ['速冻食品', '生鲜蔬菜', '乳制品', '肉类', '冷饮'];
