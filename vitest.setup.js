import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia; report "no match" so desktop-only visuals stay unmounted in tests.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
