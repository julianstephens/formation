import { useSelectTutorialDialog } from "@/contexts/SelectTutorialDialogContext";
import { useListTutorials } from "@/lib/queries";
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export const SelectTutorialDialog = () => {
  const { isOpen, closeDialog } = useSelectTutorialDialog();
  const navigate = useNavigate();
  const { data: tutorials = [], isLoading, error } = useListTutorials();

  const handleSelectTutorial = (tutorialId: string) => {
    closeDialog();
    navigate(`/tutorials/${tutorialId}`);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(d) => !d.open && closeDialog()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mt={0}>
          <Dialog.Header>
            <Dialog.Title>Select Tutorial</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {isLoading ? (
              <Box textAlign="center" py={4}>
                <Spinner size="lg" />
              </Box>
            ) : error ? (
              <Text color="red.500">
                {error instanceof Error ? error.message : String(error)}
              </Text>
            ) : tutorials.length === 0 ? (
              <Text color="gray.500">
                No tutorials available. Create one first!
              </Text>
            ) : (
              <Stack gap={2}>
                {tutorials.map((tutorial) => (
                  <Card.Root
                    key={tutorial.id}
                    cursor="pointer"
                    _hover={{ shadow: "md", bg: "gray.50", color: "black" }}
                    onClick={() => handleSelectTutorial(tutorial.id)}
                  >
                    <Card.Body py={3}>
                      <Stack
                        direction="row"
                        justify="space-between"
                        align="center"
                      >
                        <Box>
                          <Text fontWeight="semibold">{tutorial.title}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {tutorial.subject}
                          </Text>
                        </Box>
                        <Badge colorScheme="blue">{tutorial.difficulty}</Badge>
                      </Stack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </Stack>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.CloseTrigger>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
