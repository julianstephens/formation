import { Button, Dialog, Field, Input } from "@chakra-ui/react";

interface NewSessionDialogProps {
  sessionOpen: boolean;
  setSessionOpen: (open: boolean) => void;
  sectionLabelRef: React.RefObject<HTMLInputElement | null>;
  creating: boolean;
  handleCreateSession: () => void;
}

export const NewSessionDialog = ({
  sessionOpen,
  setSessionOpen,
  sectionLabelRef,
  creating,
  handleCreateSession,
}: NewSessionDialogProps) => {
  return (
    <Dialog.Root
      open={sessionOpen}
      onOpenChange={(d) => setSessionOpen(d.open)}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mt={0}>
          <Dialog.Header>
            <Dialog.Title>Start Session</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Root required>
              <Field.Label>Section label</Field.Label>
              <Input ref={sectionLabelRef} placeholder="e.g. Chapter 3, §2" />
            </Field.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.CloseTrigger>
            <Button
              bg="#f59e0b"
              color="black"
              _hover={{ bg: "#fbbf24" }}
              loading={creating}
              onClick={handleCreateSession}
            >
              Start
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
