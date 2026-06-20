import { create } from 'zustand';
import type { Waybill, ImportedFile, ReportFilters } from '@/types';
import { getMockWaybills, getMockImportedFiles } from '@/utils/mockData';

interface WaybillState {
  waybills: Waybill[];
  importedFiles: ImportedFile[];
  selectedWaybillId: string | null;
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  reportFilters: ReportFilters;

  setSelectedWaybill: (id: string | null) => void;
  setPlaybackIndex: (index: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addImportedFile: (file: ImportedFile) => void;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  loadMockData: () => void;
}

export const useWaybillStore = create<WaybillState>((set) => ({
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

  setSelectedWaybill: (id) => set({ selectedWaybillId: id, playbackIndex: 0, isPlaying: false }),
  setPlaybackIndex: (index) =>
    set((state) => ({
      playbackIndex: typeof index === 'function' ? index(state.playbackIndex) : index,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  addImportedFile: (file) =>
    set((state) => ({ importedFiles: [...state.importedFiles, file] })),
  setReportFilters: (filters) =>
    set((state) => ({
      reportFilters: { ...state.reportFilters, ...filters },
    })),
  loadMockData: () => {
    const waybills = getMockWaybills();
    const files = getMockImportedFiles();
    set({
      waybills,
      importedFiles: files,
      selectedWaybillId: waybills[0]?.id || null,
    });
  },
}));
