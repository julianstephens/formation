import type { ArtifactKind } from "@/lib/types";
import {
    Button,
    Checkbox,
    Dialog,
    Field,
    Input,
    NativeSelect,
    Textarea
} from "@chakra-ui/react";

interface CreateArtifactDialogProps {
    isOpen: boolean;
    onClose: () => void;
    titleRef: React.RefObject<HTMLInputElement | null>;
    contentRef: React.RefObject<HTMLTextAreaElement | null>;
    kind: ArtifactKind;
    setKind: (kind: ArtifactKind) => void;
    creating: boolean;
    handleCreate: () => void;
    createAnother: boolean;
    setCreateAnother: (value: boolean) => void;
}

export const CreateArtifactDialog = ({
    isOpen,
    onClose,
    titleRef,
    contentRef,
    kind,
    setKind,
    creating,
    handleCreate,
    createAnother,
    setCreateAnother,
}: CreateArtifactDialogProps) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={(d) => !d.open && onClose()}>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content mt={0}>
                    <Dialog.Header>
                        <Dialog.Title>Create Artifact</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Field.Root required mb={3}>
                            <Field.Label>Kind</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={kind}
                                    onChange={(e) => setKind(e.target.value as ArtifactKind)}
                                >
                                    <option value="notes">Notes</option>
                                    <option value="summary">Summary</option>
                                    <option value="problem_set">Problem Set</option>
                                    <option value="diagnostic">Diagnostic</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                        <Field.Root required mb={3}>
                            <Field.Label>Title</Field.Label>
                            <Input ref={titleRef} placeholder="Artifact title" />
                        </Field.Root>
                        <Field.Root required mb={3}>
                            <Field.Label>Content</Field.Label>
                            <Textarea
                                ref={contentRef}
                                placeholder="Artifact content"
                                rows={8}
                            />
                        </Field.Root>
                        <Field.Root>
                            <Checkbox.Root
                                checked={createAnother}
                                onCheckedChange={(details) => setCreateAnother(!!details.checked)}
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control>
                                    <Checkbox.Indicator />
                                </Checkbox.Control>
                                <Checkbox.Label>
                                    Create another
                                </Checkbox.Label>
                            </Checkbox.Root>
                        </Field.Root>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <Button variant="ghost">Cancel</Button>
                        </Dialog.CloseTrigger>
                        <Button
                            className="primary"
                            loading={creating}
                            onClick={handleCreate}
                        >
                            Create
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
