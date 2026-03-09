/**
 * SessionEventsContext – manages SSE subscriptions globally per session.
 *
 * Keeps SSE connections alive across navigation so agent responses
 * aren't interrupted when the user moves to the review page.
 *
 * The connection is only aborted on explicit abandonment or session completion.
 */

import type {
  PhaseChangedPayload,
  SessionCompletedPayload,
  SseErrorPayload,
  TimerTickPayload,
  TurnAddedPayload,
  UseSessionEventsOptions,
} from "@/hooks/useSessionEvents";
import { createSseContext } from "@/lib/createSseContext";

const BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "") + "/v1";

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
      break;
  }
}

const {
  Provider: SessionEventsProvider,
  useSubscription: useSessionEventsSubscription,
  useUnsubscribe: useSessionEventsUnsubscribe,
} = createSseContext<UseSessionEventsOptions>(
  (sessionId) => `${BASE_URL}/seminar-sessions/${sessionId}/events`,
  dispatch,
);

export {
  SessionEventsProvider,
  useSessionEventsSubscription,
  useSessionEventsUnsubscribe
};

