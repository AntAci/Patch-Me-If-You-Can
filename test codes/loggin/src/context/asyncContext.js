import { AsyncLocalStorage } from "node:async_hooks";

export function createAsyncContext() {
  const als = new AsyncLocalStorage();

  return {
    run(values, fn) {
      const base = als.getStore() ?? Object.create(null);
      const next = Object.assign(Object.create(null), base, values ?? {});
      return als.run(next, fn);
    },
    get() {
      return als.getStore();
    }
  };
}
