export function apiErrorResponse(error: unknown, message: string) {
  console.error(message, error);
  const name = error instanceof Error ? error.name : "";
  const timedOut = name === "TimeoutError" || name === "AbortError";
  return Response.json(
    { error: timedOut ? "Pieprasījums aizņēma pārāk ilgu laiku. Mēģini vēlreiz." : message },
    { status: timedOut ? 504 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
