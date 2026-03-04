import { useAuthState } from "@/auth/useAuth";
import { Center, Spinner } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

/**
 * Wraps a route tree and redirects unauthenticated visitors to /login.
 * Shows a loading spinner while Auth0 initialises.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthState();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
