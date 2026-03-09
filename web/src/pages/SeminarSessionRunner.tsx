import { ChatActions } from "@/components/chat/ChatActions";
import { ChatInput } from "@/components/chat/ChatInput";
import { TurnList } from "@/components/chat/TurnList";
import { SeminarSessionHeader } from "@/components/seminars/SeminarSessionHeader";
import {
  useSessionEventsSubscription,
  useSessionEventsUnsubscribe,
} from "@/contexts/SessionEventsContext";
import type {
  PhaseChangedPayload,
  TimerTickPayload,
  TurnAddedPayload,
} from "@/hooks/useSessionEvents";
import { ApiRequestError } from "@/lib/api";
import {
  useAbandonSession,
  useSession,
  useSubmitResidue,
  useSubmitTurn,
} from "@/lib/queries";
import type { SeminarSessionDetail, Turn } from "@/lib/types";
import {
  Box,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SeminarSessionRunner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const unsubscribe = useSessionEventsUnsubscribe();

  const {
    data: sessionData,
    isLoading,
    error: loadError,
    refetch,
  } = useSession(id);
  const submitTurnMutation = useSubmitTurn();
  const submitResidueMutation = useSubmitResidue();
  const abandonSessionMutation = useAbandonSession();

  const [session, setSession] = useState<SeminarSessionDetail | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Seconds remaining in the current phase, driven by SSE timer_tick. */
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  /** True while a phase_changed event is being processed; disables the input. */
  const [phaseLocked, setPhaseLocked] = useState(false);
  /** Set when the backend returns missing_locator (400) on a turn submit. */
  const [locatorError, setLocatorError] = useState<string | null>(null);

  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  /** Mirror of session.phase kept in a ref so SSE handlers can read it without
   * being recreated on every render. Used to detect phase drift. */
  const sessionPhaseRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // Streaming agent responses — keyed by turn_id (seminar streaming, future).
  const [streamingTurns] = useState<Map<string, string>>(new Map());

  // Initialize local state from query data on first load.
  useEffect(() => {
    if (sessionData && !initializedRef.current) {
      initializedRef.current = true;
      setSession(sessionData);
      setTurns(sessionData.turns ?? []);
      if (sessionData.phase !== "done" && sessionData.phase_ends_at) {
        setSecondsRemaining(
          Math.max(
            0,
            Math.ceil(
              (new Date(sessionData.phase_ends_at).getTime() - Date.now()) /
                1000,
            ),
          ),
        );
      }
    }
  }, [sessionData]);

  // Keep sessionPhaseRef in sync so SSE handlers can read the current phase.
  useEffect(() => {
    if (session) sessionPhaseRef.current = session.phase;
  }, [session]);

  // Auto-scroll to bottom when turns update.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // Redirect to review if session is already completed/abandoned.
  useEffect(() => {
    if (session && session.status !== "in_progress") {
      navigate(`/seminar-sessions/${id}/review`, { replace: true });
    }
  }, [session, id, navigate]);

  // ── SSE subscription ────────────────────────────────────────────────────────

  useSessionEventsSubscription(id, {
    onTimerTick: (payload: TimerTickPayload) => {
      setSecondsRemaining(Math.ceil(payload.seconds_remaining));
      // Safety net: if the tick's phase doesn't match local state the client
      // missed a phase_changed event (e.g. fired during a reconnect window).
      // Re-fetch the session from the API to get fully-fresh state.
      if (
        sessionPhaseRef.current !== null &&
        sessionPhaseRef.current !== payload.phase
      ) {
        void refetch().then(({ data: fresh }) => {
          if (fresh) {
            setSession(fresh);
            setTurns(fresh.turns ?? []);
            if (fresh.phase !== "done" && fresh.phase_ends_at) {
              setSecondsRemaining(
                Math.max(
                  0,
                  Math.ceil(
                    (new Date(fresh.phase_ends_at).getTime() - Date.now()) /
                      1000,
                  ),
                ),
              );
            }
          }
        });
      }
    },

    onPhaseChanged: (payload: PhaseChangedPayload) => {
      // Update the ref synchronously so any timer_tick that arrives before the
      // next render doesn't misdetect a phase mismatch and suppress refetch().
      sessionPhaseRef.current = payload.phase;
      // Lock input briefly while we refresh the session state.
      setPhaseLocked(true);
      // Clear and wait for the next authoritative timer_tick instead of
      // computing from phase_ends_at — SSE delivery latency makes the
      // client-side calculation unreliable and causes progress jumps.
      setSecondsRemaining(null);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              phase: payload.phase,
              phase_ends_at: payload.phase_ends_at ?? prev.phase_ends_at,
              // Use the server-recorded timestamp to avoid client clock skew
              // skewing totalDurationSeconds in the progress bar calculation.
              phase_started_at:
                payload.phase_started_at ?? new Date().toISOString(),
            }
          : prev,
      );
      setPhaseLocked(false);
      setLocatorError(null);
    },

    onTurnAdded: (payload: TurnAddedPayload) => {
      setTurns((prev) => {
        if (prev.some((t) => t.id === payload.turn.id)) return prev;
        return [...prev, payload.turn];
      });
    },

    onSessionCompleted: () => {
      if (id) unsubscribe(id); // Close SSE connection when session completes
      navigate(`/seminar-sessions/${id}/review`, { replace: true });
    },

    onError: (payload) => {
      setError(payload.message);
    },

    onConnectionError: (e) => {
      console.warn("[SSE] connection error", e);
    },
  });

  const handleSubmitTurn = async (text: string) => {
    if (!id || !text) return;
    setSubmitting(true);
    setError(null);
    setLocatorError(null);
    try {
      const agentTurn = await submitTurnMutation.mutateAsync({
        sessionId: id,
        text,
      });
      // SSE turn_added will append both user and agent turns.
      // Also do a local dedup-append as a fallback for clients without SSE.
      setTurns((prev) => {
        const alreadyHas = prev.some((t) => t.id === agentTurn.id);
        return alreadyHas ? prev : [...prev, agentTurn];
      });
    } catch (e) {
      if (e instanceof ApiRequestError && e.message === "missing_locator") {
        const detail = e.detail as { message?: string } | undefined;
        setLocatorError(
          detail?.message ??
            "Claim must include a text locator or be marked UNANCHORED.",
        );
      } else {
        const msg = e instanceof ApiRequestError ? e.message : String(e);
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResidue = async (text: string) => {
    if (!id || !text) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitResidueMutation.mutateAsync({
        sessionId: id,
        residueText: text,
      });
      navigate(`/seminar-sessions/${id}/review`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    const notes = notesRef.current?.value ?? "";
    setError(null);
    try {
      await submitResidueMutation.mutateAsync({
        sessionId: id,
        residueText: notes,
      });
      navigate(`/seminar-sessions/${id}/review`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    }
  };

  const handleAbandon = async () => {
    if (!id || !window.confirm("Abandon this session?")) return;
    try {
      await abandonSessionMutation.mutateAsync(id);
      unsubscribe(id); // Close SSE connection when abandoning
      navigate(`/seminar-sessions/${id}/review`, { replace: true });
    } catch (e) {
      setError(String(e));
    }
  };

  if (isLoading) {
    return (
      <HStack justify="center" mt={20}>
        <Spinner size="xl" />
      </HStack>
    );
  }

  if (!session) {
    return (
      <Text color="red.500">
        {loadError instanceof Error ? loadError.message : "Session not found."}
      </Text>
    );
  }

  const phase = session.phase;
  const isResiduePhase = phase === "residue_required";
  const isDone = phase === "done";

  return (
    <Flex w="full">
      <VStack h="full" pb={6} flexGrow={1}>
        <SeminarSessionHeader
          detail={session}
          phaseInfo={{
            secondsRemaining: secondsRemaining,
            isResiduePhase,
            isDone,
          }}
          toBack={`/seminars/${session.seminar_id}`}
          toExport={`/seminar-sessions/${id}/export`}
        />
        {/* E. Error banners */}
        {error && (
          <Text color="red.500" mb={4}>
            {error}
          </Text>
        )}
        {locatorError && (
          <Text color="orange.400" fontSize="sm" mb={4}>
            ⚠ {locatorError}
          </Text>
        )}
        {/* Abandoned banner */}
        {session.status === "abandoned" && (
          <Text color="gray.500" fontSize="sm" mb={4} fontStyle="italic">
            This session has been abandoned.
          </Text>
        )}
        <Box
          id="conversationContainer"
          maxW={{ base: "100vw", md: "4xl" }}
          w={{ md: "full" }}
          mx={{ base: "4", md: "auto" }}
          display={{ md: "flex" }}
          flexDir="column"
          gap={6}
          alignItems="flex-start"
        >
          <Heading size="sm" mb={3}>
            Conversation
          </Heading>
          <TurnList
            turns={turns}
            streamingTurns={streamingTurns}
            bottomRef={bottomRef}
          />
        </Box>
        <ChatInput
          onSend={(msg) =>
            isResiduePhase
              ? void handleSubmitResidue(msg)
              : void handleSubmitTurn(msg)
          }
          disabled={isDone || phaseLocked || submitting}
          placeholder={isResiduePhase ? "Write your residue…" : "Your message…"}
        />
        <ChatActions
          onComplete={handleComplete}
          onAbandon={handleAbandon}
          completing={submitResidueMutation.isPending}
          completeDisabled={isDone || phaseLocked || submitting}
          abandoning={abandonSessionMutation.isPending}
          abandonDisabled={isDone || phaseLocked || submitting}
          showCompleteForm={showCompleteForm}
          onToggleCompleteForm={() => setShowCompleteForm((v) => !v)}
          notesRef={notesRef}
        />
      </VStack>
    </Flex>
  );
};

export default SeminarSessionRunner;
