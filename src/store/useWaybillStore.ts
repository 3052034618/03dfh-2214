import { create } from 'zustand';
import type {
  Waybill,
  ImportedFile,
  ImportedFileType,
  ReportFilters,
  WaybillMergeInfo,
  ValidationIssue,
  TemperatureRecord,
  GpsPoint,
  LoadingEvent,
} from '@/types';
import { getMockWaybills, getMockImportedFiles } from '@/utils/mockData';
import { validateWaybill } from '@/utils/dataValidator';
import {
  parseTemperatureCSV,
  parseGpsCSV,
  parseLoadingCSV,
  readFileAsText,
} from '@/utils/csvParser';
import { buildWaybill } from '@/utils/waybillBuilder';

export function extractWaybillId(filename: string): string | null {
  const match = filename.match(/YB\d{6,}/i);
  if (match) return match[0].toUpperCase();
  const parts = filename.replace(/\.[^.]+$/, '').split(/[_\-\s]+/);
  for (const part of parts) {
    if (/^\d{8,}$/.test(part)) return part;
    if (/^YB/i.test(part)) return part.toUpperCase();
  }
  return null;
}

function detectFileType(filename: string): ImportedFileType {
  const lower = filename.toLowerCase();
  if (lower.includes('temp') || lower.includes('温度')) return 'temperature';
  if (lower.includes('gps') || lower.includes('gpx') || lower.includes('轨迹')) return 'gps';
  if (lower.includes('loading') || lower.includes('装卸') || lower.includes('load')) return 'loading';
  return 'unknown';
}

interface ParsedData {
  tempRecords: TemperatureRecord[];
  gpsPoints: GpsPoint[];
  loadingEvents: LoadingEvent[];
}

function computeMergeInfo(
  files: ImportedFile[],
  existingWaybillIds: Set<string>
): WaybillMergeInfo[] {
  const groups: Record<string, Record<string, ImportedFile[]>> = {};

  for (const file of files) {
    if (file.type === 'unknown') continue;
    const wid = file.waybillId;
    if (!wid) continue;
    if (!groups[wid]) groups[wid] = { temperature: [], gps: [], loading: [] };
    if (file.type in groups[wid]) {
      groups[wid][file.type].push(file);
    }
  }

  return Object.entries(groups).map(([waybillId, typedGroups]) => {
    const typed = typedGroups as { temperature: ImportedFile[]; gps: ImportedFile[]; loading: ImportedFile[] };
    const hasTemperature = typed.temperature.length > 0;
    const hasGps = typed.gps.length > 0;
    const hasLoading = typed.loading.length > 0;
    const hasWaybillRecord = existingWaybillIds.has(waybillId);

    const missingTypes: ImportedFileType[] = [];
    if (!hasTemperature) missingTypes.push('temperature');
    if (!hasGps) missingTypes.push('gps');
    if (!hasLoading) missingTypes.push('loading');

    let status: WaybillMergeInfo['status'] = 'complete';
    if (!hasWaybillRecord && missingTypes.length > 0) {
      status = missingTypes.length >= 2 ? 'pending' : 'incomplete';
    }

    const fileIds = [...typed.temperature, ...typed.gps, ...typed.loading].map((f) => f.id);
    return { waybillId, hasTemperature, hasGps, hasLoading, status, missingTypes, fileIds };
  });
}

function computeValidations(waybills: Waybill[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const w of waybills) {
    issues.push(...validateWaybill(w));
  }
  return issues;
}

interface WaybillState {
  waybills: Waybill[];
  importedFiles: ImportedFile[];
  selectedWaybillId: string | null;
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  reportFilters: ReportFilters;
  mergeInfo: WaybillMergeInfo[];
  validationIssues: ValidationIssue[];
  parsedFileContents: Record<string, ParsedData>;

  setSelectedWaybill: (id: string | null) => void;
  setPlaybackIndex: (index: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addImportedFile: (file: File) => Promise<void>;
  removeImportedFile: (id: string) => void;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  loadMockData: () => void;
  buildWaybillFromFiles: (waybillId: string) => void;
}

export const useWaybillStore = create<WaybillState>((set, get) => ({
  waybills: [],
  importedFiles: [],
  selectedWaybillId: null,
  playbackIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  reportFilters: {
    store: '',
    route: '',
    carrier: '',
    driver: '',
    cargoType: '',
    dateRange: { start: '', end: '' },
  },
  mergeInfo: [],
  validationIssues: [],
  parsedFileContents: {},

  setSelectedWaybill: (id) => set({ selectedWaybillId: id, playbackIndex: 0, isPlaying: false }),
  setPlaybackIndex: (index) =>
    set((state) => ({
      playbackIndex: typeof index === 'function' ? index(state.playbackIndex) : index,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  addImportedFile: async (nativeFile: File) => {
    const waybillId = extractWaybillId(nativeFile.name) || undefined;
    const fileType = detectFileType(nativeFile.name);

    const importedFile: ImportedFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: nativeFile.name,
      type: fileType,
      size: nativeFile.size,
      uploadTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      waybillId,
    };

    let tempRecords: TemperatureRecord[] = [];
    let gpsPoints: GpsPoint[] = [];
    let loadingEvents: LoadingEvent[] = [];

    try {
      const text = await readFileAsText(nativeFile);
      if (fileType === 'temperature') {
        const result = await parseTemperatureCSV(text);
        tempRecords = result.data;
      } else if (fileType === 'gps') {
        const result = await parseGpsCSV(text);
        gpsPoints = result.data;
      } else if (fileType === 'loading') {
        const result = await parseLoadingCSV(text);
        loadingEvents = result.data;
      }
    } catch (_e) { /* 解析失败不阻塞 */ }

    set((state) => {
      const newFiles = [...state.importedFiles, importedFile];
      let newWaybills = [...state.waybills];
      const existingIds = new Set(newWaybills.map((w) => w.id));

      const newContents: Record<string, ParsedData> = { ...state.parsedFileContents };
      if (waybillId) {
        const prev = newContents[waybillId] || { tempRecords: [], gpsPoints: [], loadingEvents: [] };
        newContents[waybillId] = {
          tempRecords: [...(prev.tempRecords || []), ...tempRecords],
          gpsPoints: [...(prev.gpsPoints || []), ...gpsPoints],
          loadingEvents: [...(prev.loadingEvents || []), ...loadingEvents],
        };
      }

      if (waybillId && !existingIds.has(waybillId)) {
        const contents = newContents[waybillId];
        if (contents && contents.tempRecords.length > 5 && contents.gpsPoints.length > 5) {
          try {
            const newWaybill = buildWaybill({
              waybillId,
              tempRecords: contents.tempRecords,
              gpsPoints: contents.gpsPoints,
              loadingEvents: contents.loadingEvents,
            });
            newWaybills = [...newWaybills, newWaybill];
            existingIds.add(waybillId);
          } catch (_e) { /* 构建失败忽略 */ }
        }
      }

      const mergeInfo = computeMergeInfo(newFiles, existingIds);
      const validationIssues = computeValidations(newWaybills);

      return {
        importedFiles: newFiles,
        parsedFileContents: newContents,
        waybills: newWaybills,
        mergeInfo,
        validationIssues,
      };
    });
  },

  removeImportedFile: (id) =>
    set((state) => {
      const newFiles = state.importedFiles.filter((f) => f.id !== id);
      const existingIds = new Set(state.waybills.map((w) => w.id));
      const mergeInfo = computeMergeInfo(newFiles, existingIds);
      return { importedFiles: newFiles, mergeInfo };
    }),

  setReportFilters: (filters) =>
    set((state) => ({
      reportFilters: { ...state.reportFilters, ...filters },
    })),

  loadMockData: () => {
    const waybills = getMockWaybills();
    const files = getMockImportedFiles();
    const existingIds = new Set(waybills.map((w) => w.id));
    const mergeInfo = computeMergeInfo(files, existingIds);
    const validationIssues = computeValidations(waybills);
    const parsedFileContents: Record<string, ParsedData> = {};
    for (const w of waybills) {
      parsedFileContents[w.id] = {
        tempRecords: w.temperatureRecords,
        gpsPoints: w.gpsPoints,
        loadingEvents: w.loadingEvents,
      };
    }
    set({
      waybills,
      importedFiles: files,
      selectedWaybillId: waybills[0]?.id || null,
      mergeInfo,
      validationIssues,
      parsedFileContents,
    });
  },

  buildWaybillFromFiles: (waybillId) => {
    const state = get();
    const contents = state.parsedFileContents[waybillId];
    if (!contents) return;
    if (state.waybills.some((w) => w.id === waybillId)) return;
    if (contents.tempRecords.length < 5 || contents.gpsPoints.length < 5) return;
    try {
      const newWaybill = buildWaybill({
        waybillId,
        tempRecords: contents.tempRecords,
        gpsPoints: contents.gpsPoints,
        loadingEvents: contents.loadingEvents,
      });
      const newWaybills = [...state.waybills, newWaybill];
      const existingIds = new Set(newWaybills.map((w) => w.id));
      const mergeInfo = computeMergeInfo(state.importedFiles, existingIds);
      const validationIssues = computeValidations(newWaybills);
      set({ waybills: newWaybills, mergeInfo, validationIssues });
    } catch (_e) { /* 忽略构建错误 */ }
  },
}));
