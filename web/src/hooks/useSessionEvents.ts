/**
 * useSessionEvents – SSE subscription hook for a single session.
 *
 * Uses fetch() + ReadableStream so an Authorization header can be injected;
 * the browser's native EventSource does not support custom headers.
 *
 * Reconnection: the hook does NOT automatically reconnect. The parent
 * component should unmount/remount (or change sessionId) to reconnect.
 *
 * Handler stability: the options object is captured at mount time and is NOT
 * tracked as a dependency to avoid re-opening the stream whenever parent
 * state changes. Callers should stabilise callbacks with useCallback or pass
 * module-level functions when that matters.
 */

import { useAccessToken } from "@/auth/useAuth";
import type { SeminarSessionPhase, Turn } from "@/lib/types";
import { useEffect } from "react";

const BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "") + "/v1";

// ── Payload types (mirror internal/sse/hub.go) ────────────────────────────────

export interface PhaseChangedPayload {
  session_id: string;
  phase: SeminarSessionPhase;
  /** ISO-8601 timestamp; absent when phase has no time limit (e.g. done). */
  phase_ends_at?: string;
  /** ISO-8601 timestamp of when the new phase started, as recorded by the server. */
  phase_started_at?: string;
}

export interface TimerTickPayload {
  session_id: string;
  phase: SeminarSessionPhase;
  seconds_remaining: number;
}

export interface TurnAddedPayload {
  session_id: string;
  turn: Turn;
}

export interface SessionCompletedPayload {
  session_id: string;
  status: string;
}

export interface SseErrorPayload {
  message: string;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface UseSessionEventsOptions {
  /** Fires when the backend scheduler advances the session phase. */
  onPhaseChanged?: (payload: PhaseChangedPayload) => void;
  /** Fires every ~1 s with the remaining seconds in the current phase. */
  onTimerTick?: (payload: TimerTickPayload) => void;
  /** Fires when a new turn (user or agent) is persisted. */
  onTurnAdded?: (payload: TurnAddedPayload) => void;
  /** Fires when the session reaches a terminal state (done / abandoned). */
  onSessionCompleted?: (payload: SessionCompletedPayload) => void;
  /** Fires on a non-fatal stream-level error emitted by the server. */
  onError?: (payload: SseErrorPayload) => void;
  /** Fires when the fetch connection itself fails or the stream ends unexpectedly. */
  onConnectionError?: (error: unknown) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Opens an SSE stream for `sessionId` and calls the supplied handlers as
 * events arrive. Cleans up (aborts the fetch) on unmount.
 */
export function useSessionEvents(
  sessionId: string | undefined,
  options: UseSessionEventsOptions,
): void {
  const getToken = useAccessToken();

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const controller = new AbortController();

    async function connect() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${BASE_URL}/seminar-sessions/${sessionId}/events`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          options.onConnectionError?.(
            new Error(`SSE connect failed: ${res.status} ${res.statusText}`),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });

          // SSE messages are delimited by blank lines ("event: …\ndata: …\n\n").
          // Split on double-newline; retain the trailing incomplete chunk.
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            let eventType = "message";
            const dataLines: string[] = [];

            for (const line of part.split("\n")) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
              }
              // Ignore ": heartbeat" comments and blank lines.
            }

            if (dataLines.length === 0) continue;

            let payload: unknown;
            try {
              payload = JSON.parse(dataLines.join("\n")) as unknown;
            } catch {
              // Malformed JSON – skip this message.
              continue;
            }

            dispatch(eventType, payload, options);
          }
        }
      } catch (e) {
        if (
          !cancelled &&
          !(e instanceof DOMException && e.name === "AbortError")
        ) {
          options.onConnectionError?.(e);
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `options` is intentionally omitted from deps – see module docblock.
    // `getToken` identity is stable across renders (Auth0 SDK contract).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, getToken]);
}

// ── Internal dispatch ─────────────────────────────────────────────────────────

function dispatch(
  type: string,
  payload: unknown,
  opts: UseSessionEventsOptions,
): void {
  switch (type) {
    case "phase_changed":
      opts.onPhaseChanged?.(payload as PhaseChangedPayload);
      break;
    case "timer_tick":
      opts.onTimerTick?.(payload as TimerTickPayload);
      break;
    case "turn_added":
      opts.onTurnAdded?.(payload as TurnAddedPayload);
      break;
    case "session_completed":
      opts.onSessionCompleted?.(payload as SessionCompletedPayload);
      break;
    case "error":
      opts.onError?.(payload as SseErrorPayload);
      break;
    default:
      // Unknown event type – ignore.
      break;
  }
}
