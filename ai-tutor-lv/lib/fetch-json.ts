export class RequestError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "network" | "session" | "server" | "aborted" | "limit",
    readonly limit?: number
  ) {
    super(message);
    this.name = "RequestError";
  }
}

const MESSAGES = {
  timeout: "Atbilde aizņem pārāk ilgu laiku. Mēģini vēlreiz.",
  network: "Nav savienojuma ar serveri. Pārbaudi internetu un mēģini vēlreiz.",
  session: "Sesija ir beigusies. Pieslēdzies vēlreiz.",
  server: "Servera kļūda. Mēģini vēlreiz pēc brīža.",
} as const;

export function isAbort(error: unknown) {
  return error instanceof RequestError && error.kind === "aborted";
}

export function isLimitReached(error: unknown): error is RequestError {
  return error instanceof RequestError && error.kind === "limit";
}

export function toRequestError(error: unknown, signal?: AbortSignal): RequestError {
  if (error instanceof RequestError) return error;
  const reason = signal?.reason as { name?: string } | undefined;
  if (reason?.name === "TimeoutError") return new RequestError(MESSAGES.timeout, "timeout");
  if (error instanceof DOMException && error.name === "AbortError") return new RequestError("", "aborted");
  if (error instanceof DOMException && error.name === "TimeoutError") return new RequestError(MESSAGES.timeout, "timeout");
  if (error instanceof TypeError) return new RequestError(MESSAGES.network, "network");
  return new RequestError(error instanceof Error ? error.message : MESSAGES.server, "server");
}

// Fetch cannot tell a redirect to /login from a real response, so detect it here.
export function assertSession(response: Response) {
  if (response.redirected && new URL(response.url).pathname.startsWith("/login")) {
    throw new RequestError(MESSAGES.session, "session");
  }
}

export async function readErrorDetails(response: Response): Promise<{ message: string; code?: string; limit?: number }> {
  const text = await response.text().catch(() => "");
  try {
    const data = JSON.parse(text) as { error?: string; code?: string; limit?: number };
    if (data.error) return { message: data.error, code: data.code, limit: data.limit };
  } catch {
    // Not JSON.
  }
  return { message: response.status === 401 ? MESSAGES.session : MESSAGES.server };
}

export async function readErrorMessage(response: Response) {
  return (await readErrorDetails(response)).message;
}

export function withTimeout(timeoutMs: number, external?: AbortSignal) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([timeout, external]) : timeout;
}

export async function fetchJson<T>(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 30_000, signal: external, ...rest } = init;
  const signal = withTimeout(timeoutMs, external ?? undefined);
  try {
    const response = await fetch(input, { ...rest, signal });
    assertSession(response);
    if (!response.ok) throw new RequestError(await readErrorMessage(response), "server");
    return (await response.json()) as T;
  } catch (error) {
    throw toRequestError(error, signal);
  }
}
