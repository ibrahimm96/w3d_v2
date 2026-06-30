import { QueryClient } from "@tanstack/react-query";
import { GC_TIME } from "./queries/ttl";

// Single app-wide client. Per-query `staleTime` encodes each data type's TTL
// (see queries/ttl.ts); here we only set cross-cutting defaults. Weather sources
// are slow and rarely change within a session, so we never refetch on window
// focus/reconnect — freshness is governed solely by TTL.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: GC_TIME,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
