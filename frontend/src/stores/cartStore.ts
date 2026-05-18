import { create } from 'zustand';

interface CartStore {
  items: unknown[];
  total: number;
  addItem: (item: unknown) => void;
  removeItem: (item: unknown) => void;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  total: 0,
  addItem: (_item) => {
    // TODO: implement in POS sub-phase
  },
  removeItem: (_item) => {
    // TODO: implement in POS sub-phase
  },
}));
