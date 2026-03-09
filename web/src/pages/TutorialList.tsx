import { CreateTutorialDialog } from "@/components/dialogs/CreateTutorialDialog";
import { useCreateTutorialDialog } from "@/contexts/CreateTutorialDialogContext";
import { useCreateTutorial, useListTutorials } from "@/lib/queries";
import type { CreateTutorialInput } from "@/lib/types";
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
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const difficultyColor: Record<string, string> = {
  beginner: "green",
  intermediate: "yellow",
  advanced: "red",
};

export default function TutorialList() {
  const navigate = useNavigate();
  const {
    isOpen,
    openDialog,
    closeDialog,
    titleRef,
    subjectRef,
    descriptionRef,
    difficulty,
    setDifficulty,
  } = useCreateTutorialDialog();

  const { data: tutorials = [], isLoading, error: listError } = useListTutorials();
  const createTutorialMutation = useCreateTutorial();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const title = titleRef.current?.value.trim() ?? "";
    const subject = subjectRef.current?.value.trim() ?? "";
    if (!title || !subject) return;

    const input: CreateTutorialInput = {
      title,
      subject,
      description: descriptionRef.current?.value.trim(),
      difficulty,
    };
    setError(null);
    try {
      await createTutorialMutation.mutateAsync(input);
      closeDialog();
      // Clear form fields
      if (titleRef.current) titleRef.current.value = "";
      if (subjectRef.current) subjectRef.current.value = "";
      if (descriptionRef.current) descriptionRef.current.value = "";
      setDifficulty("beginner");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const creating = createTutorialMutation.isPending;

  return (
    <Box
      id="tutorialList"
      maxW={{ base: "100vw", md: "4xl" }}
      w={{ md: "full" }}
      mx={{ md: "auto" }}
      pt={6}
    >
      <HStack
        id="tutorialListHeader"
        mb={6}
        justify="space-between"
        align="center"
        gap={3}
      >
        <Heading size="lg" flexShrink={0}>
          My Tutorials
        </Heading>
        <Button className="primary" onClick={openDialog}>
          New Tutorial
        </Button>
      </HStack>

      <CreateTutorialDialog
        isOpen={isOpen}
        onClose={closeDialog}
        titleRef={titleRef}
        subjectRef={subjectRef}
        descriptionRef={descriptionRef}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        creating={creating}
        handleCreate={handleCreate}
      />

      {(error ?? listError) && (
        <Text color="red.500" mb={4}>
          {error ?? (listError instanceof Error ? listError.message : String(listError))}
        </Text>
      )}

      {isLoading ? (
        <HStack justify="center" mt={16}>
          <Spinner size="xl" />
        </HStack>
      ) : tutorials.length === 0 ? (
        <Box textAlign="center" mt={16} color="gray.500">
          <Text>No tutorials yet. Create your first one!</Text>
        </Box>
      ) : (
        <VStack w="full" gap={4}>
          {tutorials.map((t) => (
            <Card.Root
              w="full"
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
                    <Badge
                      colorPalette={difficultyColor[t.difficulty] ?? "gray"}
                    >
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
        </VStack>
      )}
    </Box>
  );
}
