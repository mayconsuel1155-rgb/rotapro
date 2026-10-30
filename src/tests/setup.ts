import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Ensure structuredClone fallback if needed
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}
