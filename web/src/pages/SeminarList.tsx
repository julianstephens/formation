import { useSeminarDialog } from "@/contexts/SeminarDialogContext";
import { useListSeminars } from "@/lib/queries";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

const SeminarList = () => {
  const navigate = useNavigate();
  const { openDialog } = useSeminarDialog();

  const { data: seminars = [], isLoading, error } = useListSeminars();

  return (
    <>
      <Box
        id="seminarList"
        maxW={{ base: "100vw", md: "4xl" }}
        w={{ md: "full" }}
        mx={{ md: "auto" }}
        pt={6}
      >
        <HStack
          id="seminarListHeader"
          mb={6}
          justify="space-between"
          align="center"
          gap={3}
        >
          <Heading size="lg" flexShrink={0}>
            My Seminars
          </Heading>
          <Button className="primary" onClick={openDialog}>
            New Seminar
          </Button>
        </HStack>

        {error && (
          <Text color="red.500" mb={4}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
        )}

        {isLoading ? (
          <HStack justify="center" mt={16}>
            <Spinner size="xl" />
          </HStack>
        ) : seminars.length === 0 ? (
          <Box textAlign="center" mt={16} color="gray.500">
            <Text>No seminars yet. Create your first one!</Text>
          </Box>
        ) : (
          <VStack w="full" gap={4}>
            {seminars.map((s) => (
              <Card.Root
                w="full"
                key={s.id}
                cursor="pointer"
                _hover={{ shadow: "md" }}
                onClick={() => navigate(`/seminars/${s.id}`)}
              >
                <Card.Body>
                  <VStack align="start" gap={2}>
                    <HStack justify="space-between" w="full">
                      <Heading size="sm" lineClamp={1}>
                        {s.title}
                      </Heading>
                      <Badge colorPalette="purple">{s.default_mode}</Badge>
                    </HStack>
                    {s.author && (
                      <Text fontSize="sm" color="gray.500">
                        {s.author}
                      </Text>
                    )}
                    <Text
                      fontSize="sm"
                      lineClamp={2}
                      color="gray.700"
                      _dark={{ color: "gray.300" }}
                    >
                      {s.thesis_current}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </Box>
    </>
  );
};

export default SeminarList;
