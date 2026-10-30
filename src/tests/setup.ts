import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Ensure structuredClone fallback if needed
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Mock matchMedia for JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
