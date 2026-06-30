import type { ReactNode } from "react";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "./queryClient";
import { CACHE_BUSTER, PERSIST_MAX_AGE } from "./queries/ttl";

// Persists the whole query cache (raw weather + derived computations) to
// localStorage so a reload restores everything instantly. Entries older than
// PERSIST_MAX_AGE — or saved under a stale CACHE_BUSTER — are dropped on restore,
// which is what enforces strict TTL across sessions. Storage is best-effort: in
// private mode / on quota errors the persister no-ops and the app still works.
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "w3d.rq.cache",
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: CACHE_BUSTER }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
