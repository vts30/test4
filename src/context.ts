export interface PerfContext {
  name: string;
  env: string;
  version: string;
}

export type UsePerfContext = (ctx: PerfContext) => void;

export function createContextSetter(): { usePerfContext: UsePerfContext; getContext: () => PerfContext | null } {
  let current: PerfContext | null = null;
  return {
    usePerfContext(ctx: PerfContext): void {
      current = ctx;
    },
    getContext(): PerfContext | null {
      return current;
    },
  };
}
