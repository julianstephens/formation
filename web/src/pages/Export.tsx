/**
 * Export page: allows downloading a seminar, session, tutorial, or tutorial session transcript as JSON or
 * Markdown.  The URL shape determines the resource type:
 *
 *   /seminars/:id/export           →  seminar export
 *   /seminar-sessions/:id/export           →  session export
 *   /tutorials/:id/export          →  tutorial export
 *   /tutorial-sessions/:id/export  →  tutorial session export
 */

import { useExport } from "@/lib/queries";
import {
  Box,
  Button,
  Card,
  Heading,
  HStack,
  RadioGroup,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { useNavigate, useParams } from "react-router-dom";

type Format = "json" | "md";
type ResourceType =
  | "seminar"
  | "session"
  | "tutorial"
  | "tutorial_session"
  | "problem_set";

interface ExportPageProps {
  /** Controls whether the page exports a seminar, session, tutorial, or tutorial session. */
  resourceType: ResourceType;
}

export default function Export({ resourceType }: ExportPageProps) {
  const { id } = useParams<{ id: string }>();
  const exportMutation = useExport();
  const navigate = useNavigate();
  const [format, setFormat] = useState<Format>("json");
  const [error, setError] = useState<string | null>(null);

  const getFileName = () => {
    switch (resourceType) {
      case "seminar":
        return `seminar-${id ?? "export"}.${format}`;
      case "session":
        return `session-${id ?? "export"}.${format}`;
      case "tutorial":
        return `tutorial-${id ?? "export"}.${format}`;
      case "tutorial_session":
        return `tutorial-session-${id ?? "export"}.${format}`;
      case "problem_set":
        return `problem-set-${id ?? "export"}.${format}`;
    }
  };

  const fileName = getFileName();

  const handleDownload = async () => {
    if (!id) return;
    setError(null);
    console.log(`[Export] Attempting to export ${resourceType} with ID:`, id);
    try {
      const result = await exportMutation.mutateAsync({
        resourceType,
        id,
        format,
      });
      console.log(`[Export] Success! Opening URL:`, result.url);
      window.open(result.url, "_blank");
    } catch (e) {
      console.error("Export error:", e);
      if (e instanceof Error) {
        setError(`Export failed: ${e.message}`);
      } else {
        setError(`Export failed: ${String(e)}`);
      }
    }
  };

  const getTitle = () => {
    switch (resourceType) {
      case "seminar":
        return "Seminar";
      case "session":
        return "Session";
      case "tutorial":
        return "Tutorial";
      case "tutorial_session":
        return "Tutorial Session";
      case "problem_set":
        return "Problem Set";
    }
  };

  const getBackPath = () => {
    switch (resourceType) {
      case "seminar":
        return `/seminars/${id}`;
      case "session":
        return `/seminar-sessions/${id}/review`;
      case "tutorial":
        return `/tutorials/${id}`;
      case "tutorial_session":
        return `/tutorial-sessions/${id}`;
      case "problem_set":
        // Problem sets are nested, use browser back navigation
        return null;
    }
  };

  const backPath = getBackPath();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <Box maxW="lg" mx="auto" w="full">
      <HStack mb={6} justify="space-between">
        <Heading size="lg">Export {getTitle()}</Heading>
        <Button
          className="grey"
          alignItems="center"
          size="sm"
          variant="ghost"
          onClick={handleBack}
        >
          <LuArrowLeft />
          Back
        </Button>
      </HStack>

      <Card.Root p={6}>
        <VStack gap={6} align="stretch">
          <Box>
            <Text fontWeight="medium" mb={3}>
              Format
            </Text>
            <RadioGroup.Root
              value={format}
              onValueChange={(v) => setFormat(v.value as Format)}
            >
              <HStack gap={4}>
                <RadioGroup.Item value="json">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>JSON</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="md">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Markdown</RadioGroup.ItemText>
                </RadioGroup.Item>
              </HStack>
            </RadioGroup.Root>
          </Box>

          <Box p={3} bg="gray.50" _dark={{ bg: "gray.800" }} rounded="md">
            <Text fontSize="sm" color="gray.500">
              File name: <strong>{fileName}</strong>
            </Text>
          </Box>

          {error && <Text color="red.500">{error}</Text>}

          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            onClick={handleDownload}
          >
            Download
          </Button>
        </VStack>
      </Card.Root>
    </Box>
  );
}
