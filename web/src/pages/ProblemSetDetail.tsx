import { ExportButton } from "@/components/Button";
import { useTutorialProblemSets } from "@/lib/queries";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Span,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuPencilLine,
} from "react-icons/lu";
import { useParams } from "react-router-dom";

const statusColor: Record<string, string> = {
  reviewed: "green",
  assigned: "yellow",
  submitted: "blue",
  deleted: "red",
};

const statusIcon: Record<string, IconType> = {
  reviewed: LuCircleCheck,
  assigned: LuPencilLine,
  submitted: LuClock,
  deleted: LuCircleAlert,
};

const ProblemSetDetail = () => {
  const params = useParams();
  const {
    data: problemSets = [],
    isLoading,
    error,
  } = useTutorialProblemSets(params.id);
  const problemSet = problemSets.find((p) => p.id === params.problemSetId);

  if (isLoading) {
    return (
      <VStack w="full" h="full" align="center" justify="center">
        <Spinner size="xl" />
      </VStack>
    );
  }

  if (!problemSet) {
    return (
      <Text color="red.500">
        {error instanceof Error ? error.message : "Problem set not found"}
      </Text>
    );
  }

  return (
    <VStack w="full" h="full" align="start" p={6} gap={6}>
      {/* Back Button */}
      <Button
        display="flex"
        justifyContent="flex-start"
        alignItems="center"
        ps={2}
        variant="ghost"
        onClick={() => window.history.back()}
      >
        <Icon w={4} h={4} as={LuArrowLeft} />
        Back to problem sets
      </Button>

      {/* Header */}
      <VStack w="full" align="start" gap={2}>
        <HStack justify="space-between" w="full">
          <Heading size="lg">
            Problem Set for {new Date(problemSet.week_of).toLocaleDateString()}
          </Heading>
          <HStack>
            <Badge colorPalette={statusColor[problemSet.status] ?? ""}>
              <Icon
                w={4}
                h={4}
                as={statusIcon[problemSet.status] ?? LuCircleAlert}
              />
              {problemSet.status}
            </Badge>
            <ExportButton to={`/problem-sets/${problemSet.id}/export`} />
          </HStack>
        </HStack>
        <HStack color="fg.muted" fontSize="sm">
          <Text>
            Assigned {new Date(problemSet.created_at).toLocaleDateString()}
          </Text>
          <Span>•</Span>
          <Text>
            Updated {new Date(problemSet.updated_at).toLocaleDateString()}
          </Text>
        </HStack>
        <Text color="fg.muted" fontSize="sm">
          Assigned from session: {problemSet.assigned_from_session_id}
        </Text>
      </VStack>

      {/* Review Notes */}
      {problemSet.review_notes && (
        <Box
          w="full"
          p={4}
          bgColor="#1a1a1a"
          border="1px solid #333"
          rounded="md"
        >
          <Heading size="sm" mb={2}>
            Review Notes
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {problemSet.review_notes}
          </Text>
        </Box>
      )}

      {/* Tasks */}
      <VStack w="full" align="start" gap={4}>
        <Heading size="md">Tasks</Heading>
        {problemSet.tasks.map((task, index) => (
          <Box
            key={index}
            w="full"
            p={4}
            bgColor="#1a1a1a"
            border="1px solid #333"
            rounded="md"
          >
            <VStack align="start" gap={3}>
              <HStack justify="space-between" w="full">
                <Heading size="sm">{task.title}</Heading>
                <Badge
                  size="sm"
                  bgColor="#2a2a2a"
                  color="#f59e0b"
                  px={2}
                  py={1}
                >
                  {task.pattern_code.replace("_", " ").toLowerCase()}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {task.description}
              </Text>
              <Box w="full" mt={2}>
                <Text fontWeight="semibold" fontSize="sm" mb={1}>
                  Prompt:
                </Text>
                <Text
                  fontSize="sm"
                  color="fg.muted"
                  whiteSpace="pre-wrap"
                  fontFamily="mono"
                  bgColor="#0a0a0a"
                  p={3}
                  rounded="sm"
                >
                  {task.prompt}
                </Text>
              </Box>
            </VStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
};

export default ProblemSetDetail;
