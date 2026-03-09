import { useSelectSeminarDialog } from "@/contexts/SelectSeminarDialogContext";
import { useSelectTutorialDialog } from "@/contexts/SelectTutorialDialogContext";
import { type DashboardSession, useDashboardSessions } from "@/lib/queries";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

const statusColorMap: Record<string, string> = {
  in_progress: "yellow",
  complete: "green",
  abandoned: "gray",
};

const statusLabelMap: Record<string, string> = {
  in_progress: "In Progress",
  complete: "Complete",
  abandoned: "Abandoned",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { openDialog: openSelectSeminar } = useSelectSeminarDialog();
  const { openDialog: openSelectTutorial } = useSelectTutorialDialog();

  const { data: sessions = [], isLoading, error } = useDashboardSessions();

  const handleSessionClick = (session: DashboardSession) => {
    if (session.type === "seminar") {
      navigate(`/sessions/${session.id}`);
    } else {
      navigate(`/tutorial-sessions/${session.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Flex direction="column" w="full" h="full">
      <HStack id="dashboardHeader" justify="space-between" w="full">
        <Heading size="lg">Recent Sessions</Heading>
        <HStack>
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            onClick={openSelectTutorial}
          >
            Start Tutorial
          </Button>
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            onClick={openSelectSeminar}
          >
            Start Seminar
          </Button>
        </HStack>
      </HStack>
      <VStack id="sessions" mt="6">
        {isLoading ? (
          <Spinner size="xl" mt={8} />
        ) : error ? (
          <Text color="red.500" mt={4}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
        ) : sessions.length === 0 ? (
          <Text color="gray.500" mt={8}>
            No sessions yet. Start your first tutorial or seminar!
          </Text>
        ) : (
          sessions.map((session) => {
            const isClickable = session.status === "in_progress";
            return (
              <Card.Root
                key={session.id}
                maxW="lg"
                w="full"
                cursor={isClickable ? "pointer" : "default"}
                opacity={isClickable ? 1 : 0.6}
                _hover={isClickable ? { shadow: "md" } : {}}
                onClick={
                  isClickable ? () => handleSessionClick(session) : undefined
                }
              >
                <Card.Header
                  display="flex"
                  flexDir="row"
                  justifyContent="space-between"
                  alignItems="center"
                  w="full"
                >
                  <HStack gap={2}>
                    <Heading size="sm">{session.title}</Heading>
                    <Badge
                      textTransform="lowercase"
                      colorScheme={
                        session.type === "seminar" ? "purple" : "blue"
                      }
                    >
                      {session.type === "seminar" ? "Seminar" : "Tutorial"}
                    </Badge>
                    {session.kind && (
                      <Badge textTransform="lowercase" colorScheme="teal">
                        {session.kind}
                      </Badge>
                    )}
                  </HStack>
                  <Badge
                    colorPalette={statusColorMap[session.status] || "gray"}
                    w="fit"
                  >
                    {statusLabelMap[session.status] || session.status}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  <Text fontSize="sm" color="fg.muted">
                    Started {formatDate(session.started_at)}
                  </Text>
                </Card.Body>
              </Card.Root>
            );
          })
        )}
      </VStack>
    </Flex>
  );
};

export default Dashboard;
