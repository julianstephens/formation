import type { CreateSeminarInput } from "@/lib/types";
import {
  Button,
  Dialog,
  Field,
  Input,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useRef, useState } from "react";

interface CreateSeminarDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  handleCreate: (input: CreateSeminarInput) => Promise<void>;
}

export const CreateSeminarDialog = ({
  open,
  setOpen,
  handleCreate,
}: CreateSeminarDialogProps) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  const editionNotesRef = useRef<HTMLInputElement>(null);
  const thesisRef = useRef<HTMLTextAreaElement>(null);
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    const title = titleRef.current?.value.trim() ?? "";
    const author = authorRef.current?.value.trim() ?? "";
    const editionNotes = editionNotesRef.current?.value.trim() ?? "";
    const thesisCurrent = thesisRef.current?.value.trim() ?? "";

    if (!title || !thesisCurrent) return;

    try {
      setCreating(true);
      await handleCreate({
        title,
        author: author || undefined,
        edition_notes: editionNotes || undefined,
        thesis_current: thesisCurrent,
      });
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(d) => setOpen(d.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create Seminar</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>Title</Field.Label>
                <Input ref={titleRef} placeholder="Book title…" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Author</Field.Label>
                <Input ref={authorRef} placeholder="Author name…" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Edition notes</Field.Label>
                <Input
                  ref={editionNotesRef}
                  placeholder="e.g. Penguin Classics 2006 translation"
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Thesis</Field.Label>
                <Textarea
                  ref={thesisRef}
                  rows={4}
                  placeholder="Your current working thesis…"
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
              loading={creating}
              onClick={onCreate}
            >
              Create
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
