// locatorPattern mirrors the regex in internal/referee/referee.go.
const locatorPattern =
  /(?:pp?\.|pg\.)[ \t]*\d+|ch(?:ap?)?\.?[ \t]*\d+|§[ \t]*\d+|scene[ \t]+\d+|para?s?\.?[ \t]*\d+|¶[ \t]*\d+|\bl\.[ \t]*\d+/i;

export const hasLocator = (text: string): boolean => locatorPattern.test(text);

export const isUnanchored = (text: string): boolean =>
  text.toUpperCase().includes("UNANCHORED");

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
