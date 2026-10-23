import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ChartSyncValue {
  index: number | null;
  /** Chart that owns the pointer; only it shows a tooltip. */
  source: string | null;
  setHover: (index: number | null, source: string | null) => void;
}

const ChartSyncContext = createContext<ChartSyncValue | null>(null);

/**
 * Wrap a dashboard in ChartSync and every TimeSeriesChart inside shares one
 * cursor: hovering one panel marks the same moment on all of them.
 */
export function ChartSync({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ index: number | null; source: string | null }>({ index: null, source: null });
  const value = useMemo<ChartSyncValue>(() => ({ ...state, setHover: (index, source) => setState({ index, source }) }), [state]);
  return <ChartSyncContext.Provider value={value}>{children}</ChartSyncContext.Provider>;
}

export function useChartSync(): ChartSyncValue | null {
  return useContext(ChartSyncContext);
}
