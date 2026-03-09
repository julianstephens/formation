import type { SeminarSessionDetail, SeminarSessionPhase } from "@/lib/types";
import {
  Alert,
  Badge,
  Box,
  Heading,
  HStack,
  Icon,
  Progress,
  Span,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuBookOpen } from "react-icons/lu";
import { Tooltip } from "react-tooltip";
import { BackButton, ExportButton } from "../Button";

const PHASE_DETAILS: Record<
  SeminarSessionPhase,
  Record<"desc" | "order", string | number>
> = {
  reconstruction: {
    order: 1,
    desc: "Articulate the argument of the text faithfully. Provide textual grounding, key term definitions, and locator references. Do not evaluate or critique.",
  },
  opposition: {
    order: 2,
    desc: "Critique the reconstruction from the perspective of a skeptical but fair-minded reader. Identify potential gaps, weaknesses, or areas of ambiguity in the reconstruction.",
  },
  reversal: {
    order: 3,
    desc: "Defend the reconstruction against the critiques raised in the opposition phase. Address each critique with reference to the text, providing additional grounding or reasoning as needed.",
  },
  residue_required: {
    order: 4,
    desc: "Identify any remaining issues, questions, or points of contention that were not fully resolved in the previous phases. This may include ambiguities in the text, unresolved critiques, or areas where reasonable disagreement persists.",
  },
  done: {
    order: 5,
    desc: "The seminar session is complete. All phases have been completed and any remaining issues have been identified.",
  },
};

const capitalizeEachWord = (str: string) => {
  const words = str.split(" ");
  const capitalizedWords = words.map((word) => {
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word;
  });
  return capitalizedWords.join(" ");
};

export const SeminarSessionHeader = ({
  detail,
  phaseInfo,
  toBack,
  toExport,
}: {
  detail: SeminarSessionDetail;
  toBack: string;
  toExport: string;
  phaseInfo: {
    isResiduePhase: boolean;
    isDone: boolean;
    secondsRemaining: number | null;
  };
}) => {
  const totalDurationSeconds =
    (new Date(detail.phase_ends_at).getTime() -
      new Date(detail.phase_started_at).getTime()) /
    1000;

  const phaseProgress = (() => {
    // Residue and done phases have no timer — always show full.
    if (phaseInfo.isDone || phaseInfo.isResiduePhase) return 100;
    // Null means we're waiting for the first authoritative timer_tick.
    if (phaseInfo.secondsRemaining === null) return 0;
    // Guard against invalid duration (e.g. stale timestamps).
    if (totalDurationSeconds <= 0) return 0;
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          100 - (phaseInfo.secondsRemaining / totalDurationSeconds) * 100,
        ),
      ),
    );
  })();

  return (
    <>
      <HStack
        id="tutorialSessionHeader"
        mb={4}
        justify="space-between"
        align="start"
        bgColor="#1a1a1a"
        wrap="wrap"
        w="full"
        gap={2}
        borderBottom="1px #333 solid"
        pt="2"
        px="6"
        pb="2"
      >
        <VStack w="1/2" justify="center" align="center" mx="auto">
          <HStack
            id="sessionInfo"
            w="full"
            justifyContent="space-between"
            alignItems="start"
          >
            <Box>
              <Heading size="md" fontWeight="bold">
                Seminar Session
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Started {new Date(detail.started_at).toLocaleString()}
              </Text>
              {/* TODO: add seminar text and section label here */}
            </Box>
            <HStack gap={2} flexWrap={{ base: "wrap", md: "nowrap" }}>
              <Badge
                colorPalette={
                  detail.status === "complete"
                    ? "green"
                    : detail.status === "abandoned"
                      ? "gray"
                      : "yellow"
                }
              >
                {detail.status}
              </Badge>
              <ExportButton to={toExport} />
              <BackButton backPath={toBack} />
            </HStack>
          </HStack>
          <VStack
            id="sessionProgress"
            w="full"
            justifyContent="space-between"
            alignItems="center"
          >
            <HStack
              w="full"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
            >
              {Object.keys(PHASE_DETAILS)
                .filter((k) => k !== "done")
                .map((p) => (
                  <Box key={p} w="full">
                    <Progress.Root
                      data-tooltip-id={`${p}Progress`}
                      data-tooltip-content={
                        detail.phase === p
                          ? `${capitalizeEachWord(p.replaceAll("_", " "))} ends at ${new Date(detail.phase_ends_at).toLocaleTimeString()}${phaseInfo.secondsRemaining !== null ? ` (${Math.round(phaseInfo.secondsRemaining / 60)} min)` : ""}`
                          : PHASE_DETAILS[detail.phase].order >
                            PHASE_DETAILS[p as SeminarSessionPhase].order
                            ? `${capitalizeEachWord(p.replaceAll("_", " "))} Completed`
                            : `${capitalizeEachWord(p.replaceAll("_", " "))} Pending`
                      }
                      data-tooltip-place="top"
                      value={
                        detail.phase === p
                          ? phaseProgress
                          : PHASE_DETAILS[detail.phase].order >
                            PHASE_DETAILS[p as SeminarSessionPhase].order
                            ? 100
                            : 0
                      }
                      size="xs"
                      shape="full"
                      w="full"
                    >
                      <Progress.Track>
                        <Progress.Range bgColor="#f59e0b" />
                      </Progress.Track>
                    </Progress.Root>
                    <Tooltip id={`${p}Progress`} />
                  </Box>
                ))}
            </HStack>
            <Alert.Root
              as={VStack}
              alignItems="start"
              bgColor="#0a0a0a"
              border="1px rgba(245, 158, 11, 0.3) solid"
            >
              <HStack gap={2} align="center">
                <Icon as={LuBookOpen} w={5} h={5} color="#f59e0b" />
                <Alert.Title fontSize="xs" fontWeight="bold" color="white">
                  Phase {PHASE_DETAILS[detail.phase].order}:{" "}
                  <Span textTransform="capitalize">{detail.phase}</Span>
                </Alert.Title>
              </HStack>
              <Alert.Description fontSize="xs" color="#999">
                {PHASE_DETAILS[detail.phase].desc}
              </Alert.Description>
            </Alert.Root>
          </VStack>
        </VStack>
      </HStack>
    </>
  );
};
