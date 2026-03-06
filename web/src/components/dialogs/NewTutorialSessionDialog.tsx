import type { TutorialSessionKind } from "@/lib/types";
import {
  Button,
  Dialog,
  Field,
  NativeSelectField,
  NativeSelectRoot,
} from "@chakra-ui/react";

interface NewTutorialSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKind: TutorialSessionKind | null;
  onKindChange: (kind: TutorialSessionKind | null) => void;
  starting: boolean;
  onStart: () => void;
}

export const NewTutorialSessionDialog = ({
  open,
  onOpenChange,
  selectedKind,
  onKindChange,
  starting,
  onStart,
}: NewTutorialSessionDialogProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={(d) => onOpenChange(d.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mt={0}>
          <Dialog.Header>
            <Dialog.Title>Start Tutorial Session</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Root>
              <Field.Label>Session Type</Field.Label>
              <NativeSelectRoot>
                <NativeSelectField
                  value={selectedKind ?? ""}
                  onChange={(e) =>
                    onKindChange(
                      e.target.value === ""
                        ? null
                        : (e.target.value as TutorialSessionKind),
                    )
                  }
                >
                  <option value="">Select session type (optional)</option>
                  <option value="diagnostic">
                    Diagnostic - Short review of submitted work
                  </option>
                  <option value="extended">
                    Extended - Weekly structural tutorial
                  </option>
                </NativeSelectField>
              </NativeSelectRoot>
              <Field.HelperText>
                Optional: Choose a session type to customize the tutorial
                experience
              </Field.HelperText>
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
              loading={starting}
              onClick={onStart}
            >
              Start Session
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
