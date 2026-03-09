import {
  Box,
  Button,
  Flex,
  Heading,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";

interface ReviewProblemSetCommandBuilderProps {
  onSelect: (command: string) => void;
  onCancel: () => void;
}

export function ReviewProblemSetCommandBuilder({
  onSelect,
  onCancel,
}: ReviewProblemSetCommandBuilderProps) {
  const [strictness, setStrictness] = useState("standard");
  const [mode, setMode] = useState("commit");

  const handleBuild = () => {
    let command = "/review-problem-set";

    // Only add options if they differ from defaults
    if (strictness !== "standard") {
      command += ` /strictness ${strictness}`;
    }
    if (mode !== "commit") {
      command += ` /mode ${mode}`;
    }

    onSelect(command);
  };

  return (
    <Box
      position="absolute"
      bottom="100%"
      left={0}
      mb={2}
      w="full"
      maxW="600px"
      bgColor="#1a1a1a"
      border="1px solid #333"
      borderRadius="lg"
      boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
      p={4}
      zIndex={10}
    >
      <VStack align="stretch" gap={4}>
        <Heading size="sm" color="white">
          Build /review-problem-set command
        </Heading>

        {/* Strictness Section */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
            Strictness
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={strictness}
              onChange={(e) => setStrictness(e.target.value)}
              bgColor="#0a0a0a"
              color="white"
              border="1px solid #333"
              _hover={{ borderColor: "#555" }}
              _focus={{ borderColor: "#F59E0B", outline: "none" }}
            >
              <option value="lenient">Lenient</option>
              <option value="standard">Standard</option>
              <option value="rigorous">Rigorous</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
          <Text fontSize="xs" color="#999" mt={1}>
            {strictness === "lenient" && "Focuses on major issues only"}
            {strictness === "standard" && "Balanced evaluation of all tasks"}
            {strictness === "rigorous" &&
              "Thorough critique with high expectations"}
          </Text>
        </Box>

        {/* Mode Section */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
            Mode
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              bgColor="#0a0a0a"
              color="white"
              border="1px solid #333"
              _hover={{ borderColor: "#555" }}
              _focus={{ borderColor: "#F59E0B", outline: "none" }}
            >
              <option value="commit">Commit (save review to database)</option>
              <option value="preview">Preview (generate only)</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Box>

        {/* Action Buttons */}
        <Flex gap={2} justify="flex-end">
          <Button variant="ghost" size="sm" onClick={onCancel} color="white">
            Cancel
          </Button>
          <Button
            bgColor="#F59E0B"
            color="black"
            size="sm"
            onClick={handleBuild}
            _hover={{ bgColor: "#D97706" }}
          >
            Insert Command
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}
