/**
 * Core SSE (Server-Sent Events) stream utilities.
 *
 * Uses fetch() + ReadableStream so an Authorization header can be injected;
 * the browser's native EventSource does not support custom headers.
 */

// ── Error type ────────────────────────────────────────────────────────────────

/**
 * Thrown by readSseStream when the server responds with a non-2xx status.
 * The caller can inspect `status` to decide whether to retry.
 */
export class SseConnectError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(`SSE connect failed: ${status} ${statusText}`);
    this.name = "SseConnectError";
    this.status = status;
  }
}

// ── Core reader ───────────────────────────────────────────────────────────────

/**
 * Opens an SSE stream at `url` with an Authorization bearer token.
 * Calls `onEvent` for each fully-parsed SSE message.
 * Resolves when the stream closes naturally (server-side `done`).
 * Rejects with {@link SseConnectError} on non-2xx responses.
 * Rejects with `DOMException("AbortError")` when `signal` fires.
 *
 * The caller is responsible for reconnection / abort handling.
 */
export async function readSseStream(
  url: string,
  getToken: () => Promise<string>,
  onEvent: (type: string, payload: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new SseConnectError(res.status, res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch (e) {
        // When the AbortSignal fires after the response is open,
        // reader.read() throws a TypeError ("Error in input stream") in
        // Firefox/Safari rather than DOMException(AbortError). Normalise it
        // so callers only need to handle one abort shape.
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        throw e;
      }
      const { done, value } = result;
      if (done) break;

      buf += decoder.decode(value, { stream: true });

      // SSE messages are delimited by blank lines ("event: …\ndata: …\n\n").
      // Split on double-newline; retain the trailing incomplete chunk.
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";

      for (const part of parts) {
        const parsed = parseSsePart(part);
        if (parsed) onEvent(parsed.type, parsed.payload);
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Ignore errors when cancelling the reader (e.g. already closed).
    }
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function parseSsePart(part: string): { type: string; payload: unknown } | null {
  // Skip comment-only parts (heartbeats: ": heartbeat\n\n").
  if (part.trim().startsWith(":")) return null;

  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of part.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
    // Ignore "id:" and "retry:" fields as they are not used here.
  }

  if (dataLines.length === 0) return null;

  try {
    return {
      type: eventType,
      payload: JSON.parse(dataLines.join("\n")) as unknown,
    };
  } catch {
    // Malformed JSON – skip this message.
    return null;
  }
}
