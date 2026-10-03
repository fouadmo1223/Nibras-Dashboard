import { create } from 'zustand';

const DURATION_MS = 5000;
let nextId = 1;

/** Transient notifications. Messages normally come straight from the API (`message` / `error.message`). */
export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (tone, message) => {
    if (!message) return;
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, tone, message }] });
    setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message) => useToastStore.getState().show('success', message),
  error: (message) => useToastStore.getState().show('error', message),
};
