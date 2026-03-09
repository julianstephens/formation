import { ChatMessage } from "@/components/chat/ChatMessage";
import { Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";

// Minimal shape required by TurnList — satisfied by both Turn and TutorialTurn.
export interface BaseTurn {
  id: string;
  speaker: string;
  text: string;
  created_at: string;
  /** Optional per-turn failure flag (used by tutorial turns). */
  failed?: boolean;
}

interface TurnListProps {
  turns: BaseTurn[];
  /**
   * Accumulated streaming text keyed by turn_id.
   * A turn is "streaming" while its id is present here.
   * Pass an empty Map (default) when streaming is not yet implemented.
   */
  streamingTurns?: Map<string, string>;
  /**
   * IDs of turns that failed. Takes precedence over BaseTurn.failed so the
   * caller can mark optimistic turns as failed without mutating turn objects.
   */
  failedTurns?: Set<string>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export const TurnList = ({
  turns,
  streamingTurns = new Map(),
  failedTurns = new Set(),
  bottomRef,
}: TurnListProps) => {
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  // Show thinking spinner when the agent is streaming or when the last turn
  // is a non-failed user turn still waiting for an agent response.
  const agentThinking =
    streamingTurns.size > 0 ||
    (!!lastTurn &&
      lastTurn.speaker === "user" &&
      !(lastTurn.failed ?? false) &&
      !failedTurns.has(lastTurn.id));

  // Streaming agent turns that haven't been committed to the turns array yet.
  const streamingOnlyTurnIds = Array.from(streamingTurns.keys()).filter(
    (turnId) => !turns.some((t) => t.id === turnId),
  );

  return (
    <Box
      id="turnList"
      minH={{ base: "180px", md: "300px" }}
      maxH={{ base: "40vh", md: "55vh" }}
      overflowY="auto"
      mb={4}
    >
      {turns.length === 0 && streamingOnlyTurnIds.length === 0 ? (
        <Text color="gray.400" textAlign="center" mt={8}>
          Conversation will appear here. Submit a message to get started.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {turns
            .filter((t) => t.text?.trim() || streamingTurns.has(t.id))
            .map((t) => {
              const streamingText = streamingTurns.get(t.id);
              const displayText = streamingText ?? t.text;
              const isStreaming = !!streamingText;
              const isFailed = (t.failed ?? false) || failedTurns.has(t.id);

              return (
                <ChatMessage
                  key={t.id}
                  role={
                    t.speaker === "user"
                      ? "user"
                      : t.speaker === "system"
                        ? "system"
                        : "agent"
                  }
                  content={isStreaming ? streamingText : displayText}
                  timestamp={new Date(t.created_at).toLocaleTimeString()}
                  failed={isFailed}
                />
              );
            })}

          {/* Agent responses that are streaming but not yet in turns[] */}
          {streamingOnlyTurnIds.map((turnId) => (
            <ChatMessage
              key={turnId}
              role="agent"
              content={streamingTurns.get(turnId) ?? ""}
              timestamp={new Date().toLocaleTimeString()}
              failed={false}
            />
          ))}

          {agentThinking && (
            <HStack gap={2} w="full" px={3} py={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                Agent is thinking…
              </Text>
            </HStack>
          )}
        </VStack>
      )}
      <div ref={bottomRef} />
    </Box>
  );
};
