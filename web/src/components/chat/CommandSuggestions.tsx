import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import type { Command } from "./commands";

interface CommandSuggestionsProps {
  commands: Command[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  onHoverIndex: (index: number) => void;
}

export function CommandSuggestions({
  commands,
  selectedIndex,
  onSelect,
  onHoverIndex,
}: CommandSuggestionsProps) {
  if (commands.length === 0) return null;

  return (
    <Box
      position="absolute"
      bottom="100%"
      left={0}
      mb={2}
      w="full"
      maxW="420px"
      bgColor="#1a1a1a"
      border="1px solid #333"
      borderRadius="lg"
      boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
      overflow="hidden"
      zIndex={20}
    >
      <VStack gap={0} align="stretch">
        {commands.map((cmd, i) => (
          <Flex
            key={cmd.name}
            px={4}
            py={2}
            gap={3}
            alignItems="center"
            bgColor={i === selectedIndex ? "#2a2a2a" : "transparent"}
            cursor="pointer"
            onClick={() => onSelect(cmd.name)}
            onMouseEnter={() => onHoverIndex(i)}
            _hover={{ bgColor: "#2a2a2a" }}
          >
            <Text
              as="span"
              fontFamily="mono"
              fontSize="sm"
              color="#F59E0B"
              fontWeight="semibold"
              flexShrink={0}
            >
              {cmd.name}
            </Text>
            <Text as="span" fontSize="xs" color="#999">
              {cmd.description}
            </Text>
          </Flex>
        ))}
      </VStack>
    </Box>
  );
}
