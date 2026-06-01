import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

function createMemoryStorage() {
  const store = new Map();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(String(key)) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    }
  };
}

if (typeof globalThis.localStorage?.setItem !== "function") {
  const localStorageShim = createMemoryStorage();

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageShim,
    configurable: true
  });

  Object.defineProperty(window, "localStorage", {
    value: localStorageShim,
    configurable: true
  });
}

afterEach(() => {
  cleanup();
});
