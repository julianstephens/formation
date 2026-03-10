/**
 * createSseContext – factory that produces a React context, provider, and hooks
 * for managing persistent SSE connections keyed by session ID.
 *
 * Features:
 *  - Connections survive navigation (stored in a ref, not component state).
 *  - Handler callbacks are updated on each render without re-opening the stream.
 *  - Exponential backoff with jitter on reconnect (1 s → 30 s max).
 *  - Permanent 4xx errors (except 429 Too Many Requests) abort the retry loop.
 *  - All connections are cleaned up when the provider unmounts.
 */

import { useAccessToken } from "@/auth/useAuth";
import { readSseStream, SseConnectError } from "@/lib/sse";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WithConnectionErrorHandler {
  onConnectionError?: (error: unknown) => void;
}

interface Subscription<H> {
  controller: AbortController;
  /** Mutable so callers can update handlers without reconnecting. */
  handlers: H;
}

type SseContextValue<H> = {
  subscribe: (sessionId: string, handlers: H) => void;
  unsubscribe: (sessionId: string) => void;
};

// ── Backoff config ────────────────────────────────────────────────────────────

const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

function backoffDelay(attempt: number): number {
  const base = Math.min(BASE_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
  const jitter = (Math.random() - 0.5) * 1_000;
  return Math.max(base + jitter, 0);
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a React context that manages persistent SSE connections keyed by
 * session ID, with exponential-backoff reconnection and typed event dispatch.
 *
 * @param buildUrl  Returns the stream URL for the given sessionId.
 * @param dispatch  Routes raw SSE event types to typed handler callbacks.
 *
 * @returns `{ Provider, useSubscription, useUnsubscribe }`
 *   - **Provider** – wrap your route tree with this.
 *   - **useSubscription(sessionId, handlers)** – opens (or updates) a connection.
 *   - **useUnsubscribe()** – returns a function to explicitly close a connection.
 */
export function createSseContext<H extends WithConnectionErrorHandler>(
  buildUrl: (sessionId: string) => string,
  dispatch: (type: string, payload: unknown, handlers: H) => void,
) {
  const Ctx = createContext<SseContextValue<H> | null>(null);

  // ── Provider ──────────────────────────────────────────────────────────────

  function Provider({ children }: { children: ReactNode }) {
    const getToken = useAccessToken();
    const subsRef = useRef<Map<string, Subscription<H>>>(new Map());

    function subscribe(sessionId: string, handlers: H): void {
      const subs = subsRef.current;

      // Already subscribed – just swap in the latest handlers so the live
      // callbacks are used without re-opening the stream.
      if (subs.has(sessionId)) {
        subs.get(sessionId)!.handlers = handlers;
        return;
      }

      const controller = new AbortController();
      subs.set(sessionId, { controller, handlers });

      async function connectLoop(): Promise<void> {
        let attempt = 0;
        while (!controller.signal.aborted) {
          try {
            await readSseStream(
              buildUrl(sessionId),
              getToken,
              (type, payload) => {
                // Always read handlers from the ref so we pick up the
                // latest callbacks even mid-stream.
                const sub = subsRef.current.get(sessionId);
                if (sub) dispatch(type, payload, sub.handlers);
              },
              controller.signal,
            );
            // Stream closed naturally (server-side done). Reset backoff and
            // reconnect in case the server restarts.
            attempt = 0;
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return;
            // Belt-and-suspenders: some browsers may surface the abort as a
            // different error type; check the signal directly too.
            if (controller.signal.aborted) return;

            subsRef.current.get(sessionId)?.handlers.onConnectionError?.(e);

            // Permanent client errors must not be retried.
            if (
              e instanceof SseConnectError &&
              e.status >= 400 &&
              e.status < 500 &&
              e.status !== 429
            ) {
              controller.abort();
              subs.delete(sessionId);
              return;
            }
          }

          if (!controller.signal.aborted) {
            await new Promise<void>((r) =>
              setTimeout(r, backoffDelay(attempt)),
            );
            attempt++;
          }
        }
      }

      void connectLoop();
    }

    function unsubscribe(sessionId: string): void {
      const sub = subsRef.current.get(sessionId);
      if (sub) {
        sub.controller.abort();
        subsRef.current.delete(sessionId);
      }
    }

    // Abort all live connections when the provider unmounts.
    useEffect(() => {
      const subs = subsRef.current;
      return () => {
        subs.forEach((s) => s.controller.abort());
        subs.clear();
      };
    }, []);

    return (
      <Ctx.Provider value={{ subscribe, unsubscribe }}>{children}</Ctx.Provider>
    );
  }

  // ── Hooks ─────────────────────────────────────────────────────────────────

  /**
   * Opens (or updates handlers for) the SSE connection for `sessionId`.
   * The connection is kept alive across re-renders; changing `handlers` only
   * updates the callbacks without reconnecting.
   */
  function useSubscription(sessionId: string | undefined, handlers: H): void {
    const ctx = useContext(Ctx);
    useEffect(() => {
      if (!sessionId || !ctx) return;
      ctx.subscribe(sessionId, handlers);
      // Connection intentionally persists across renders; no cleanup here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, ctx]);
  }

  /**
   * Returns a stable function that explicitly closes the SSE connection for
   * a given session ID. Use this on session completion or abandonment.
   */
  function useUnsubscribe(): (sessionId: string) => void {
    const ctx = useContext(Ctx);
    return (sessionId: string) => ctx?.unsubscribe(sessionId);
  }

  return { Provider, useSubscription, useUnsubscribe };
}
