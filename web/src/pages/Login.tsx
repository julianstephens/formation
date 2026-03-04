import { useAuthState } from "@/auth/useAuth";
import { Box, Button, Center, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuthState();
  const navigate = useNavigate();

  // Redirect already-authenticated visitors straight to their seminars.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/seminars", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <Center minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Box
        bg="white"
        _dark={{ bg: "gray.800" }}
        rounded="xl"
        shadow="lg"
        p={{ base: 6, md: 10 }}
        maxW="md"
        w="full"
        mx={4}
      >
        <VStack gap={6}>
          <Heading size="lg" textAlign="center">
            Welcome to Seminar
          </Heading>
          <Text
            textAlign="center"
            color="gray.600"
            _dark={{ color: "gray.400" }}
          >
            A structured reading &amp; discussion companion. Sign in to access
            your seminars and sessions.
          </Text>
          <Button
            bg="#f59e0b"
            color="black"
            _hover={{ bg: "#fbbf24" }}
            size="lg"
            w="full"
            loading={isLoading}
            onClick={() => loginWithRedirect()}
          >
            Sign in with Auth0
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
