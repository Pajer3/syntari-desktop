// Tauri Dialog API Mocks for Testing
import { vi } from 'vitest';

export const open = vi.fn().mockImplementation(() => {
  return Promise.resolve('/mock/selected/path');
});

export const save = vi.fn().mockImplementation(() => {
  return Promise.resolve('/mock/save/path');
});

export const message = vi.fn().mockImplementation(() => {
  return Promise.resolve();
});

export const ask = vi.fn().mockImplementation(() => {
  return Promise.resolve(true);
});

export const confirm = vi.fn().mockImplementation(() => {
  return Promise.resolve(true);
}); 