/* eslint-disable react-refresh/only-export-components */
import { useAccessToken } from "@/auth/useAuth";
import { createApiClient, type ApiClient } from "@/lib/api";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const getToken = useAccessToken();
  const client = useMemo(() => createApiClient(getToken), [getToken]);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within ApiProvider");
  return ctx;
}
