export interface TemperatureRecord {
  timestamp: string;
  temperature: number;
  humidity?: number;
}

export interface GpsPoint {
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  locationName: string;
  x: number;
  y: number;
}

export type LoadingEventType = 'loading' | 'unloading' | 'waiting' | 'queue';

export interface LoadingEvent {
  type: LoadingEventType;
  startTime: string;
  endTime: string;
  location: string;
  durationMin: number;
}

export type TripEventType = 'parking' | 'service_area' | 'door_open' | 'traffic_jam';

export interface TripEvent {
  id: string;
  timestamp: string;
  type: TripEventType;
  description: string;
  durationMin: number;
  tempBefore: number;
  tempAfter: number;
  positionIndex: number;
}

export type ResponsibleStage = '装货等待' | '途中停车' | '临近卸货排队' | '其他';

export interface DriftIncident {
  id: string;
  waybillId: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  maxTemp: number;
  avgTemp: number;
  responsibleStage: ResponsibleStage;
  suggestion: string;
  startIndex: number;
  endIndex: number;
}

export type WaybillStatus = 'normal' | 'warning' | 'alert';

export interface Waybill {
  id: string;
  driver: string;
  route: string;
  carrier: string;
  store: string;
  cargoType: string;
  departureTime: string;
  arrivalTime: string;
  tempThreshold: number;
  status: WaybillStatus;
  temperatureRecords: TemperatureRecord[];
  gpsPoints: GpsPoint[];
  loadingEvents: LoadingEvent[];
  tripEvents: TripEvent[];
  driftIncidents: DriftIncident[];
  distanceKm: number;
  vehiclePlate: string;
}

export interface ImportedFile {
  id: string;
  name: string;
  type: 'temperature' | 'gps' | 'loading' | 'unknown';
  size: number;
  uploadTime: string;
  waybillId?: string;
}

export interface ReportFilters {
  store: string;
  route: string;
  carrier: string;
  driver: string;
  cargoType: string;
  dateRange: {
    start: string;
    end: string;
  };
}
