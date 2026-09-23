/// <reference types="vitest/globals" />

declare global {
  type Mock = import("vitest").Mock;
  type Mocked<T> = import("vitest").Mocked<T>;
  namespace vi {
    type SpyInstance = import("vitest").MockInstance;
    type SpiedFunction<T extends (...args: never[]) => unknown> = import("vitest").MockInstance<T>;
  }
}

export {};
