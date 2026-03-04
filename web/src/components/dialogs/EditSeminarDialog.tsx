import type { Seminar } from "@/lib/types";
import { Button, Dialog, Field, Input, VStack } from "@chakra-ui/react";

interface EditSeminarDialogProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  seminar: Seminar | null;
  editTitleRef: React.RefObject<HTMLInputElement | null>;
  editAuthorRef: React.RefObject<HTMLInputElement | null>;
  editEditionNotesRef: React.RefObject<HTMLInputElement | null>;
  saving: boolean;
  handleSave: () => void;
}

export const EditSeminarDialog = ({
  editOpen,
  setEditOpen,
  seminar,
  editTitleRef,
  editAuthorRef,
  editEditionNotesRef,
  saving,
  handleSave,
}: EditSeminarDialogProps) => {
  return (
    <Dialog.Root open={editOpen} onOpenChange={(d) => setEditOpen(d.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Edit Seminar</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root>
                <Field.Label>Title</Field.Label>
                <Input ref={editTitleRef} defaultValue={seminar?.title} />
              </Field.Root>
              <Field.Root>
                <Field.Label>Author</Field.Label>
                <Input
                  ref={editAuthorRef}
                  defaultValue={seminar?.author ?? ""}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Edition notes</Field.Label>
                <Input
                  ref={editEditionNotesRef}
                  placeholder="e.g. Penguin Classics 2006 translation"
                  defaultValue={seminar?.edition_notes ?? ""}
                />
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.CloseTrigger>
            <Button
              bg="#f59e0b"
              color="black"
              _hover={{ bg: "#fbbf24" }}
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
