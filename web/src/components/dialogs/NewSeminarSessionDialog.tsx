import { Button, Dialog, Field, Input, Textarea } from "@chakra-ui/react";

interface NewSeminarSessionDialogProps {
  sessionOpen: boolean;
  setSessionOpen: (open: boolean) => void;
  sectionLabelRef: React.RefObject<HTMLInputElement | null>;
  workingQuestionRef: React.RefObject<HTMLTextAreaElement | null>;
  initialClaimsRef: React.RefObject<HTMLTextAreaElement | null>;
  initialClaimsError: string;
  creating: boolean;
  handleCreateSession: () => void;
}

export const NewSeminarSessionDialog = ({
  sessionOpen,
  setSessionOpen,
  sectionLabelRef,
  workingQuestionRef,
  initialClaimsRef,
  initialClaimsError,
  creating,
  handleCreateSession,
}: NewSeminarSessionDialogProps) => {
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
          <Dialog.Body display="flex" flexDirection="column" gap={4}>
            <Field.Root required>
              <Field.Label>Assigned Section</Field.Label>
              <Input ref={sectionLabelRef} placeholder="e.g. Chapter 3, §2" />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Working question</Field.Label>
              <Textarea
                ref={workingQuestionRef}
                placeholder="What is the central question this session addresses?"
              />
            </Field.Root>
            <Field.Root invalid={!!initialClaimsError}>
              <Field.Label>
                Initial claims{" "}
                <span style={{ fontWeight: "normal", opacity: 0.6 }}>
                  (optional)
                </span>
              </Field.Label>
              <Textarea
                rows={8}
                ref={initialClaimsRef}
                placeholder="e.g. The author argues on p. 12 that…"
              />
              {initialClaimsError ? (
                <Field.ErrorText>{initialClaimsError}</Field.ErrorText>
              ) : (
                <Field.HelperText>
                  Must include a text locator (e.g. p. 12, ch. 3, §4) or be
                  marked UNANCHORED
                </Field.HelperText>
              )}
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
