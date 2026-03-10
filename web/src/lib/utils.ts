// locatorPattern mirrors the regex in internal/referee/referee.go.
const locatorPattern =
  /(?:pp?\.|pg\.)[ \t]*\d+|ch(?:ap?)?\.?[ \t]*\d+|§[ \t]*\d+|scene[ \t]+\d+|para?s?\.?[ \t]*\d+|¶[ \t]*\d+|\bl\.[ \t]*\d+/i;

export const hasLocator = (text: string): boolean => locatorPattern.test(text);

export const isUnanchored = (text: string): boolean =>
  text.toUpperCase().includes("UNANCHORED");
// claimPattern mirrors the regex in internal/referee/referee.go.
const claimPattern =
  /(?:the\s+(?:author|text|book|chapter|passage))\s+(?:argues|states|claims|asserts|contends|suggests|writes|notes)|\bI\s+(?:claim|argue|contend|assert)\b|\bmy\s+(?:claim|position|argument)\b|\baccording\s+to\b/i;

export const hasClaim = (text: string): boolean => claimPattern.test(text);
export const prepareText = (text: string) => {
  // Convert literal \n to actual newlines, then clean up excessive whitespace
  return text
    .replace(/\\n/g, "\n") // Convert literal \n to actual newlines
    .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines to max 2
    .replace(/[ \t]+/g, " ") // Collapse multiple spaces/tabs to single space
    .split("\n") // Split into lines
    .map((line) => line.trim()) // Trim each line
    .join("\n") // Rejoin with newlines
    .trim(); // Trim start and end
};
