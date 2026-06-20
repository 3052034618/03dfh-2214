import { create } from 'zustand';
import type { Waybill, ImportedFile, ImportedFileType, ReportFilters, WaybillMergeInfo, ValidationIssue } from '@/types';
import { getMockWaybills, getMockImportedFiles } from '@/utils/mockData';
import { validateWaybill } from '@/utils/dataValidator';

function extractWaybillId(filename: string): string | null {
  const match = filename.match(/YB\d{10,}/i);
  if (match) return match[0].toUpperCase();
  const parts = filename.replace(/\.[^.]+$/, '').split(/[_\-\s]+/);
  for (const part of parts) {
    if (/^\d{8,}$/.test(part)) return part;
    if (/^YB/i.test(part)) return part.toUpperCase();
  }
  return null;
}

function computeMergeInfo(files: ImportedFile[]): WaybillMergeInfo[] {
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

  return Object.entries(groups).map(([waybillId, types]) => {
    const hasTemperature = types.temperature.length > 0;
    const hasGps = types.gps.length > 0;
    const hasLoading = types.loading.length > 0;

    const missingTypes: ImportedFileType[] = [];
    if (!hasTemperature) missingTypes.push('temperature');
    if (!hasGps) missingTypes.push('gps');
    if (!hasLoading) missingTypes.push('loading');

    let status: WaybillMergeInfo['status'] = 'complete';
    if (missingTypes.length > 0) {
      status = missingTypes.length >= 2 ? 'pending' : 'incomplete';
    }

    const fileIds = [
      ...types.temperature,
      ...types.gps,
      ...types.loading,
    ].map((f) => f.id);

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

  setSelectedWaybill: (id: string | null) => void;
  setPlaybackIndex: (index: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addImportedFile: (file: ImportedFile) => void;
  removeImportedFile: (id: string) => void;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  loadMockData: () => void;
  recalcMergeInfo: () => void;
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
    dateRange: {
      start: '',
      end: '',
    },
  },
  mergeInfo: [],
  validationIssues: [],

  setSelectedWaybill: (id) => set({ selectedWaybillId: id, playbackIndex: 0, isPlaying: false }),
  setPlaybackIndex: (index) =>
    set((state) => ({
      playbackIndex: typeof index === 'function' ? index(state.playbackIndex) : index,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  addImportedFile: (file) =>
    set((state) => {
      const newFiles = [...state.importedFiles, file];
      const mergeInfo = computeMergeInfo(newFiles);
      const validations = computeValidations(state.waybills);
      return { importedFiles: newFiles, mergeInfo, validationIssues: validations };
    }),
  removeImportedFile: (id) =>
    set((state) => {
      const newFiles = state.importedFiles.filter((f) => f.id !== id);
      const mergeInfo = computeMergeInfo(newFiles);
      return { importedFiles: newFiles, mergeInfo };
    }),
  setReportFilters: (filters) =>
    set((state) => ({
      reportFilters: { ...state.reportFilters, ...filters },
    })),
  loadMockData: () => {
    const waybills = getMockWaybills();
    const files = getMockImportedFiles();
    const mergeInfo = computeMergeInfo(files);
    const validationIssues = computeValidations(waybills);
    set({
      waybills,
      importedFiles: files,
      selectedWaybillId: waybills[0]?.id || null,
      mergeInfo,
      validationIssues,
    });
  },
  recalcMergeInfo: () => {
    const state = get();
    const mergeInfo = computeMergeInfo(state.importedFiles);
    const validationIssues = computeValidations(state.waybills);
    set({ mergeInfo, validationIssues });
  },
}));

export { extractWaybillId };
