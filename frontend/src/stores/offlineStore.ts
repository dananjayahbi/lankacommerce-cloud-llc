import { create } from 'zustand';

interface OfflineStore {
  queue: unknown[];
  isOnline: boolean;
  enqueue: (item: unknown) => void;
  processQueue: () => void;
}

export const useOfflineStore = create<OfflineStore>()(() => ({
  queue: [],
  isOnline: true,
  enqueue: (_item) => {
    // TODO: implement offline queue in POS sub-phase
  },
  processQueue: () => {
    // TODO: implement queue processing in POS sub-phase
  },
}));
