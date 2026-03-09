import { useSession } from "@/lib/queries";
import type { SeminarSessionPhase, Turn } from "@/lib/types";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";

const PHASE_LABELS: Record<SeminarSessionPhase, string> = {
  reconstruction: "Reconstruction",
  opposition: "Opposition",
  reversal: "Reversal",
  residue_required: "Residue Required",
  done: "Done",
};

export default function SessionReview() {
  const { id } = useParams<{ id: string; }>();
  const navigate = useNavigate();

  const { data: session, isLoading, error } = useSession(id);

  if (isLoading) {
    return (
      <HStack justify="center" mt={20}>
        <Spinner size="xl" />
      </HStack>
    );
  }

  if (!session) {
    return <Text color="red.500">{error instanceof Error ? error.message : "Session not found."}</Text>;
  }

  // Group turns by phase for the readable review layout.
  const byPhase = session.turns.reduce<Record<string, Turn[]>>((acc, t) => {
    (acc[t.phase] ??= []).push(t);
    return acc;
  }, {});

  const statusColor: Record<string, string> = {
    in_progress: "blue",
    complete: "green",
    abandoned: "gray",
  };

  return (
    <Box maxW="3xl" mx="auto" w="full">
      <HStack mb={4} justify="space-between" wrap="wrap" gap={2}>
        <Box minW={0} flex={1}>
          <Heading size="lg" wordBreak="break-word">
            {session.section_label}
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Started {new Date(session.started_at).toLocaleString()}
            {session.ended_at && (
              <> · Ended {new Date(session.ended_at).toLocaleString()}</>
            )}
          </Text>
        </Box>
        <HStack gap={2} wrap="wrap" flexShrink={0}>
          <Badge
            colorScheme={statusColor[session.status] ?? "gray"}
            fontSize="sm"
            px={2}
            py={1}
          >
            {session.status}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/seminar-sessions/${id}/export`)}
          >
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/seminars/${session.seminar_id}`)}
          >
            ← Seminar
          </Button>
        </HStack>
      </HStack>

      {session.residue_text && (
        <Card.Root mb={6} borderColor="red.200" borderWidth={1}>
          <Card.Body>
            <Text
              fontWeight="semibold"
              mb={1}
              color="red.600"
              _dark={{ color: "red.300" }}
            >
              Residue
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {session.residue_text}
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      {Object.entries(byPhase).map(([phase, phaseTurns]) => (
        <Box key={phase} mb={8}>
          <HStack mb={3}>
            <Heading size="sm" textTransform="uppercase" letterSpacing="wide">
              {PHASE_LABELS[phase as SeminarSessionPhase] ?? phase}
            </Heading>
            <hr />
          </HStack>
          <VStack align="stretch" gap={4}>
            {phaseTurns.map((t) => (
              <Box
                key={t.id}
                pl={4}
                borderLeft="3px solid"
                borderColor={t.speaker === "user" ? "blue.300" : "teal.300"}
              >
                <HStack mb={1} gap={2}>
                  <Badge
                    colorScheme={t.speaker === "user" ? "blue" : "teal"}
                    size="sm"
                  >
                    {t.speaker}
                  </Badge>
                  {t.flags?.length > 0 &&
                    t.flags.map((f) => (
                      <Badge key={f} colorScheme="red" size="sm">
                        {f}
                      </Badge>
                    ))}
                  <Text fontSize="xs" color="gray.400">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </Text>
                </HStack>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {t.text}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      ))}

      {session.turns.length === 0 && (
        <Text color="gray.500">No turns recorded for this session.</Text>
      )}
    </Box>
  );
}
