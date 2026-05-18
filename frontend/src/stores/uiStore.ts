import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  activeModal: string | null;
  setSidebarOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  /** True when the screen is locked due to inactivity */
  isScreenLocked: boolean;
  /** Triggers the screen lock overlay */
  lockScreen: () => void;
  /** Releases the screen lock (called after successful PIN entry) */
  unlockScreen: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  isScreenLocked: false,
  lockScreen: () => set({ isScreenLocked: true }),
  unlockScreen: () => set({ isScreenLocked: false }),
}));
