import { ChatInput } from "@/components/chat/ChatInput";
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
import { useApi } from "@/lib/ApiContext";
import type {
  SeminarSessionDetail,
  SeminarSessionPhase,
  Turn,
} from "@/lib/types";
import {
  Box,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const PHASE_LABELS: Record<SeminarSessionPhase, string> = {
  reconstruction: "Reconstruction",
  opposition: "Opposition",
  reversal: "Reversal",
  residue_required: "Residue Required",
  done: "Done",
};

const SeminarSessionRunner = () => {
  const { id } = useParams<{ id: string; }>();
  const api = useApi();
  const navigate = useNavigate();
  const unsubscribe = useSessionEventsUnsubscribe();

  const [session, setSession] = useState<SeminarSessionDetail | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Seconds remaining in the current phase, driven by SSE timer_tick. */
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  /** True while a phase_changed event is being processed; disables the input. */
  const [phaseLocked, setPhaseLocked] = useState(false);
  /** Set when the backend returns missing_locator (400) on a turn submit. */
  const [locatorError, setLocatorError] = useState<string | null>(null);

  const turnRef = useRef<HTMLTextAreaElement>(null);
  const residueRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getSession(id);
      setSession(detail);
      setTurns(detail.turns ?? []);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-scroll to bottom when turns update.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // Redirect to review if session is already completed/abandoned.
  useEffect(() => {
    if (session && session.status !== "in_progress") {
      navigate(`/sessions/${id}/review`, { replace: true });
    }
  }, [session, id, navigate]);

  // ── SSE subscription ────────────────────────────────────────────────────────

  useSessionEventsSubscription(id, {
    onTimerTick: (payload: TimerTickPayload) => {
      setSecondsRemaining(Math.ceil(payload.seconds_remaining));
    },

    onPhaseChanged: (payload: PhaseChangedPayload) => {
      // Lock input briefly while we refresh the session state.
      setPhaseLocked(true);
      setSecondsRemaining(
        payload.phase_ends_at
          ? Math.max(
            0,
            Math.ceil(
              (new Date(payload.phase_ends_at).getTime() - Date.now()) / 1000,
            ),
          )
          : null,
      );
      setSession((prev) =>
        prev
          ? {
            ...prev,
            phase: payload.phase,
            phase_ends_at: payload.phase_ends_at ?? prev.phase_ends_at,
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
      navigate(`/sessions/${id}/review`, { replace: true });
    },

    onError: (payload) => {
      setError(payload.message);
    },

    onConnectionError: (e) => {
      console.warn("[SSE] connection error", e);
    },
  });

  const handleSubmitTurn = async () => {
    if (!id || !turnRef.current) return;
    const text = turnRef.current.value.trim();
    if (!text) return;
    setSubmitting(true);
    setError(null);
    setLocatorError(null);
    try {
      const agentTurn = await api.submitTurn(id, text);
      // SSE turn_added will append both user and agent turns; clear the field.
      // Still do a local dedup-append as a fallback for clients without SSE.
      setTurns((prev) => {
        const alreadyHas = prev.some((t) => t.id === agentTurn.id);
        return alreadyHas ? prev : [...prev, agentTurn];
      });
      turnRef.current.value = "";
    } catch (e) {
      if (e instanceof ApiRequestError && e.message === "missing_locator") {
        const detail = e.detail as { message?: string; } | undefined;
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

  const handleSubmitResidue = async () => {
    if (!id || !residueRef.current) return;
    const text = residueRef.current.value.trim();
    if (!text) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitResidue(id, text);
      navigate(`/sessions/${id}/review`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbandon = async () => {
    if (!id || !window.confirm("Abandon this session?")) return;
    try {
      await api.abandonSession(id);
      unsubscribe(id); // Close SSE connection when abandoning
      navigate(`/sessions/${id}/review`, { replace: true });
    } catch (e) {
      setError(String(e));
    }
  };

  if (loading) {
    return (
      <HStack justify="center" mt={20}>
        <Spinner size="xl" />
      </HStack>
    );
  }

  if (!session) {
    return <Text color="red.500">{error ?? "Session not found."}</Text>;
  }

  const phase = session.phase;
  const isResiduePhase = phase === "residue_required";
  const isDone = phase === "done";
  const canSubmitTurns = !isResiduePhase && !isDone;
  // Derive thinking state from turns array so it persists across navigation
  const agentThinking =
    turns.length > 0 && turns[turns.length - 1].speaker === "user";

  return (
    <Flex w="full">
      <VStack h="full" flexGrow={1}>
        <SeminarSessionHeader
          detail={session}
          phaseInfo={{
            secondsRemaining: secondsRemaining ?? 0,
            isResiduePhase,
            isDone,
          }}
          toBack={`/seminars/${session.seminar_id}`}
          toExport={`/sessions/${id}/export`}
        />
        {/* E. Error banners */}
        {error && (
          <Text color="red.500" mb={4}>
            {error}
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
          {/* // TODO: implement seminar turn list */}
        </Box>
        <ChatInput />
      </VStack>
    </Flex>
  );
};

export default SeminarSessionRunner;
