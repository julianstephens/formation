import { useApi } from "@/lib/ApiContext";
import type { CreateTutorialInput, Tutorial } from "@/lib/types";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const difficultyColor: Record<string, string> = {
  beginner: "green",
  intermediate: "yellow",
  advanced: "red",
};

export default function TutorialList() {
  const api = useApi();
  const navigate = useNavigate();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Simple inline creation form state
  const [showForm, setShowForm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTutorials(await api.listTutorials());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const title = titleRef.current?.value.trim() ?? "";
    const subject = subjectRef.current?.value.trim() ?? "";
    if (!title || !subject) return;

    const input: CreateTutorialInput = { title, subject, description: descriptionRef.current?.value.trim(), difficulty };
    setCreating(true);
    try {
      const created = await api.createTutorial(input);
      setTutorials((prev) => [created, ...prev]);
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <HStack mb={6} justify="space-between" align="center" gap={3}>
        <Heading size="lg" flexShrink={0}>
          My Tutorials
        </Heading>
        <Button
          bg="#f59e0b"
          color="black"
          _hover={{ bg: "#fbbf24" }}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "New Tutorial"}
        </Button>
      </HStack>

      {showForm && (
        <Card.Root mb={6} p={4}>
          <VStack align="stretch" gap={3}>
            <Heading size="sm">New Tutorial</Heading>
            <input
              ref={titleRef}
              placeholder="Title *"
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
            />
            <input
              ref={subjectRef}
              placeholder="Subject *"
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
            />
            <input
              ref={descriptionRef}
              placeholder="Description (optional)"
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <Button
              bg="#f59e0b"
              color="black"
              _hover={{ bg: "#fbbf24" }}
              loading={creating}
              onClick={handleCreate}
            >
              Create
            </Button>
          </VStack>
        </Card.Root>
      )}

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      {loading ? (
        <HStack justify="center" mt={16}>
          <Spinner size="xl" />
        </HStack>
      ) : tutorials.length === 0 ? (
        <Box textAlign="center" mt={16} color="gray.500">
          <Text>No tutorials yet. Create your first one!</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {tutorials.map((t) => (
            <Card.Root
              key={t.id}
              cursor="pointer"
              _hover={{ shadow: "md" }}
              onClick={() => navigate(`/tutorials/${t.id}`)}
            >
              <Card.Body>
                <VStack align="start" gap={2}>
                  <HStack justify="space-between" w="full">
                    <Heading size="sm" lineClamp={1}>
                      {t.title}
                    </Heading>
                    <Badge colorScheme={difficultyColor[t.difficulty] ?? "gray"}>
                      {t.difficulty}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    {t.subject}
                  </Text>
                  {t.description && (
                    <Text
                      fontSize="sm"
                      lineClamp={2}
                      color="gray.700"
                      _dark={{ color: "gray.300" }}
                    >
                      {t.description}
                    </Text>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
