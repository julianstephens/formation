import { useAuthState } from "@/auth/useAuth";
import { CreateSeminarDialog } from "@/components/dialogs/CreateSeminarDialog";
import { EditSeminarDialog } from "@/components/dialogs/EditSeminarDialog";
import { NewSeminarSessionDialog } from "@/components/dialogs/NewSeminarSessionDialog";
import { SelectSeminarDialog } from "@/components/dialogs/SelectSeminarDialog";
import { SelectTutorialDialog } from "@/components/dialogs/SelectTutorialDialog";
import { useEditSeminarDialog } from "@/contexts/EditSeminarDialogContext";
import { useNewSessionDialog } from "@/contexts/NewSessionDialogContext";
import { useSeminarDialog } from "@/contexts/SeminarDialogContext";
import {
  useCreateSeminar,
  useCreateSession,
  useUpdateSeminar,
} from "@/lib/queries";
import type {
  CreateSeminarInput,
  CreateSeminarSessionInput,
  UpdateSeminarInput,
} from "@/lib/types";
import { hasLocator, isUnanchored } from "@/lib/utils";
import {
  Box,
  Button,
  Flex,
  HStack,
  Link,
  Spacer,
  Text,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

const ROUTES = {
  seminars: "/seminars",
  tutorials: "/tutorials",
};

/**
 * Top-level layout shell: nav bar + page content area.
 * All authenticated routes render inside this layout via <Outlet />.
 */
const BaseLayout = ({ children }: React.PropsWithChildren) => {
  const { logout, user } = useAuthState();
  const navigate = useNavigate();
  const createSeminarMutation = useCreateSeminar();
  const updateSeminarMutation = useUpdateSeminar();
  const createSessionMutation = useCreateSession();

  // Create seminar dialog
  const { isOpen, closeDialog, callbackRef } = useSeminarDialog();

  // Edit seminar dialog
  const {
    isOpen: editIsOpen,
    closeDialog: closeEditDialog,
    seminar,
    titleRef,
    authorRef,
    editionNotesRef,
    callbackRef: editCallbackRef,
  } = useEditSeminarDialog();
  const [saving, setSaving] = useState(false);

  // New session dialog
  const {
    isOpen: sessionIsOpen,
    closeDialog: closeSessionDialog,
    sectionLabelRef,
    workingQuestionRef,
    initialClaimsRef,
    initialClaimsError,
    setInitialClaimsError,
    seminarIdRef,
  } = useNewSessionDialog();
  const [creatingSession, setCreatingSession] = useState(false);

  const handleCreate = async (input: CreateSeminarInput) => {
    try {
      await createSeminarMutation.mutateAsync(input);
      closeDialog();
      // Call the registered callback to refresh the seminars list
      callbackRef.current?.();
    } catch {
      // Error is handled by the dialog component
    }
  };

  const handleSave = async () => {
    if (!seminar) return;
    const input: UpdateSeminarInput = {
      title: titleRef.current?.value.trim() || undefined,
      author: authorRef.current?.value.trim() || undefined,
      edition_notes: editionNotesRef.current?.value.trim() || undefined,
    };
    setSaving(true);
    try {
      const updated = await updateSeminarMutation.mutateAsync({
        id: seminar.id,
        input,
      });
      closeEditDialog();
      // Call the registered callback to update the page
      editCallbackRef.current?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = async () => {
    const label = sectionLabelRef.current?.value.trim() ?? "";
    if (!label) return;

    const workingQuestion = workingQuestionRef.current?.value.trim() ?? "";
    if (!workingQuestion) return;

    const seminarId = seminarIdRef.current;
    if (!seminarId) return;

    const claims = initialClaimsRef.current?.value.trim() ?? "";
    if (claims !== "" && !hasLocator(claims) && !isUnanchored(claims)) {
      setInitialClaimsError(
        "Claim must include a text locator (e.g. p. 12, ch. 3, §4) or be marked UNANCHORED",
      );
      return;
    }
    setInitialClaimsError("");

    const input: CreateSeminarSessionInput = {
      section_label: label,
      working_question: workingQuestion,
    };
    setCreatingSession(true);
    try {
      const s = await createSessionMutation.mutateAsync({ seminarId, input });
      closeSessionDialog();
      navigate(`/seminar-sessions/${s.id}`, {
        state: { initialClaims: claims || null },
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin + "/login" } });
  };

  return (
    <>
      <Flex id="layout" direction="column" minH="100vh" minW="100vw">
        {/* Nav */}
        <Box
          as="nav"
          bg="#1a1a1a"
          color="white"
          borderBottom="2px solid #f59e0b"
          px={{ base: 3, md: 6 }}
          py={3}
        >
          <HStack d="flex" alignItems="center" gap={{ base: 3, md: 6 }}>
            <Link
              mr="1rem"
              fontWeight="bold"
              fontSize="lg"
              cursor="pointer"
              flexShrink={0}
              color="white"
              _hover={{ color: "#f59e0b" }}
              _focus={{ outline: "none", border: "none" }}
              _active={{ outline: "none", border: "none" }}
              transition="color 0.25s"
              href="/"
            >
              Formation
            </Link>
            {Object.entries(ROUTES).map(([k, v]) => (
              <Link
                key={k}
                href={v}
                fontSize="md"
                color="white"
                textTransform="capitalize"
                _hover={{ color: "#f59e0b" }}
                _focus={{ outline: "none", border: "none" }}
                _active={{ outline: "none", border: "none" }}
                transition="color 0.25s"
              >
                {k}
              </Link>
            ))}
            <Spacer />
            {user && (
              <HStack gap={2} flexShrink={0}>
                <Text
                  fontSize="sm"
                  opacity={0.85}
                  display={{ base: "none", sm: "block" }}
                  maxW={{ sm: "140px", md: "none" }}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {user.email ?? user.name}
                </Text>
                <Button
                  className="secondary"
                  size="sm"
                  variant="outline"
                  colorScheme="whiteAlpha"
                  flexShrink={0}
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </HStack>
            )}
          </HStack>
        </Box>

        {/* Page */}
        {children}
      </Flex>

      {/* Create Seminar Dialog */}
      <CreateSeminarDialog
        open={isOpen}
        setOpen={(open) => !open && closeDialog()}
        handleCreate={handleCreate}
      />

      {/* Edit Seminar Dialog */}
      <EditSeminarDialog
        editOpen={editIsOpen}
        setEditOpen={(open) => !open && closeEditDialog()}
        seminar={seminar}
        editTitleRef={titleRef}
        editAuthorRef={authorRef}
        editEditionNotesRef={editionNotesRef}
        saving={saving}
        handleSave={handleSave}
      />

      {/* New Session Dialog */}
      <NewSeminarSessionDialog
        sessionOpen={sessionIsOpen}
        setSessionOpen={(open) => !open && closeSessionDialog()}
        sectionLabelRef={sectionLabelRef}
        workingQuestionRef={workingQuestionRef}
        initialClaimsRef={initialClaimsRef}
        initialClaimsError={initialClaimsError}
        creating={creatingSession}
        handleCreateSession={handleCreateSession}
      />

      {/* Select Seminar Dialog */}
      <SelectSeminarDialog />

      {/* Select Tutorial Dialog */}
      <SelectTutorialDialog />
    </>
  );
};

export const Layout = () => (
  <BaseLayout>
    <Box
      maxW={{ base: "100vh", md: "4xl" }}
      w={{ md: "full" }}
      h="full"
      mx={{ md: "auto" }}
      pt="6"
      px={{ base: "6", md: "0" }}
      flex={1}
    >
      <Outlet />
    </Box>
  </BaseLayout>
);

export const RunnerLayout = () => (
  <BaseLayout>
    <Box w="full" h="full" flex={1}>
      <Outlet />
    </Box>
  </BaseLayout>
);
