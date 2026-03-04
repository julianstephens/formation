import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;

/**
 * Returns a function that resolves with a fresh bearer token for the
 * configured API audience. Intended to be passed into the API client.
 */
export function useAccessToken(): () => Promise<string> {
  const { getAccessTokenSilently } = useAuth0();
  return useCallback(
    () => getAccessTokenSilently({ authorizationParams: { audience } }),
    [getAccessTokenSilently],
  );
}

/**
 * Thin re-export of useAuth0 so call-sites don't import the SDK directly.
 */
export { useAuth0 as useAuthState } from "@auth0/auth0-react";
