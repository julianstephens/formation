import { useSeminarDialog } from "@/contexts/SeminarDialogContext";
import { useApi } from "@/lib/ApiContext";
import type { Seminar } from "@/lib/types";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SeminarList() {
  const api = useApi();
  const navigate = useNavigate();
  const { openDialog, registerOnCreateCallback } = useSeminarDialog();

  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSeminars(await api.listSeminars());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  // Register callback for when a seminar is created
  useEffect(() => {
    registerOnCreateCallback(load);
    return () => {
      registerOnCreateCallback(null);
    };
  }, [load, registerOnCreateCallback]);

  return (
    <>
      <Box>
        <HStack mb={6} justify="space-between" align="center" gap={3}>
          <Heading size="lg" flexShrink={0}>
            My Seminars
          </Heading>
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            onClick={openDialog}
          >
            New Seminar
          </Button>
        </HStack>

        {error && (
          <Text color="red.500" mb={4}>
            {error}
          </Text>
        )}

        {loading ? (
          <HStack justify="center" mt={16}>
            <Spinner size="xl" />
          </HStack>
        ) : seminars.length === 0 ? (
          <Box textAlign="center" mt={16} color="gray.500">
            <Text>No seminars yet. Create your first one!</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {seminars.map((s) => (
              <Card.Root
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
                      <Badge colorScheme="purple">{s.default_mode}</Badge>
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
          </SimpleGrid>
        )}
      </Box>
    </>
  );
}
