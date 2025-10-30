import { writable } from 'svelte/store';

export type UILoadingState = {
  active: boolean;
  text?: string;
  zIndex?: number;
};

// Use a high default z-index to ensure the overlay appears above all app modals (e.g., ReservationFormModal uses z-index ~1000)
const initialState: UILoadingState = { active: false, text: 'Processing...', zIndex: 2000 };

export const uiLoading = writable<UILoadingState>(initialState);

export function showLoading(text?: string, zIndex?: number): void {
  uiLoading.set({ active: true, text: text ?? 'Processing...', zIndex: zIndex ?? 2000 });
}

export function hideLoading(): void {
  uiLoading.set({ active: false, text: undefined, zIndex: 60 });
}
