import type { Artifact, TutorialSessionKind } from "@/lib/types";
import { hasClaim, hasLocator, isUnanchored } from "@/lib/utils";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  Span,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { type KeyboardEvent, useMemo, useState } from "react";
import { LuSend } from "react-icons/lu";
import { COMMANDS } from "./commands";
import { CommandSuggestions } from "./CommandSuggestions";
import { DiagnoseCommandBuilder } from "./DiagnoseCommandBuilder";
import { ProblemSetCommandBuilder } from "./ProblemSetCommandBuilder";
import { ReviewProblemSetCommandBuilder } from "./ReviewProblemSetCommandBuilder";

interface ChatInputProps {
  onSend: (message: string, hasClaims?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  sessionKind?: TutorialSessionKind;
  artifacts?: Artifact[];
  showClaimsToggle?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Your message...",
  initialValue,
  sessionKind,
  artifacts,
  showClaimsToggle,
}: ChatInputProps) {
  const [message, setMessage] = useState(initialValue ?? "");
  const [showCommandBuilder, setShowCommandBuilder] = useState(false);
  const [showReviewCommandBuilder, setShowReviewCommandBuilder] =
    useState(false);
  const [showDiagnoseCommandBuilder, setShowDiagnoseCommandBuilder] =
    useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [hasClaims, setHasClaims] = useState(false);

  // Visible slash-command suggestions: active while the user is typing the
  // command name (starts with "/" and no space yet) and the builder isn't open.
  const filteredCommands = useMemo(() => {
    if (
      showCommandBuilder ||
      showReviewCommandBuilder ||
      showDiagnoseCommandBuilder ||
      !message.startsWith("/") ||
      message.includes(" ")
    )
      return [];
    const query = message.toLowerCase();
    return COMMANDS.filter((cmd) => {
      if (cmd.tutorialOnly && sessionKind === undefined) return false;
      if (cmd.sessionKind && cmd.sessionKind !== sessionKind) return false;
      return cmd.name.startsWith(query);
    });
  }, [
    message,
    showCommandBuilder,
    showReviewCommandBuilder,
    showDiagnoseCommandBuilder,
    sessionKind,
  ]);

  const showSuggestions = filteredCommands.length > 0;

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim(), hasClaims || undefined);
      setMessage("");
      setHasClaims(false);
      setShowCommandBuilder(false);
      setShowReviewCommandBuilder(false);
      setShowDiagnoseCommandBuilder(false);
      setSelectedCommandIndex(0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex((i) =>
          Math.min(i + 1, filteredCommands.length - 1),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedCommandIndex];
        if (selected) applySuggestion(selected.name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMessage("");
        return;
      }
    }

    // Close command builder on Escape
    if (
      e.key === "Escape" &&
      (showCommandBuilder ||
        showReviewCommandBuilder ||
        showDiagnoseCommandBuilder)
    ) {
      e.preventDefault();
      setShowCommandBuilder(false);
      setShowReviewCommandBuilder(false);
      setShowDiagnoseCommandBuilder(false);
      return;
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyCommandBuilderLogic = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (
      sessionKind === "extended" &&
      (trimmed === "/problem-set" || trimmed.startsWith("/problem-set "))
    ) {
      setShowCommandBuilder(true);
      setShowReviewCommandBuilder(false);
      setShowDiagnoseCommandBuilder(false);
    } else if (
      sessionKind === "extended" &&
      (trimmed === "/review-problem-set" ||
        trimmed.startsWith("/review-problem-set "))
    ) {
      setShowReviewCommandBuilder(true);
      setShowCommandBuilder(false);
      setShowDiagnoseCommandBuilder(false);
    } else if (trimmed === "/diagnose" || trimmed.startsWith("/diagnose ")) {
      setShowDiagnoseCommandBuilder(true);
      setShowCommandBuilder(false);
      setShowReviewCommandBuilder(false);
    } else {
      setShowCommandBuilder(false);
      setShowReviewCommandBuilder(false);
      setShowDiagnoseCommandBuilder(false);
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setSelectedCommandIndex(0);
    applyCommandBuilderLogic(value);
  };

  /** Called when the user picks a suggestion via Tab/Enter/click. */
  const applySuggestion = (commandName: string) => {
    setMessage(commandName);
    setSelectedCommandIndex(0);
    applyCommandBuilderLogic(commandName);
  };

  const handleCommandSelect = (command: string) => {
    setMessage(command);
    setShowCommandBuilder(false);
    setShowReviewCommandBuilder(false);
    setShowDiagnoseCommandBuilder(false);
  };

  const handleCommandCancel = () => {
    setShowCommandBuilder(false);
    setShowReviewCommandBuilder(false);
    setShowDiagnoseCommandBuilder(false);
  };

  // Soft claim hint: shown when showClaimsToggle is on, message has claim
  // language, but no locator and not marked UNANCHORED (advisory only).
  const showClaimHint =
    showClaimsToggle === true &&
    message.trim().length > 0 &&
    hasClaim(message) &&
    !hasLocator(message) &&
    !isUnanchored(message);

  return (
    <Box
      id="chatInputContainer"
      w="full"
      borderY="1px solid #333"
      bgColor="transparent"
      p={4}
    >
      <Box id="chatInputInner" maxW="4xl" mx="auto" position="relative">
        {showCommandBuilder && (
          <ProblemSetCommandBuilder
            onSelect={handleCommandSelect}
            onCancel={handleCommandCancel}
          />
        )}
        {showReviewCommandBuilder && (
          <ReviewProblemSetCommandBuilder
            onSelect={handleCommandSelect}
            onCancel={handleCommandCancel}
          />
        )}
        {showDiagnoseCommandBuilder && (
          <DiagnoseCommandBuilder
            artifacts={artifacts ?? []}
            onSelect={handleCommandSelect}
            onCancel={handleCommandCancel}
          />
        )}
        {showSuggestions && (
          <CommandSuggestions
            commands={filteredCommands}
            selectedIndex={selectedCommandIndex}
            onSelect={applySuggestion}
            onHoverIndex={setSelectedCommandIndex}
          />
        )}
        <Textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          w="full"
          bgColor="#1a1a1a"
          border="none"
          color="white"
          rounded="lg"
          pr={24}
          resize="none"
          _focus={{ outline: "none", ring: "2px", ringColor: "#F59E0B" }}
          minH="80px"
          maxH="200px"
          _placeholder={{ color: "#666" }}
          rows={10}
        />
        {showClaimsToggle && (
          <Flex mt={2} mb={1} alignItems="center" gap={3} flexWrap="wrap">
            <Checkbox.Root
              checked={hasClaims}
              onCheckedChange={(e) => setHasClaims(!!e.checked)}
              size="sm"
              colorPalette="yellow"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Span color="#aaa" fontSize="xs">
                  Contains claims
                </Span>
              </Checkbox.Label>
            </Checkbox.Root>
            {showClaimHint && (
              <Text color="orange.400" fontSize="xs">
                Claim detected — add a locator or mark UNANCHORED.
              </Text>
            )}
          </Flex>
        )}
        <Flex
          position="absolute"
          bottom={10}
          right={4}
          alignItems="center"
          gap={3}
        >
          <Span color="#666" fontSize="xs">
            {showSuggestions
              ? "Tab to complete · ↑↓ to navigate · Esc to dismiss"
              : "⌘/Ctrl + Enter to submit"}
          </Span>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            bgColor="#F59E0B"
            color="black"
            px={5}
            py={2}
            rounded="md"
            fontWeight="bold"
            transition="background-color 0.2s"
            display="flex"
            alignItems="center"
            gap={2}
            _hover={{ bgColor: "#D97706" }}
            _disabled={{ bgColor: "#666", cursor: "not-allowed" }}
          >
            <Icon w={4} h={4}>
              <LuSend />
            </Icon>
            Send
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
