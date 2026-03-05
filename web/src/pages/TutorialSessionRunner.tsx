import { ApiRequestError } from "@/lib/api";
import { useApi } from "@/lib/ApiContext";
import type { Artifact, ArtifactKind, TutorialSessionDetail } from "@/lib/types";
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
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

const artifactKindColor: Record<string, string> = {
  summary: "blue",
  notes: "green",
  problem_set: "orange",
  diagnostic: "purple",
};

const ARTIFACT_KINDS = ["summary", "notes", "problem_set", "diagnostic"] as const satisfies readonly ArtifactKind[];

export default function TutorialSessionRunner() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<TutorialSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  // Artifact creation form
  const [showArtifactForm, setShowArtifactForm] = useState(false);
  const [artifactKind, setArtifactKind] = useState<ArtifactKind>("notes");
  const artifactTitleRef = useRef<HTMLInputElement>(null);
  const artifactContentRef = useRef<HTMLTextAreaElement>(null);
  const [creatingArtifact, setCreatingArtifact] = useState(false);

  // Notes for completion
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getTutorialSession(id));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      const notes = notesRef.current?.value.trim() ?? "";
      const updated = await api.completeTutorialSession(id, notes);
      setDetail((prev) => prev ? { ...prev, ...updated } : null);
      setShowCompleteForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setCompleting(false);
    }
  };

  const handleAbandon = async () => {
    if (!id || !window.confirm("Abandon this session?")) return;
    setAbandoning(true);
    try {
      const updated = await api.abandonTutorialSession(id);
      setDetail((prev) => prev ? { ...prev, ...updated } : null);
    } catch (e) {
      setError(String(e));
    } finally {
      setAbandoning(false);
    }
  };

  const handleCreateArtifact = async () => {
    if (!id) return;
    const title = artifactTitleRef.current?.value.trim() ?? "";
    const content = artifactContentRef.current?.value.trim() ?? "";
    if (!title || !content) return;

    setCreatingArtifact(true);
    try {
      const artifact = await api.createArtifact(id, { kind: artifactKind, title, content });
      setDetail((prev) =>
        prev ? { ...prev, artifacts: [...prev.artifacts, artifact] } : null,
      );
      setShowArtifactForm(false);
      if (artifactTitleRef.current) artifactTitleRef.current.value = "";
      if (artifactContentRef.current) artifactContentRef.current.value = "";
    } catch (e) {
      setError(String(e));
    } finally {
      setCreatingArtifact(false);
    }
  };

  const handleDeleteArtifact = async (artifact: Artifact) => {
    if (!id || !window.confirm(`Delete artifact "${artifact.title}"?`)) return;
    try {
      await api.deleteArtifact(id, artifact.id);
      setDetail((prev) =>
        prev
          ? { ...prev, artifacts: prev.artifacts.filter((a) => a.id !== artifact.id) }
          : null,
      );
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

  if (!detail) {
    return <Text color="red.500">{error ?? "Session not found."}</Text>;
  }

  const isTerminal = detail.status === "complete" || detail.status === "abandoned";

  return (
    <Box>
      {/* Header */}
      <HStack mb={4} justify="space-between" align="start" wrap="wrap" gap={2}>
        <Box>
          <Heading size="md">Tutorial Session</Heading>
          <Text fontSize="sm" color="gray.500">
            Started {new Date(detail.started_at).toLocaleString()}
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <Badge
            colorScheme={
              detail.status === "complete"
                ? "green"
                : detail.status === "abandoned"
                  ? "gray"
                  : "blue"
            }
          >
            {detail.status}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      {/* Session notes (shown when complete) */}
      {detail.notes && (
        <Card.Root mb={4} p={4} borderLeft="4px solid" borderColor="green.400">
          <Text fontSize="sm" fontStyle="italic">
            <strong>Session notes:</strong> {detail.notes}
          </Text>
        </Card.Root>
      )}

      {/* Artifacts */}
      <Box mb={6}>
        <HStack mb={3} justify="space-between">
          <Heading size="sm">Artifacts ({detail.artifacts.length})</Heading>
          {!isTerminal && (
            <Button
              size="sm"
              bg="#f59e0b"
              color="black"
              _hover={{ bg: "#fbbf24" }}
              onClick={() => setShowArtifactForm((v) => !v)}
            >
              {showArtifactForm ? "Cancel" : "Add Artifact"}
            </Button>
          )}
        </HStack>

        {showArtifactForm && (
          <Card.Root mb={4} p={4}>
            <VStack align="stretch" gap={3}>
              <select
                value={artifactKind}
                onChange={(e) => setArtifactKind(e.target.value as ArtifactKind)}
                style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
              >
                {ARTIFACT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                ref={artifactTitleRef}
                placeholder="Title *"
                style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4 }}
              />
              <Textarea
                ref={artifactContentRef}
                placeholder="Content *"
                rows={6}
              />
              <Button
                bg="#f59e0b"
                color="black"
                _hover={{ bg: "#fbbf24" }}
                loading={creatingArtifact}
                onClick={handleCreateArtifact}
              >
                Save Artifact
              </Button>
            </VStack>
          </Card.Root>
        )}

        {detail.artifacts.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            No artifacts yet.
          </Text>
        ) : (
          <Stack gap={3}>
            {detail.artifacts.map((a) => (
              <Card.Root key={a.id} _hover={{ shadow: "sm" }}>
                <Card.Body>
                  <HStack justify="space-between" align="start" wrap="wrap" gap={2}>
                    <Box minW={0} flex={1}>
                      <HStack gap={2} mb={1}>
                        <Badge colorScheme={artifactKindColor[a.kind] ?? "gray"}>
                          {a.kind.replace("_", " ")}
                        </Badge>
                        <Text fontWeight="medium" wordBreak="break-word">
                          {a.title}
                        </Text>
                      </HStack>
                      <Text
                        fontSize="sm"
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                        whiteSpace="pre-wrap"
                        lineClamp={4}
                      >
                        {a.content}
                      </Text>
                      <Text fontSize="xs" color="gray.400" mt={1}>
                        {new Date(a.created_at).toLocaleString()}
                      </Text>
                    </Box>
                    {!isTerminal && (
                      <IconButton
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        flexShrink={0}
                        onClick={() => void handleDeleteArtifact(a)}
                      >
                        <Icon>
                          <FaTrash />
                        </Icon>
                      </IconButton>
                    )}
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        )}
      </Box>

      {/* Actions */}
      {!isTerminal && (
        <HStack gap={3} mt={4} wrap="wrap">
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            onClick={() => setShowCompleteForm((v) => !v)}
          >
            {showCompleteForm ? "Cancel" : "Complete Session"}
          </Button>
          <Button
            variant="outline"
            colorScheme="red"
            loading={abandoning}
            onClick={handleAbandon}
          >
            Abandon
          </Button>
        </HStack>
      )}

      {showCompleteForm && (
        <Card.Root mt={4} p={4}>
          <VStack align="stretch" gap={3}>
            <Text fontWeight="medium">Session Notes (optional)</Text>
            <Textarea ref={notesRef} placeholder="Add any final notes..." rows={4} />
            <Button
              bg="#f59e0b"
              color="black"
              _hover={{ bg: "#fbbf24" }}
              loading={completing}
              onClick={handleComplete}
            >
              Confirm Complete
            </Button>
          </VStack>
        </Card.Root>
      )}
    </Box>
  );
}
