import { useSelectSeminarDialog } from "@/contexts/SelectSeminarDialogContext";
import { useListSeminars } from "@/lib/queries";
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

export const SelectSeminarDialog = () => {
  const { isOpen, closeDialog } = useSelectSeminarDialog();
  const navigate = useNavigate();
  const { data: seminars = [], isLoading, error } = useListSeminars();

  const handleSelectSeminar = (seminarId: string) => {
    closeDialog();
    navigate(`/seminars/${seminarId}`);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(d) => !d.open && closeDialog()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mt={0}>
          <Dialog.Header>
            <Dialog.Title>Select Seminar</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {isLoading ? (
              <Box textAlign="center" py={4}>
                <Spinner size="lg" />
              </Box>
            ) : error ? (
              <Text color="red.500">{error instanceof Error ? error.message : String(error)}</Text>
            ) : seminars.length === 0 ? (
              <Text color="gray.500">
                No seminars available. Create one first!
              </Text>
            ) : (
              <Stack gap={2}>
                {seminars.map((seminar) => (
                  <Card.Root
                    key={seminar.id}
                    cursor="pointer"
                    _hover={{ shadow: "md", bg: "gray.50", color: "black" }}
                    onClick={() => handleSelectSeminar(seminar.id)}
                  >
                    <Card.Body py={3}>
                      <Stack
                        direction="row"
                        justify="space-between"
                        align="center"
                      >
                        <Box>
                          <Text fontWeight="semibold">{seminar.title}</Text>
                          {seminar.author && (
                            <Text fontSize="sm" color="gray.600">
                              {seminar.author}
                            </Text>
                          )}
                        </Box>
                        <Badge colorScheme="purple">
                          {seminar.default_mode}
                        </Badge>
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
