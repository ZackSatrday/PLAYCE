/**
 * Validates the body of `POST /api/courses/import` without a schema library.
 * Returns the trimmed playlist URL/ID, or null when the body is not an object
 * with a non-empty string `urlOrId`.
 */
export function parseImportUrlOrId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const value = (body as { urlOrId?: unknown }).urlOrId;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
