/**
 * TutorialSessionEventsContext – manages tutorial SSE subscriptions globally.
 *
 * Mirrors the pattern used by SessionEventsContext for seminar sessions,
 * but uses tutorial-specific endpoints and event types only.
 * Never touches seminar components, seminar contexts, or seminar endpoints.
 */
/* eslint-disable react-refresh/only-export-components */

import type {
  TutorialArtifactAddedPayload,
  TutorialArtifactDeletedPayload,
  TutorialSessionCompletedPayload,
  TutorialSseErrorPayload,
  TutorialTurnAddedPayload,
  UseTutorialSessionEventsOptions,
} from "@/hooks/useTutorialSessionEvents";
import { createSseContext } from "@/lib/createSseContext";
import type { AgentResponseChunkPayload } from "@/lib/types";

const BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "") + "/v1";

function dispatch(
  type: string,
  payload: unknown,
  opts: UseTutorialSessionEventsOptions,
): void {
  switch (type) {
    case "turn_added":
      opts.onTurnAdded?.(payload as TutorialTurnAddedPayload);
      break;
    case "agent_response_chunk":
      opts.onAgentResponseChunk?.(payload as AgentResponseChunkPayload);
      break;
    case "tutorial_artifact_added":
      opts.onArtifactAdded?.(payload as TutorialArtifactAddedPayload);
      break;
    case "tutorial_artifact_deleted":
      opts.onArtifactDeleted?.(payload as TutorialArtifactDeletedPayload);
      break;
    case "session_completed":
      opts.onSessionCompleted?.(payload as TutorialSessionCompletedPayload);
      break;
    case "error":
      opts.onError?.(payload as TutorialSseErrorPayload);
      break;
    default:
      break;
  }
}

const {
  Provider: TutorialSessionEventsProvider,
  useSubscription: useTutorialSessionEventsSubscription,
  useUnsubscribe: useTutorialSessionEventsUnsubscribe,
} = createSseContext<UseTutorialSessionEventsOptions>(
  (sessionId) => `${BASE_URL}/tutorial-sessions/${sessionId}/events`,
  dispatch,
);

export {
  TutorialSessionEventsProvider,
  useTutorialSessionEventsSubscription,
  useTutorialSessionEventsUnsubscribe,
};
