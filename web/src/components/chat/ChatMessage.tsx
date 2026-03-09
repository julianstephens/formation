import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { LuBot, LuCircleAlert, LuInfo, LuUser } from "react-icons/lu";
import "./chat.css";

interface ChatMessageProps {
  role: "user" | "agent" | "system";
  content: string;
  timestamp?: string;
  failed?: boolean;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  failed,
}: ChatMessageProps) {
  const isUser = role === "user";

  // ── System message: centered divider banner ─────────────────────────────────
  if (role === "system") {
    return (
      <Flex align="center" gap={3} my={3} px={2}>
        <Box flex="1" h="px" bg="whiteAlpha.200" />
        <Flex
          align="center"
          gap={1.5}
          px={3}
          py={1}
          rounded="full"
          bg="whiteAlpha.100"
          color="gray.400"
          fontSize="xs"
          fontStyle="italic"
          flexShrink={0}
        >
          <Icon as={LuInfo} w={3} h={3} />
          <Text>{content}</Text>
          {timestamp && (
            <Text color="gray.600" ml={1}>
              {timestamp}
            </Text>
          )}
        </Flex>
        <Box flex="1" h="px" bg="whiteAlpha.200" />
      </Flex>
    );
  }

  return (
    <Flex gap={3} mb={4} alignItems="start">
      <Box
        flexShrink={0}
        w={8}
        h={8}
        rounded="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={isUser ? "#1e3a8a" : "#065f46"}
      >
        <Icon color="white" w={5} h={5} as={isUser ? LuUser : LuBot} />
      </Box>

      <Box flex="1" minW={0}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box as="span" color="white" fontWeight="bold" fontSize="sm">
            {isUser ? "You" : "Agent"}
          </Box>
          {timestamp && (
            <Box as="span" color="#666" fontSize="xs">
              {timestamp}
            </Box>
          )}
          {failed && (
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              color="#ef4444"
              fontSize="xs"
            >
              <Icon as={LuCircleAlert} w={3} h={3} />
              <Box as="span">Failed</Box>
            </Box>
          )}
        </Box>
        <Box
          rounded="lg"
          p={4}
          bg={isUser ? "rgba(30, 58, 138, 0.2)" : "rgba(6, 95, 70, 0.2)"}
          borderWidth={failed ? "2px" : "0"}
          borderColor={failed ? "#ef4444" : "transparent"}
          opacity={failed ? 0.8 : 1}
        >
          <Text color="white" whiteSpace="pre-wrap" lineHeight="relaxed">
            {content}
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}
