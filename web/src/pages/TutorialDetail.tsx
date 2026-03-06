import { ApiRequestError } from "@/lib/api";
import { useApi } from "@/lib/ApiContext";
import type { Tutorial, TutorialSession } from "@/lib/types";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

const statusColor: Record<string, string> = {
  in_progress: "blue",
  complete: "green",
  abandoned: "gray",
};

export default function TutorialDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const navigate = useNavigate();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [sessions, setSessions] = useState<TutorialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setTutorial(await api.getTutorial(id));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    try {
      setSessions(await api.listTutorialSessions(id));
    } catch {
      // non-fatal
    }
  }, [id, api]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!id || !window.confirm("Delete this tutorial? This cannot be undone."))
      return;
    try {
      await api.deleteTutorial(id);
      navigate("/tutorials", { replace: true });
    } catch (e) {
      setError(String(e));
    }
  };

  const handleStartSession = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const sess = await api.createTutorialSession(id);
      navigate(`/tutorial-sessions/${sess.id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setStarting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    try {
      await api.deleteTutorialSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
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

  if (!tutorial) {
    return <Text color="red.500">{error ?? "Tutorial not found."}</Text>;
  }

  return (
    <Box>
      {/* Header */}
      <HStack mb={2} justify="space-between" align="start" wrap="wrap" gap={2}>
        <Box minW={0} flex={1}>
          <Heading size="lg" wordBreak="break-word">
            {tutorial.title}
          </Heading>
          <Text color="gray.500" fontSize="sm">
            {tutorial.subject}
          </Text>
        </Box>
        <HStack gap={2} wrap="wrap" flexShrink={0}>
          <Badge colorScheme="purple">{tutorial.difficulty}</Badge>
          <IconButton
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={handleDelete}
          >
            <Icon>
              <FaTrash />
            </Icon>
          </IconButton>
        </HStack>
      </HStack>

      {tutorial.description && (
        <Card.Root mb={6} p={4}>
          <Text
            fontSize="sm"
            color="gray.600"
            _dark={{ color: "gray.400" }}
          >
            {tutorial.description}
          </Text>
        </Card.Root>
      )}

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      {/* Sessions */}
      <Box>
        <HStack mb={4} justify="space-between">
          <Text fontWeight="medium">{sessions.length} session(s)</Text>
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            size="sm"
            loading={starting}
            onClick={handleStartSession}
          >
            Start Session
          </Button>
        </HStack>

        {sessions.length === 0 ? (
          <Text color="gray.500">No sessions yet. Start your first one!</Text>
        ) : (
          <Stack gap={3}>
            {sessions.map((s) => (
              <Card.Root key={s.id} _hover={{ shadow: "sm" }}>
                <Card.Body>
                  <HStack justify="space-between" wrap="wrap" gap={2}>
                    <Box
                      minW={0}
                      flex={1}
                      cursor="pointer"
                      onClick={() => navigate(`/tutorial-sessions/${s.id}`)}
                    >
                      <Text fontWeight="medium" wordBreak="break-word">
                        Session
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(s.started_at).toLocaleDateString()}
                        {s.ended_at &&
                          ` → ${new Date(s.ended_at).toLocaleDateString()}`}
                      </Text>
                    </Box>
                    <HStack gap={2} flexShrink={0}>
                      <Badge colorScheme={statusColor[s.status] ?? "gray"}>
                        {s.status}
                      </Badge>
                      <IconButton
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteSession(s.id);
                        }}
                      >
                        <Icon>
                          <FaTrash />
                        </Icon>
                      </IconButton>
                    </HStack>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
