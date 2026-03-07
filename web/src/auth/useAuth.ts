import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;

/**
 * Returns a function that resolves with a fresh bearer token for the
 * configured API audience. Intended to be passed into the API client.
 */
export function useAccessToken(): () => Promise<string> {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();
  return useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience },
      });
    } catch (error: unknown) {
      // If refresh token is missing or expired, redirect to login
      if (
        error instanceof Error &&
        (error.message.includes("Missing Refresh Token") ||
          error.message.includes("Login required"))
      ) {
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname },
        });
        // This will never resolve because we're redirecting
        return new Promise<string>(() => {});
      }
      // Re-throw other errors
      throw error;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);
}

/**
 * Thin re-export of useAuth0 so call-sites don't import the SDK directly.
 */
export { useAuth0 as useAuthState } from "@auth0/auth0-react";
